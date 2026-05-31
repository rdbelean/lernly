-- Defense-in-depth: bake the ownership check INTO requeue_cram_chunk instead of
-- relying solely on the /api/cram/retry route's prior RLS-scoped SELECT. EXECUTE
-- is already restricted to service_role/postgres, so this isn't closing a live
-- hole — it makes the function safe regardless of caller. Adds p_user_id and
-- scopes the UPDATE to packs owned by that user.
-- Backward-compatible: the route is updated in the same change to pass p_user_id.

create or replace function public.requeue_cram_chunk(
  p_pack_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job uuid;
begin
  update public.study_packs
    set status = 'queued', attempts = 0
    where id = p_pack_id
      and user_id = p_user_id
      and status = 'failed'
      and cram_job_id is not null
    returning cram_job_id into v_job;
  if v_job is null then
    return false;
  end if;
  update public.cram_jobs
    set failed_chunks = greatest(failed_chunks - 1, 0),
        status = 'queued',
        updated_at = now()
    where id = v_job
      and user_id = p_user_id;
  return true;
end;
$$;

-- NOTE: we intentionally do NOT drop the old single-arg
-- requeue_cram_chunk(uuid) here. The currently-deployed production code calls
-- it, so dropping it before this branch ships would break /api/cram/retry in
-- prod. Both overloads coexist (Postgres allows it); the old one is removed in
-- a FOLLOW-UP migration only after this branch is live on main. Additive +
-- backward-compatible by design.

revoke all on function public.requeue_cram_chunk(uuid, uuid) from public, anon, authenticated;
