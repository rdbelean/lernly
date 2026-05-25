// Shared (browser + server) helpers for the raw study-material upload bucket.
// The first path segment MUST be the user id — the Storage RLS policies in
// supabase/migrations/20260525_study_uploads_bucket.sql key off it.
export const STUDY_UPLOADS_BUCKET = "study-uploads";

export function sanitizeUploadName(name: string): string {
  // Collapse anything that isn't a word char / dot / dash to "_", then drop
  // leading dots+underscores (avoids ".." and hidden-file-looking names).
  const cleaned = name.replace(/[^\w.\-]+/g, "_").replace(/^[._]+/, "");
  return cleaned.slice(-120) || "datei";
}

export function buildUploadPath(userId: string, name: string): string {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${rand}-${sanitizeUploadName(name)}`;
}
