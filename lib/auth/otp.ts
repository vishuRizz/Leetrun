import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend } from "@/lib/email/resend";
import { OtpType } from "@prisma/client";

// Helper to generate a secure random 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function initiateSignup(email: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();

  // 1. Create user in Supabase as unconfirmed (email_confirm: false)
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: false,
  });

  if (error) {
    // If user already exists, check if they are verified
    if (error.message.includes("already registered") || error.status === 422) {
      // Find the user to check if they are unconfirmed
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData?.users?.find((u) => u.email === trimmedEmail);
      
      if (existingUser && existingUser.email_confirmed_at) {
        throw new Error("This email is already registered and confirmed. Please log in.");
      }
      
      // If unconfirmed, we will recreate/update them, or just generate a new OTP for their ID
      if (existingUser) {
        // We will generate the OTP for the existing unconfirmed user's ID
        return await sendAndSaveOtp(trimmedEmail, existingUser.id, OtpType.SIGNUP);
      }
    }
    throw new Error(error.message || "Failed to initiate registration.");
  }

  if (!data.user) {
    throw new Error("Failed to create auth profile.");
  }

  // 2. Generate and email OTP
  return await sendAndSaveOtp(trimmedEmail, data.user.id, OtpType.SIGNUP);
}

export async function verifySignupOtp(email: string, otp: string) {
  const trimmedEmail = email.trim().toLowerCase();

  const record = await db.otpVerification.findUnique({
    where: { email: trimmedEmail },
  });

  if (!record || record.otp !== otp || record.type !== OtpType.SIGNUP) {
    throw new Error("Invalid verification code.");
  }

  if (new Date() > record.expiresAt) {
    await db.otpVerification.delete({ where: { email: trimmedEmail } }).catch(() => {});
    throw new Error("Verification code has expired.");
  }

  const userId = record.tokenHash; // We stored user.id in tokenHash field during signup
  if (!userId) {
    throw new Error("Verification profile mismatch.");
  }

  // 1. Confirm user's email in Supabase
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    throw new Error(error.message || "Failed to confirm email verification.");
  }

  // 2. Provision user in Prisma DB
  let prismaUser = await db.user.findUnique({
    where: { id: userId },
  });

  if (!prismaUser) {
    prismaUser = await db.user.create({
      data: {
        id: userId,
        email: trimmedEmail,
        level: "BEGINNER",
        onboardingDone: false,
        preferences: {
          create: {
            preferredDifficulty: "EASY",
            dailyQuestionTarget: 2,
            mentorName: "Buddy",
          },
        },
        stats: {
          create: {
            totalSolved: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
          },
        },
      },
    });
  }

  // 3. Remove OTP record
  await db.otpVerification.delete({
    where: { email: trimmedEmail },
  }).catch(() => {});

  return { success: true };
}

export async function initiatePasswordReset(email: string) {
  const trimmedEmail = email.trim().toLowerCase();

  // Find user by email to verify they exist
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = listData?.users?.find((u) => u.email === trimmedEmail);

  if (!existingUser) {
    throw new Error("No account found with this email address.");
  }

  return await sendAndSaveOtp(trimmedEmail, existingUser.id, OtpType.PASSWORD_RESET);
}

export async function completePasswordReset(email: string, otp: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();

  const record = await db.otpVerification.findUnique({
    where: { email: trimmedEmail },
  });

  if (!record || record.otp !== otp || record.type !== OtpType.PASSWORD_RESET) {
    throw new Error("Invalid verification code.");
  }

  if (new Date() > record.expiresAt) {
    await db.otpVerification.delete({ where: { email: trimmedEmail } }).catch(() => {});
    throw new Error("Verification code has expired.");
  }

  const userId = record.tokenHash;
  if (!userId) {
    throw new Error("Verification profile mismatch.");
  }

  // Update password in Supabase via Admin API
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true, // Mark confirmed just in case
  });

  if (error) {
    throw new Error(error.message || "Failed to update password.");
  }

  // Remove verification record
  await db.otpVerification.delete({
    where: { email: trimmedEmail },
  }).catch(() => {});

  return { success: true };
}

// Internal reusable helper to save OTP to database and deliver it via Resend
async function sendAndSaveOtp(email: string, userId: string, type: OtpType) {
  const otpCode = generateOtp();

  // Save/upsert OTP record in local database
  await db.otpVerification.upsert({
    where: { email },
    update: {
      otp: otpCode,
      tokenHash: userId, // Reusing tokenHash to store target userId
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
    },
    create: {
      email,
      otp: otpCode,
      tokenHash: userId,
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const subjectText = type === OtpType.SIGNUP 
    ? "Verify your CodeRun registration" 
    : "Reset your CodeRun password";

  const bodyTitle = type === OtpType.SIGNUP
    ? "Verify Registration"
    : "Reset Password Request";

  // Email the OTP code using Resend
  const emailResponse = await resend.emails.send({
    from: "CodeRun <coderun@vishu.codes>",
    to: email,
    subject: subjectText,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; borderRadius: 5px;">
        <h2 style="color: #333; textAlign: center;">${bodyTitle}</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; fontWeight: bold; textAlign: center; padding: 15px; margin: 20px 0; background-color: #f7f7f7; color: #4F46E5; letterSpacing: 4px;">
          ${otpCode}
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; textAlign: center;">CodeRun - Gamified DSA Learning Platform</p>
      </div>
    `,
  });

  if (emailResponse.error) {
    throw new Error(emailResponse.error.message || "Failed to send verification email via Resend.");
  }

  return { success: true };
}
