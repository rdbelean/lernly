-- Background-job path for the REGULAR (non-cram) multi-file generation.
--
-- WHY: the synchronous /api/generate held ONE HTTP connection open for the
-- entire multi-minute generation. Large decks (e.g. a ~10MB PDF → ~180k-token
-- material context, several LLM tasks at 110-170s each) outlive the connection,
-- so the browser fetch drops before the pack returns → the user sees
-- "Verbindung zum Generator-Server fehlgeschlagen". This moves regular
-- generation onto the same queue/worker model the cram path already uses: a
-- queued study_packs row processed by the cron worker, while the client only
-- polls a lightweight status endpoint (no long-held connection).
--
-- Additive + backward-compatible: new nullable columns, a new claim RPC, and a
-- narrowing filter on the existing cram claim that is a no-op for real cram
-- chunks (which always carry a cram_job_id).

-- Multi-file source refs for the worker. (Cram processes a single
-- source_path/chunk per pack; regular generation combines N files into ONE
-- pack, so it needs an array of {path, name}.)
alter table public.study_packs
  add column if not exists source_refs jsonb,
  add column if not exists gen_extra_info text,
  -- Actionable failure reason surfaced to the polling client (too-large,
  -- scanned-PDF, etc.) when the worker marks a generation job 'failed'.
  add column if not exists gen_error text;

-- Keep the cram claim from grabbing regular generation jobs. Cram chunks ALWAYS
-- have a cram_job_id; generation jobs never do. Every existing queued row is a
-- cram chunk, so adding this filter changes nothing for the live cram flow.
create or replace function public.claim_cram_chunks(p_limit int)
returns setof public.study_packs
language sql security definer set search_path = public as $$
  update public.study_packs sp
  set status = 'processing', attempts = sp.attempts + 1, claimed_at = now()
  where sp.id in (
    select id from public.study_packs
    where cram_job_id is not null
      and (status = 'queued'
           or (status = 'processing'
               and (claimed_at is null or claimed_at < now() - interval '15 minutes')))
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning sp.*;
$$;
revoke all on function public.claim_cram_chunks(int) from public, anon, authenticated;

-- Claim queued (or stale-'processing') REGULAR generation jobs: no cram_job_id,
-- source_refs present. Same stale-recovery semantics as the cram claim so a
-- crashed worker invocation's pack doesn't hang at 'processing' forever.
create or replace function public.claim_generation_packs(p_limit int)
returns setof public.study_packs
language sql security definer set search_path = public as $$
  update public.study_packs sp
  set status = 'processing', attempts = sp.attempts + 1, claimed_at = now()
  where sp.id in (
    select id from public.study_packs
    where cram_job_id is null
      and source_refs is not null
      and (status = 'queued'
           or (status = 'processing'
               and (claimed_at is null or claimed_at < now() - interval '15 minutes')))
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning sp.*;
$$;
revoke all on function public.claim_generation_packs(int) from public, anon, authenticated;

create index if not exists study_packs_gen_queue_idx
  on public.study_packs (created_at)
  where cram_job_id is null and source_refs is not null
    and status in ('queued', 'processing');
