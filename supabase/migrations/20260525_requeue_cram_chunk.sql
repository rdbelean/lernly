-- Re-queue a single failed cram chunk: only acts on a 'failed' chunk, resets it
-- to 'queued' (attempts 0 so the worker re-claims it), and rolls the parent
-- job's failed counter back + un-marks it 'done'. Ownership is enforced by the
-- caller (the /api/cram/retry route) before this runs.
create or replace function public.requeue_cram_chunk(p_pack_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_job uuid;
begin
  update public.study_packs
    set status = 'queued', attempts = 0
    where id = p_pack_id and status = 'failed' and cram_job_id is not null
    returning cram_job_id into v_job;
  if v_job is null then
    return false;
  end if;
  update public.cram_jobs
    set failed_chunks = greatest(failed_chunks - 1, 0),
        status = 'queued',
        updated_at = now()
    where id = v_job;
  return true;
end;
$$;

revoke all on function public.requeue_cram_chunk(uuid) from public, anon, authenticated;
