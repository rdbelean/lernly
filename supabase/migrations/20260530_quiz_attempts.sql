-- =========================================================================
-- quiz_attempts — per-pack quiz attempt records (the retention loop)
-- =========================================================================
-- Each row = one quiz run finished by hitting "Alle Antworten prüfen".
-- per_topic stores { "Topic Name": { correct, wrong, skipped }, ... } so
-- weak topics can be derived later without re-aggregating from raw answers.
-- question_ids records the ids the user actually saw, so re-practice can
-- avoid showing them again.
-- =========================================================================

create table if not exists public.quiz_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  pack_id           uuid not null references public.study_packs(id) on delete cascade,
  total_questions   int not null,
  correct_count     int not null,
  wrong_count       int not null,
  skipped_count     int not null,
  per_topic         jsonb not null default '{}'::jsonb,
  question_ids      text[] not null default '{}',
  is_re_practice    boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

drop policy if exists quiz_attempts_select_own on public.quiz_attempts;
create policy quiz_attempts_select_own on public.quiz_attempts
  for select using (auth.uid() = user_id);

drop policy if exists quiz_attempts_insert_own on public.quiz_attempts;
create policy quiz_attempts_insert_own on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

-- No UPDATE / DELETE policies in V1 — attempts are immutable history.

create index if not exists quiz_attempts_pack_recent_idx
  on public.quiz_attempts (pack_id, created_at desc);

create index if not exists quiz_attempts_user_recent_idx
  on public.quiz_attempts (user_id, created_at desc);
