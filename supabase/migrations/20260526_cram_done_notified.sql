-- Guard so the cram-done email is sent exactly once per job, even when the
-- final chunks complete concurrently across worker invocations.
alter table public.cram_jobs add column if not exists done_notified_at timestamptz;
