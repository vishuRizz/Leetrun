/**
 * Username (URL slug) helpers.
 *
 * Every user gets a stable, URL-safe handle that powers their public profile
 * at `/<username>`. We auto-generate one the first time it's accessed so old
 * accounts don't need a migration script; users can also rename it from the
 * profile page (subject to validation + reserved-word checks below).
 */
import { db } from "@/lib/db";

const RESERVED = new Set<string>([
  // App route segments that share the root URL space with public profiles.
  "api",
  "app",
  "dashboard",
  "profile",
  "leaderboard",
  "rooms",
  "chat",
  "analytics",
  "login",
  "signup",
  "logout",
  "onboarding",
  "forgot-password",
  "reset-password",
  "settings",
  "billing",
  "contact",
  "privacy",
  "terms",
  "about",
  "pricing",
  "u", // reserved for future namespacing
  "_next",
  "static",
  "public",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "admin",
  "team",
  "help",
  "docs",
  "blog",
  "support",
  "404",
  "500",
]);

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

export function slugifyName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, USERNAME_MAX);
}

export function isReserved(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase());
}

/**
 * Validate a user-supplied username. Throws with a human-readable message
 * if it fails, otherwise returns the normalized (lowercased) value.
 */
export function normalizeAndValidate(input: string): string {
  const slug = input.trim().toLowerCase();
  if (slug.length < USERNAME_MIN) {
    throw new Error(`Username must be at least ${USERNAME_MIN} characters.`);
  }
  if (slug.length > USERNAME_MAX) {
    throw new Error(`Username must be at most ${USERNAME_MAX} characters.`);
  }
  if (!USERNAME_PATTERN.test(slug)) {
    throw new Error(
      "Use only lowercase letters, numbers, dashes and underscores."
    );
  }
  if (isReserved(slug)) {
    throw new Error("That username is reserved.");
  }
  return slug;
}

/** Find a free username starting from `base` by appending `-2`, `-3`, …. */
async function findFreeUsername(base: string): Promise<string> {
  let candidate = base || "user";
  if (candidate.length < USERNAME_MIN) candidate = candidate.padEnd(USERNAME_MIN, "0");
  if (isReserved(candidate)) candidate = `${candidate}-1`;

  for (let i = 0; i < 50; i++) {
    const taken = await db.user.findFirst({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken && !isReserved(candidate)) return candidate;
    candidate = `${base}-${i + 2}`.slice(0, USERNAME_MAX);
  }
  // Fallback: append a short random suffix.
  return `${base}-${Math.random().toString(36).slice(2, 6)}`.slice(0, USERNAME_MAX);
}

/**
 * Make sure a user has a stable public username, generating one from their
 * name/email if needed. Returns the username string.
 */
export async function ensureUsername(
  user: { id: string; username: string | null; fullName: string | null; email: string }
): Promise<string> {
  if (user.username) return user.username;

  const base =
    slugifyName(user.fullName || "") ||
    slugifyName(user.email.split("@")[0] || "") ||
    "user";
  const free = await findFreeUsername(base);
  try {
    await db.user.update({
      where: { id: user.id },
      data: { username: free },
    });
    return free;
  } catch {
    // Lost a race against another writer; reload the row.
    const refetched = await db.user.findUnique({
      where: { id: user.id },
      select: { username: true },
    });
    if (refetched?.username) return refetched.username;
    // Try once more with a noisier candidate.
    const noisier = `${base}-${Math.random().toString(36).slice(2, 6)}`.slice(
      0,
      USERNAME_MAX
    );
    await db.user.update({
      where: { id: user.id },
      data: { username: noisier },
    });
    return noisier;
  }
}

/**
 * Change a user's username (validates + uniqueness checked at write time).
 * Returns the new value on success; throws a readable error otherwise.
 */
export async function setUsername(userId: string, raw: string): Promise<string> {
  const slug = normalizeAndValidate(raw);
  const existing = await db.user.findFirst({
    where: { username: slug, NOT: { id: userId } },
    select: { id: true },
  });
  if (existing) throw new Error("That username is already taken.");
  await db.user.update({
    where: { id: userId },
    data: { username: slug },
  });
  return slug;
}

/**
 * Resolve a slug to a user row. Supports either the stable cuid `id` or the
 * mutable `username` so links keep working if a user renames themselves.
 */
export async function findUserBySlug(slug: string) {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  const byUsername = await db.user.findFirst({
    where: { username: normalized },
  });
  if (byUsername) return byUsername;
  // Fallback: legacy links built with the user id, before usernames existed.
  return db.user.findUnique({ where: { id: slug } });
}
