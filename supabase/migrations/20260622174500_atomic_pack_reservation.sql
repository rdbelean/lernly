-- =========================================================================
-- Atomic pack-quota reservation (closes the check-then-bump race)
-- =========================================================================
-- Today /api/generate calls check_pack_quota() up front (no increment) and
-- bump_pack_usage() only after a successful save. Those two points are minutes
-- apart, so concurrent generations can ALL pass the check before any bumps —
-- letting a user (worst case: free tier, cap 2) exceed the cap and burn real
-- Anthropic spend on Lernly's key.
--
-- reserve_pack_slot() folds the check AND the increment into one statement
-- under `for update`, so the Nth concurrent caller sees the already-incremented
-- count and is rejected BEFORE generating. The route refunds (refund_pack_slot)
-- on any failure after a successful reserve, preserving the existing
-- "a failed run never costs a pack" behaviour.
--
-- ADDITIVE + backward-compatible: new functions only. check_pack_quota and
-- bump_pack_usage are untouched and keep working for the packs/save path and
-- as a defensive fallback in the route until this is live.
-- =========================================================================

-- Same gate as check_pack_quota, but on success it increments
-- packs_used_this_month + sets last_pack_at atomically under the row lock and
-- returns reserved:true. rate_limit / quota_exceeded return WITHOUT
-- incrementing (so the route's pack-credit fallback still applies).
create or replace function public.reserve_pack_slot()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_now timestamptz := now();
  v_month_start timestamptz := date_trunc('month', v_now);
  v_plan text;
  v_limit int;
  v_gap_seconds int := 30;
  v_retry_after int;
begin
  select plan, packs_used_this_month, last_quota_reset_at, last_pack_at, plan_expires_at
    into v_user
    from public.users
    where id = auth.uid()
    for update;

  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_user');
  end if;

  if v_user.last_quota_reset_at < v_month_start then
    update public.users
      set packs_used_this_month = 0,
          last_quota_reset_at = v_month_start
      where id = auth.uid();
    v_user.packs_used_this_month := 0;
  end if;

  -- Lapsed paid access falls back to free limits.
  v_plan := v_user.plan;
  if v_plan <> 'free'
     and v_user.plan_expires_at is not null
     and v_user.plan_expires_at < v_now then
    v_plan := 'free';
  end if;

  v_limit := case v_plan
    when 'free'          then 2
    when 'einzelklausur' then 5
    when 'monthly'       then 50
    when 'semester'      then 60
    when 'pro'           then 60
    when 'team'          then 60
    else 0
  end;

  if v_user.last_pack_at is not null
     and v_now - v_user.last_pack_at < (v_gap_seconds || ' seconds')::interval then
    v_retry_after := ceil(extract(epoch from
      (v_gap_seconds || ' seconds')::interval - (v_now - v_user.last_pack_at)
    ))::int;
    return json_build_object(
      'ok', false, 'reason', 'rate_limit', 'retry_after_seconds', v_retry_after,
      'used', v_user.packs_used_this_month, 'limit', v_limit, 'plan', v_plan
    );
  end if;

  if v_user.packs_used_this_month >= v_limit then
    return json_build_object(
      'ok', false, 'reason', 'quota_exceeded',
      'used', v_user.packs_used_this_month, 'limit', v_limit, 'plan', v_plan
    );
  end if;

  -- Atomic reserve: increment under the same lock the limit was read with.
  update public.users
    set packs_used_this_month = packs_used_this_month + 1,
        last_pack_at = v_now
    where id = auth.uid();

  return json_build_object(
    'ok', true, 'reserved', true,
    'used', v_user.packs_used_this_month + 1, 'limit', v_limit, 'plan', v_plan
  );
end;
$$;

revoke all on function public.reserve_pack_slot() from public, anon;
grant execute on function public.reserve_pack_slot() to authenticated;

-- Refund a reservation when the generation it covered failed. Takes a user id
-- (the route passes the VERIFIED session user.id and calls this via the
-- service role) and is locked down to service_role only, mirroring the
-- requeue_cram_chunk / bump_study_day pattern. Floors at 0.
create or replace function public.refund_pack_slot(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
    set packs_used_this_month = greatest(packs_used_this_month - 1, 0)
    where id = p_user_id;
end;
$$;

revoke all on function public.refund_pack_slot(uuid) from public, anon, authenticated;
grant execute on function public.refund_pack_slot(uuid) to service_role;
