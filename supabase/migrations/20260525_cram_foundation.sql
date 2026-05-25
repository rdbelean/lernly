-- Cram-mode foundation: job table + per-chunk queue on study_packs + claim/complete RPCs.

create table if not exists public.cram_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  status            text not null default 'awaiting_payment'
                      check (status in ('awaiting_payment','queued','processing','done','failed')),
  exam_type         text not null,
  extra_info        text,
  total_chunks      int  not null default 0,
  done_chunks       int  not null default 0,
  failed_chunks     int  not null default 0,
  chunk_plan        jsonb not null default '[]'::jsonb,
  stripe_session_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.cram_jobs enable row level security;
drop policy if exists cram_jobs_select_own on public.cram_jobs;
create policy cram_jobs_select_own on public.cram_jobs
  for select using (auth.uid() = user_id);

alter table public.study_packs
  add column if not exists cram_job_id uuid references public.cram_jobs(id) on delete cascade,
  add column if not exists status text not null default 'ready'
      check (status in ('queued','processing','ready','failed')),
  add column if not exists chunk_label text,
  add column if not exists source_path text,
  add column if not exists page_start int,
  add column if not exists page_end int,
  add column if not exists attempts int not null default 0;

create index if not exists study_packs_queue_idx
  on public.study_packs (status, cram_job_id) where status in ('queued','processing');

create or replace function public.claim_cram_chunks(p_limit int)
returns setof public.study_packs
language sql security definer set search_path = public as $$
  update public.study_packs sp
  set status = 'processing', attempts = sp.attempts + 1
  where sp.id in (
    select id from public.study_packs
    where status = 'queued'
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning sp.*;
$$;

create or replace function public.complete_cram_chunk(p_pack_id uuid, p_ok boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_job uuid;
begin
  select cram_job_id into v_job from public.study_packs where id = p_pack_id;
  if v_job is null then return; end if;

  if p_ok then
    update public.cram_jobs set done_chunks = done_chunks + 1, updated_at = now() where id = v_job;
  else
    update public.cram_jobs set failed_chunks = failed_chunks + 1, updated_at = now() where id = v_job;
  end if;

  update public.cram_jobs
  set status = 'done', updated_at = now()
  where id = v_job and status <> 'done'
    and done_chunks + failed_chunks >= total_chunks;
end;
$$;

revoke all on function public.claim_cram_chunks(int) from public, anon, authenticated;
revoke all on function public.complete_cram_chunk(uuid, boolean) from public, anon, authenticated;
