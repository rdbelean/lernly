-- =========================================================================
-- Flashcard generation quota ("Mehr Karten generieren") + favorite flag
-- =========================================================================
-- ADDITIVE + backward-compatible with the currently-deployed code:
--   * New nullable/defaulted columns only — old code ignores them.
--   * check_pack_quota is NOT touched (its signature + body stay as-is).
--   * Two NEW functions gate the on-demand "more flashcards" action on a
--     SEPARATE monthly counter, so the pack quota is unaffected.
--   * card_reviews.favorite powers the list-view star; defaults false so
--     existing rows + the running version keep working.
--
-- The "more flashcards" action is a distinct monetization lever from packs:
-- it generates extra cards into an existing pack from the pack's own content.
-- Limits per plan (kept in sync with src/lib/quota.ts CARD_GEN_LIMITS):
--   free 2 · einzelklausur 20 · monthly 100 · semester 150  (per month)
-- =========================================================================

-- Monthly counter + its own reset stamp (independent of the pack counter so
-- check_pack_quota stays untouched).
alter table public.users
  add column if not exists card_gens_used_this_month int not null default 0;
alter table public.users
  add column if not exists card_gens_reset_at timestamptz not null default now();

-- Per-card favorite flag for the flashcard list view. card_reviews is already
-- the per-(user,pack,card) row, so this is the natural home.
alter table public.card_reviews
  add column if not exists favorite boolean not null default false;

-- check_card_gen_quota — gate for the "Mehr Karten" action. Mirrors
-- check_pack_quota's plan + lapse handling, but on card_gens_used_this_month.
-- Returns json { ok, used, limit, plan, reason? }.
create or replace function public.check_card_gen_quota()
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
begin
  select plan, card_gens_used_this_month, card_gens_reset_at, plan_expires_at
    into v_user
    from public.users
    where id = auth.uid()
    for update;

  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_user');
  end if;

  -- Monthly reset on this counter's own stamp.
  if v_user.card_gens_reset_at < v_month_start then
    update public.users
      set card_gens_used_this_month = 0,
          card_gens_reset_at = v_month_start
      where id = auth.uid();
    v_user.card_gens_used_this_month := 0;
  end if;

  -- Effective plan: lapsed paid access falls back to free limits (same rule
  -- check_pack_quota applies).
  v_plan := v_user.plan;
  if v_plan <> 'free'
     and v_user.plan_expires_at is not null
     and v_user.plan_expires_at < v_now then
    v_plan := 'free';
  end if;

  v_limit := case v_plan
    when 'free'          then 2
    when 'einzelklausur' then 20
    when 'monthly'       then 100
    when 'semester'      then 150
    -- legacy (pre-normalization safety)
    when 'pro'           then 150
    when 'team'          then 150
    else 0
  end;

  if v_user.card_gens_used_this_month >= v_limit then
    return json_build_object(
      'ok', false,
      'reason', 'quota_exceeded',
      'used', v_user.card_gens_used_this_month,
      'limit', v_limit,
      'plan', v_plan
    );
  end if;

  return json_build_object(
    'ok', true,
    'used', v_user.card_gens_used_this_month,
    'limit', v_limit,
    'plan', v_plan
  );
end;
$$;

-- bump_card_gen_usage — atomic increment after a successful "more flashcards"
-- run. Self-heals the monthly reset so it's safe even if called without a
-- preceding check.
create or replace function public.bump_card_gen_usage()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start timestamptz := date_trunc('month', now());
begin
  update public.users
    set card_gens_used_this_month =
          case when card_gens_reset_at < v_month_start
               then 1
               else card_gens_used_this_month + 1 end,
        card_gens_reset_at =
          case when card_gens_reset_at < v_month_start
               then v_month_start
               else card_gens_reset_at end
    where id = auth.uid();
end;
$$;

grant execute on function public.check_card_gen_quota() to authenticated;
grant execute on function public.bump_card_gen_usage() to authenticated;
