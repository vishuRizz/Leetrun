/**
 * Lobby chat media storage helpers (Supabase Storage).
 *
 * Attachments shared in a lobby's chat live in a dedicated public bucket so the
 * chat UI can embed the public URL directly. Mirrors the avatars helper: the
 * bucket is created on demand so a fresh Supabase project just works.
 */
import { supabaseAdmin } from "./admin";

export const ROOM_MEDIA_BUCKET = "room-media";

export const ROOM_MEDIA_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export const ROOM_MEDIA_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
] as const;

/** Idempotently ensures the room-media bucket exists (public). */
export async function ensureRoomMediaBucket(): Promise<void> {
  const { data: list, error: listErr } =
    await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    console.warn("Could not list buckets:", listErr.message);
    return;
  }
  if (list?.some((b) => b.name === ROOM_MEDIA_BUCKET)) return;

  const { error: createErr } = await supabaseAdmin.storage.createBucket(
    ROOM_MEDIA_BUCKET,
    {
      public: true,
      fileSizeLimit: ROOM_MEDIA_MAX_BYTES,
      allowedMimeTypes: [...ROOM_MEDIA_ALLOWED_TYPES],
    }
  );
  if (
    createErr &&
    !createErr.message?.toLowerCase().includes("already exists")
  ) {
    throw new Error(`Failed to create room-media bucket: ${createErr.message}`);
  }
}

function safeExt(name: string, type: string): string {
  const fromName = name?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  return type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "bin";
}

/**
 * Upload a chat attachment and return its public URL + metadata.
 * Objects are namespaced per room: `<roomId>/<userId>-<ts>.<ext>`.
 */
export async function uploadRoomMedia(
  roomId: string,
  userId: string,
  file: File | Blob,
  originalName: string
): Promise<{ url: string; type: string; name: string }> {
  await ensureRoomMediaBucket();
  const type = (file as File).type || "application/octet-stream";
  const ext = safeExt(originalName, type);
  const path = `${roomId}/${userId}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(ROOM_MEDIA_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: type,
      cacheControl: "3600",
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage
    .from(ROOM_MEDIA_BUCKET)
    .getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not resolve media URL.");

  return { url: data.publicUrl, type, name: originalName || `file.${ext}` };
}
