-- =========================================================================
-- Plan limit update (Phase 7) — free 3→2, pro 20→25, team 50→60
-- =========================================================================
create or replace function public.check_pack_quota()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_now timestamptz := now();
  v_month_start timestamptz := date_trunc('month', v_now);
  v_limit int;
  v_gap_seconds int := 30;
  v_retry_after int;
begin
  select plan, packs_used_this_month, last_quota_reset_at, last_pack_at
    into v_user
    from public.users
    where id = auth.uid()
    for update;

  if not found then
    return json_build_object(
      'ok', false,
      'reason', 'unknown_user'
    );
  end if;

  if v_user.last_quota_reset_at < v_month_start then
    update public.users
      set packs_used_this_month = 0,
          last_quota_reset_at = v_month_start
      where id = auth.uid();
    v_user.packs_used_this_month := 0;
  end if;

  -- Pricing v2 limits.
  v_limit := case v_user.plan
    when 'free' then 2
    when 'pro'  then 25
    when 'team' then 60
    else 0
  end;

  if v_user.last_pack_at is not null
     and v_now - v_user.last_pack_at < (v_gap_seconds || ' seconds')::interval then
    v_retry_after := ceil(extract(epoch from
      (v_gap_seconds || ' seconds')::interval - (v_now - v_user.last_pack_at)
    ))::int;
    return json_build_object(
      'ok', false,
      'reason', 'rate_limit',
      'retry_after_seconds', v_retry_after,
      'used', v_user.packs_used_this_month,
      'limit', v_limit,
      'plan', v_user.plan
    );
  end if;

  if v_user.packs_used_this_month >= v_limit then
    return json_build_object(
      'ok', false,
      'reason', 'quota_exceeded',
      'used', v_user.packs_used_this_month,
      'limit', v_limit,
      'plan', v_user.plan
    );
  end if;

  return json_build_object(
    'ok', true,
    'used', v_user.packs_used_this_month,
    'limit', v_limit,
    'plan', v_user.plan
  );
end;
$$;
