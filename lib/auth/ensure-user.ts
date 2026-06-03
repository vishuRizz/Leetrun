import { db } from "@/lib/db";
import type { User } from "@supabase/supabase-js";

/** Ensure a Supabase auth user has a matching Prisma row (idempotent). */
export async function ensureDbUser(authUser: User) {
  const existing = await db.user.findUnique({
    where: { id: authUser.id },
  });
  if (existing) return existing;

  const email = authUser.email;
  if (!email) {
    throw new Error("Authenticated user is missing an email address.");
  }

  return db.user.create({
    data: {
      id: authUser.id,
      email,
      fullName: authUser.user_metadata?.full_name || null,
      avatarUrl: authUser.user_metadata?.avatar_url || null,
      level: "BEGINNER",
      onboardingDone: authUser.user_metadata?.onboardingDone === true,
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
