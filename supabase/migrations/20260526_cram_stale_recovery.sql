-- Robustness: recover cram chunks stranded in 'processing' when a worker
-- invocation dies mid-generation. claim_cram_chunks previously only re-grabbed
-- 'queued' rows, so a crashed invocation's chunk would hang at "wird erstellt"
-- forever. Now it also reclaims 'processing' rows whose claim is stale (>15min
-- or never timestamped), and records claimed_at on every claim.
alter table public.study_packs add column if not exists claimed_at timestamptz;

create or replace function public.claim_cram_chunks(p_limit int)
returns setof public.study_packs
language sql security definer set search_path = public as $$
  update public.study_packs sp
  set status = 'processing', attempts = sp.attempts + 1, claimed_at = now()
  where sp.id in (
    select id from public.study_packs
    where status = 'queued'
       or (status = 'processing'
           and (claimed_at is null or claimed_at < now() - interval '15 minutes'))
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning sp.*;
$$;

revoke all on function public.claim_cram_chunks(int) from public, anon, authenticated;
