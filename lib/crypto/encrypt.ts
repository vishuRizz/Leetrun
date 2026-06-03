import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret =
    process.env.LEETCODE_COOKIE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "leetruncookie-dev-only";
  return scryptSync(secret, "leetruncookie-salt", 32);
}

/** Encrypt sensitive strings (e.g. LeetCode session cookies) at rest. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(blob: string): string {
  const [ivB, tagB, dataB] = blob.split(":");
  if (!ivB || !tagB || !dataB) {
    throw new Error("Invalid encrypted payload.");
  }
  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivB, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
