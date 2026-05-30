-- =========================================================================
-- Bump study-uploads bucket file_size_limit to match the client cap.
-- =========================================================================
-- Phase 1 raised the client-side MAX_FILE_BYTES from 25 MB to 75 MB so
-- larger lecture decks fit. The bucket itself was still capped at the
-- original 25 MB, so any file >25 MB was accepted by the form, sent to
-- Supabase Storage, then rejected with HTTP 413 — surfacing in the browser
-- as a generic "Failed to fetch" because the supabase-js SDK wraps the
-- Storage 413 in a fetch-style error that short-circuits.
--
-- This update aligns the bucket cap with the client cap. Idempotent.
-- =========================================================================

update storage.buckets
set file_size_limit = 78643200 -- 75 MB (75 * 1024 * 1024)
where id = 'study-uploads';
