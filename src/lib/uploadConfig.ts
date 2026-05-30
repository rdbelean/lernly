// =========================================================================
// Single source of truth for upload size caps
// =========================================================================
// Used by: client pre-check (react-dropzone), client UI text ("max X MB"),
// server-side validation in /api/generate, the over-limit error message.
//
// Keep this constant in sync with the storage bucket's `file_size_limit`
// (set in supabase/migrations/*bucket_size*.sql) and with the Supabase
// project's global file-size ceiling.
//
//   Free tier  → project ceiling 50 MB. Maximum value here: 50 MB.
//   Pro+       → ceiling configurable in Supabase Dashboard. Can raise.
//
// To change the cap:
//   1) Update MAX_FILE_BYTES below.
//   2) Add a new migration `update storage.buckets set file_size_limit = X
//      where id = 'study-uploads';` with X = the new byte count, and apply it.
//   3) If on Free tier and going above 50 MB: also upgrade to Pro + raise
//      the project's global ceiling in Supabase Dashboard → Settings.
// =========================================================================

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB — Free-tier safe.
export const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / 1024 / 1024);
