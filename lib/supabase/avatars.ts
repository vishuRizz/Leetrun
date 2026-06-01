/**
 * Avatar storage helpers (Supabase Storage).
 *
 * Avatars live in a dedicated public bucket so leaderboard cards can simply
 * embed the public URL without any signing roundtrip. We try to create the
 * bucket on demand so a fresh Supabase project doesn't break the upload flow.
 */
import { supabaseAdmin } from "./admin";

export const AVATARS_BUCKET = "avatars";

/** Filename for a user's avatar, keyed by user id so re-uploads overwrite. */
export function avatarObjectPath(userId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  return `${userId}.${safeExt}`;
}

/** Idempotently ensures the avatars bucket exists (public). */
export async function ensureAvatarsBucket(): Promise<void> {
  const { data: list, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    // Most likely a transient error; surface but don't crash so the upload
    // can still race against an already-created bucket.
    console.warn("Could not list buckets:", listErr.message);
    return;
  }
  if (list?.some((b) => b.name === AVATARS_BUCKET)) return;

  const { error: createErr } = await supabaseAdmin.storage.createBucket(
    AVATARS_BUCKET,
    {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    }
  );
  if (createErr && !createErr.message?.toLowerCase().includes("already exists")) {
    throw new Error(`Failed to create avatars bucket: ${createErr.message}`);
  }
}

/**
 * Upload (or replace) a user's avatar and return its public URL.
 * Adds a cache-busting `?v=` so the new image renders immediately client-side.
 */
export async function uploadAvatar(
  userId: string,
  file: File | Blob,
  ext: string
): Promise<string> {
  await ensureAvatarsBucket();
  const path = avatarObjectPath(userId, ext);
  const { error } = await supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: (file as File).type || "image/png",
      cacheControl: "3600",
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not resolve public avatar URL.");
  return `${data.publicUrl}?v=${Date.now()}`;
}
