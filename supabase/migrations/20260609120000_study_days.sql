-- =========================================================================
-- study_days — one row per (user, Europe/Berlin calendar day) the user studied
-- =========================================================================
-- A study day = a day on which the user rated a flashcard OR submitted a quiz
-- attempt. Upserted via bump_study_day() from recordCardReview + saveQuizAttempt.
-- Drives the student dashboard's calendar HEATMAP, current streak and LONGEST
-- streak. `count` = number of study actions that day (heatmap intensity).
--
-- Purely additive + backward-compatible: nothing in the currently-deployed code
-- reads this table, so it is safe to apply ahead of the dashboard shipping.
-- The backfill block runs ONCE in this migration — re-applying would
-- double-count, so do not re-run it.
-- =========================================================================

create table if not exists public.study_days (
  user_id     uuid not null references public.users(id) on delete cascade,
  day         date not null,               -- Europe/Berlin calendar day
  count       int  not null default 0,     -- study actions that day (intensity)
  created_at  timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.study_days enable row level security;

-- The student reads their own days for the dashboard. Writes go through the
-- security-definer RPC below (called with the service client), mirroring how
-- bumpStreak writes the users row — so insert/update policies aren't strictly
-- required, but we add them for parity / defense in depth.
drop policy if exists study_days_select_own on public.study_days;
create policy study_days_select_own on public.study_days
  for select using (auth.uid() = user_id);

drop policy if exists study_days_insert_own on public.study_days;
create policy study_days_insert_own on public.study_days
  for insert with check (auth.uid() = user_id);

drop policy if exists study_days_update_own on public.study_days;
create policy study_days_update_own on public.study_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Heatmap/streak scan: all my days, chronological (PK already orders by day).
create index if not exists study_days_user_day_idx
  on public.study_days (user_id, day);

-- =========================================================================
-- bump_study_day() — atomic per-day increment. A plain upsert would OVERWRITE
-- count; this adds. security definer so the service client can write any user's
-- row; execute is restricted to service_role so an authenticated client can't
-- spoof p_user (the function bypasses RLS).
-- =========================================================================
create or replace function public.bump_study_day(p_user uuid, p_day date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.study_days (user_id, day, count)
  values (p_user, p_day, 1)
  on conflict (user_id, day)
    do update set count = public.study_days.count + 1;
$$;

revoke all on function public.bump_study_day(uuid, date) from public;
grant execute on function public.bump_study_day(uuid, date) to service_role;

-- =========================================================================
-- BACKFILL (runs once) — seed distinct Berlin-days from existing study history
-- so the heatmap + longest streak aren't empty for current users. Approximate:
-- card_reviews.last_rated_at only holds each card's MOST RECENT rating, so
-- historical intensity is undercounted (presence/streak is correct). quiz
-- attempts are one row each, so their days are exact.
-- =========================================================================
insert into public.study_days (user_id, day, count)
select user_id, day, count(*)::int
from (
  select user_id, (last_rated_at at time zone 'Europe/Berlin')::date as day
  from public.card_reviews
  where last_rated_at is not null
  union all
  select user_id, (created_at at time zone 'Europe/Berlin')::date as day
  from public.quiz_attempts
) s
group by user_id, day
on conflict (user_id, day)
  do update set count = public.study_days.count + excluded.count;
