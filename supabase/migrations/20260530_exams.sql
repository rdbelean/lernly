-- =========================================================================
-- Exam-centric dashboard: exams + pack assignment + last-opened tracking
-- =========================================================================
-- The dashboard's organizing unit is the Klausur (exam), not a generic
-- folder. Packs live under an exam (or hang loose if no exam yet). Each
-- pack tracks last_opened_at so "Weiterlernen" jumps to the most recently
-- studied pack within an exam.
-- =========================================================================

create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  exam_date   date,
  color       text,
  created_at  timestamptz not null default now()
);

alter table public.exams enable row level security;

drop policy if exists exams_select_own on public.exams;
create policy exams_select_own on public.exams
  for select using (auth.uid() = user_id);

drop policy if exists exams_insert_own on public.exams;
create policy exams_insert_own on public.exams
  for insert with check (auth.uid() = user_id);

drop policy if exists exams_update_own on public.exams;
create policy exams_update_own on public.exams
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists exams_delete_own on public.exams;
create policy exams_delete_own on public.exams
  for delete using (auth.uid() = user_id);

create index if not exists exams_user_date_idx
  on public.exams (user_id, exam_date nulls last);

-- =========================================================================
-- study_packs: link to exam + track last-opened
-- =========================================================================
-- exam_id nullable so packs can hang loose (Nicht zugeordnet). Deleting an
-- exam sets exam_id = null on its packs — packs survive their exam.

alter table public.study_packs
  add column if not exists exam_id uuid references public.exams(id) on delete set null;

alter table public.study_packs
  add column if not exists last_opened_at timestamptz;

create index if not exists study_packs_exam_id_idx
  on public.study_packs(exam_id) where exam_id is not null;

-- The existing study_packs RLS allows SELECT/INSERT/DELETE on own rows but
-- not UPDATE. We need UPDATE so users can assign their pack to an exam and
-- so the pack page can bump last_opened_at.
drop policy if exists study_packs_update_own on public.study_packs;
create policy study_packs_update_own on public.study_packs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- list_pack_summaries — extend to include exam_id + last_opened_at
-- =========================================================================
-- Dashboard groups packs by exam_id, so the existing summary RPC needs to
-- surface that column. Same SQL otherwise.

create or replace function public.list_pack_summaries()
returns table (
  id              uuid,
  title           text,
  exam_type       text,
  created_at      timestamptz,
  card_count      int,
  exam_id         uuid,
  last_opened_at  timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.title,
    sp.exam_type,
    sp.created_at,
    coalesce(jsonb_array_length(sp.pack_data->'flashcards'), 0)::int as card_count,
    sp.exam_id,
    sp.last_opened_at
  from public.study_packs sp
  where sp.user_id = auth.uid()
    and sp.status = 'ready'
  order by sp.created_at desc;
$$;

grant execute on function public.list_pack_summaries() to authenticated;
