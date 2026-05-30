-- =========================================================================
-- Exam-Relevance Engine: past-exam + instructor-hint signals on a Klausur
-- =========================================================================
-- Extends exams with the "lens" the Altklausur-engine uses to bias pack
-- generation toward what's actually testable, plus a child table holding
-- each uploaded past-exam reference and its extracted plain text.
--
-- Idempotent (`if not exists` / `drop policy if exists`). Safe to re-run.
-- =========================================================================

alter table public.exams
  add column if not exists instructor_hints text;

alter table public.exams
  add column if not exists fidelity text default 'likely';

-- Constrain fidelity to the three documented levels. Skipped if already
-- in place (drop-then-add is the simplest idempotent shape Postgres gives us).
alter table public.exams drop constraint if exists exams_fidelity_check;
alter table public.exams add constraint exams_fidelity_check
  check (fidelity in ('strict', 'likely', 'broad'));

alter table public.exams
  add column if not exists exam_profile jsonb;

-- =========================================================================
-- exam_references — uploaded past-exam / topic-list / other relevance docs
-- =========================================================================
-- Each row is one Altklausur (or similar) attached to an exam. The
-- extracted plain text is stored inline so the analysis step doesn't have
-- to round-trip Storage every time we want to re-analyse.

create table if not exists public.exam_references (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  filename        text,
  extracted_text  text,
  kind            text not null default 'past_exam'
                    check (kind in ('past_exam', 'topic_list', 'other')),
  created_at      timestamptz not null default now()
);

alter table public.exam_references enable row level security;

drop policy if exists exam_references_select_own on public.exam_references;
create policy exam_references_select_own on public.exam_references
  for select using (auth.uid() = user_id);

drop policy if exists exam_references_insert_own on public.exam_references;
create policy exam_references_insert_own on public.exam_references
  for insert with check (auth.uid() = user_id);

drop policy if exists exam_references_update_own on public.exam_references;
create policy exam_references_update_own on public.exam_references
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists exam_references_delete_own on public.exam_references;
create policy exam_references_delete_own on public.exam_references
  for delete using (auth.uid() = user_id);

create index if not exists exam_references_exam_idx
  on public.exam_references (exam_id);
