import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site";
import { captureServerEvent } from "@/lib/analytics/posthog-server";

/** Coins granted to BOTH the referrer and the new friend on a successful referral. */
export const REFERRAL_REWARD_COINS = 50;

function randomCode(): string {
  // 6-char uppercase alphanumeric, ambiguity-free enough for share links.
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Return the user's referral code, generating + persisting one if missing. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // Unique collision (or lost race) - reload and retry.
      const refetched = await db.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });
      if (refetched?.referralCode) return refetched.referralCode;
    }
  }
  throw new Error("Could not generate a referral code.");
}

export function referralLink(code: string): string {
  return `${siteConfig.url}/signup?ref=${code}`;
}

/**
 * Attribute a new (just-onboarded) user to the referrer behind `code` and
 * credit both sides with coins. Idempotent: a user can only be referred once,
 * and self-referrals are ignored. Safe to call best-effort - never throws.
 */
export async function recordReferral(
  refereeId: string,
  code: string | null | undefined
): Promise<{ credited: boolean }> {
  try {
    const trimmed = (code || "").trim().toUpperCase();
    if (!trimmed) return { credited: false };

    const referrer = await db.user.findUnique({
      where: { referralCode: trimmed },
      select: { id: true },
    });
    if (!referrer || referrer.id === refereeId) return { credited: false };

    // Already referred? (refereeId is unique on Referral.)
    const already = await db.referral.findUnique({
      where: { refereeId },
      select: { id: true },
    });
    if (already) return { credited: false };

    await db.$transaction([
      db.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId,
          status: "COMPLETED",
          rewardCoins: REFERRAL_REWARD_COINS,
        },
      }),
      db.user.update({
        where: { id: referrer.id },
        data: { coins: { increment: REFERRAL_REWARD_COINS } },
      }),
      db.user.update({
        where: { id: refereeId },
        data: { coins: { increment: REFERRAL_REWARD_COINS } },
      }),
      db.userEvent.create({
        data: {
          userId: referrer.id,
          eventType: "REFERRAL_COMPLETED",
          metadata: { refereeId, rewardCoins: REFERRAL_REWARD_COINS },
        },
      }),
      db.userEvent.create({
        data: {
          userId: refereeId,
          eventType: "REFERRED_SIGNUP",
          metadata: { referrerId: referrer.id, rewardCoins: REFERRAL_REWARD_COINS },
        },
      }),
    ]);

    captureServerEvent(referrer.id, "referral_completed", {
      rewardCoins: REFERRAL_REWARD_COINS,
    }).catch(() => {});

    return { credited: true };
  } catch (err) {
    console.warn("recordReferral failed:", err);
    return { credited: false };
  }
}

export interface ReferralStats {
  code: string;
  link: string;
  rewardCoins: number;
  count: number;
  coinsEarned: number;
  referrals: {
    name: string;
    username: string | null;
    avatarUrl: string | null;
    joinedAt: string;
  }[];
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const code = await getOrCreateReferralCode(userId);
  const rows = await db.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      referee: { select: { fullName: true, username: true, avatarUrl: true } },
    },
  });

  return {
    code,
    link: referralLink(code),
    rewardCoins: REFERRAL_REWARD_COINS,
    count: rows.length,
    coinsEarned: rows.reduce((sum, r) => sum + r.rewardCoins, 0),
    referrals: rows.map((r) => ({
      name: r.referee?.fullName || "A friend",
      username: r.referee?.username ?? null,
      avatarUrl: r.referee?.avatarUrl ?? null,
      joinedAt: r.createdAt.toISOString(),
    })),
  };
}
