-- =========================================================================
-- Align study-uploads bucket file_size_limit with the application's
-- single-source-of-truth cap (see src/lib/uploadConfig.ts).
-- =========================================================================
-- Chronology:
--   • 20260525 created the bucket at 25 MB.
--   • 20260530_..._bucket_size.sql tried to raise it to 75 MB — but 75 MB
--     is above the Supabase Free-tier project ceiling (50 MB), so even
--     when applied, the global cap would block uploads >50 MB.
--   • This migration sets the bucket cap to 50 MB, the Free-tier safe max
--     that matches the application's MAX_FILE_BYTES constant. On Pro, you
--     can raise both this value and src/lib/uploadConfig.ts in lockstep.
--
-- Idempotent. Safe to re-run. Apply via Supabase SQL editor.
-- =========================================================================

update storage.buckets
set file_size_limit = 52428800 -- 50 MB (50 * 1024 * 1024)
where id = 'study-uploads';
