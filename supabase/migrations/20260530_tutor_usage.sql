-- =========================================================================
-- tutor_usage — monthly KI-Hilfe message counter per user
-- =========================================================================
-- Single row per user. `period_start` tracks the first second of the month
-- whose messages this row counts. When the route sees period_start in a
-- previous month, it resets messages_used to 0 and bumps period_start.
-- Simpler than a per-message log; sufficient for the monthly cap. A log
-- table can be added later if we need per-message debugging.
-- =========================================================================

create table if not exists public.tutor_usage (
  user_id        uuid primary key references public.users(id) on delete cascade,
  period_start   timestamptz not null default date_trunc('month', now()),
  messages_used  int not null default 0,
  updated_at     timestamptz not null default now()
);

alter table public.tutor_usage enable row level security;

drop policy if exists tutor_usage_select_own on public.tutor_usage;
create policy tutor_usage_select_own on public.tutor_usage
  for select using (auth.uid() = user_id);

drop policy if exists tutor_usage_insert_own on public.tutor_usage;
create policy tutor_usage_insert_own on public.tutor_usage
  for insert with check (auth.uid() = user_id);

drop policy if exists tutor_usage_update_own on public.tutor_usage;
create policy tutor_usage_update_own on public.tutor_usage
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No DELETE policy — usage rows are append/update only. RLS prevents
-- cross-user access; no admin reset path in V1 (open up later if needed).
