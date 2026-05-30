-- =========================================================================
-- exam_reminders_enabled — per-user toggle for the daily "noch X Tage bis
-- deiner Klausur"-Mail. Defaults to true (opt-out) so paying users get the
-- value of the reminder pipeline without opting in first. The settings UI
-- writes this column; the cron job (api/cron/exam-reminders) reads it.
-- =========================================================================

alter table public.users
  add column if not exists exam_reminders_enabled boolean not null default true;

-- Audit / debug: when the user last received a reminder for a given exam.
-- Single row per (user, exam) so we don't double-send within the same
-- reminder window (7d / 3d / 1d). Cleaned up via the users cascade.
create table if not exists public.exam_reminder_log (
  user_id     uuid not null references public.users(id) on delete cascade,
  exam_id     uuid not null references public.exams(id) on delete cascade,
  window_days int not null check (window_days in (7, 3, 1)),
  sent_at     timestamptz not null default now(),
  primary key (user_id, exam_id, window_days)
);

create index if not exists exam_reminder_log_sent_at_idx
  on public.exam_reminder_log(sent_at desc);

-- Service role only — the cron runs with the service key; no end-user RLS
-- needed.
alter table public.exam_reminder_log enable row level security;
