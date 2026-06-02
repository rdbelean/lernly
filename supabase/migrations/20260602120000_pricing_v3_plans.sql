-- =========================================================================
-- Pricing v3 — new tariff model
-- =========================================================================
-- Plans: free | einzelklausur | semester | monthly  (Team removed)
--   free          2 packs / month        (unchanged)
--   einzelklausur 5 packs in 14-day window, one-time 4,99 €
--   semester      60 packs / month, 6-month subscription 29,99 €
--   monthly       50 packs / month, monthly subscription 8,99 €
--
-- ADDITIVE + backward-compatible with the currently-deployed code:
--   * CHECK is WIDENED (old 'pro'/'team' stay valid) — never narrowed here.
--     Dropping 'pro'/'team' happens in a SEPARATE follow-up migration AFTER
--     the v3 code is live and verified.
--   * plan_expires_at is a new nullable column — old code ignores it.
--   * check_pack_quota keeps the same signature; only the limit table +
--     a lapse check are added. Legacy 'pro'/'team' still resolve to a cap.
--   * Existing 'pro'/'team' rows are normalized to 'semester' (0 rows today;
--     safety net only).
-- =========================================================================

-- Access-window end for the active plan. Subscriptions: period end.
-- Einzelklausur (one-time): purchase + 14 days. NULL = free / no expiry.
alter table public.users
  add column if not exists plan_expires_at timestamptz;

-- Widen the plan CHECK to allow the v3 values alongside the legacy ones.
alter table public.users
  drop constraint if exists users_plan_check;
alter table public.users
  add constraint users_plan_check
  check (plan in ('free', 'pro', 'team', 'einzelklausur', 'semester', 'monthly'));

-- Normalize any legacy paid rows onto the new hero tier (no-op at 0 rows).
update public.users
  set plan = 'semester'
  where plan in ('pro', 'team');

-- Quota gate (source of truth). New limit table + access-window lapse:
-- a paid plan whose plan_expires_at is in the past behaves as free. The
-- one-time Einzelklausur never emits a Stripe cancel event, so the lapse is
-- enforced here at read time.
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

  -- Effective plan: lapsed paid access falls back to free limits.
  v_plan := v_user.plan;
  if v_plan <> 'free'
     and v_user.plan_expires_at is not null
     and v_user.plan_expires_at < v_now then
    v_plan := 'free';
  end if;

  -- Pricing v3 limits.
  v_limit := case v_plan
    when 'free'          then 2
    when 'einzelklausur' then 5
    when 'monthly'       then 50
    when 'semester'      then 60
    -- legacy (pre-normalization safety)
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
      'ok', false,
      'reason', 'rate_limit',
      'retry_after_seconds', v_retry_after,
      'used', v_user.packs_used_this_month,
      'limit', v_limit,
      'plan', v_plan
    );
  end if;

  if v_user.packs_used_this_month >= v_limit then
    return json_build_object(
      'ok', false,
      'reason', 'quota_exceeded',
      'used', v_user.packs_used_this_month,
      'limit', v_limit,
      'plan', v_plan
    );
  end if;

  return json_build_object(
    'ok', true,
    'used', v_user.packs_used_this_month,
    'limit', v_limit,
    'plan', v_plan
  );
end;
$$;
