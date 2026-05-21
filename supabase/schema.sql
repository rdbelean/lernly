-- Lernly Supabase schema.
-- Run this once in the Supabase SQL editor (or via the Supabase CLI).
-- Safe to re-run: all statements are idempotent.

-- =========================================================================
-- public.users — profile extension for auth.users
-- =========================================================================
-- We don't replicate identity fields here. auth.users owns id + email.
-- This table only holds app-level profile data (plan + monthly usage).
create table if not exists public.users (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    text not null,
  plan                     text not null default 'free' check (plan in ('free', 'pro', 'team')),
  packs_used_this_month    integer not null default 0,
  created_at               timestamptz not null default now()
);

-- =========================================================================
-- public.study_packs — one row per generated pack
-- =========================================================================
create table if not exists public.study_packs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  exam_type   text not null,
  pack_data   jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists study_packs_user_id_idx on public.study_packs(user_id);
create index if not exists study_packs_created_at_idx on public.study_packs(created_at desc);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.users enable row level security;
alter table public.study_packs enable row level security;

-- Users can read and update only their own profile row.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (auth.uid() = id);

-- Intentionally NO direct UPDATE policy on public.users:
-- - plan / packs_used_this_month / stripe_*  → only via Stripe webhook
--   and security-definer functions (consume + bump usage)
-- - BYOK secrets live in user_secrets (no policy = service role only)
-- This prevents users from privilege-escalating themselves to pro/team.
drop policy if exists users_update_own on public.users;

-- Users can CRUD only their own packs.
drop policy if exists study_packs_select_own on public.study_packs;
create policy study_packs_select_own on public.study_packs
  for select using (auth.uid() = user_id);

drop policy if exists study_packs_insert_own on public.study_packs;
create policy study_packs_insert_own on public.study_packs
  for insert with check (auth.uid() = user_id);

drop policy if exists study_packs_delete_own on public.study_packs;
create policy study_packs_delete_own on public.study_packs
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- Auto-provision public.users on auth signup
-- =========================================================================
-- When a new auth.users row is inserted (via magic link signup etc.),
-- mirror a minimal public.users row. security definer so the trigger
-- can write regardless of the invoking role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Quota + rate-limit columns (Phase 3)
-- =========================================================================
alter table public.users
  add column if not exists last_quota_reset_at timestamptz not null default now();
alter table public.users
  add column if not exists last_pack_at timestamptz;

-- =========================================================================
-- check_pack_quota(): does monthly reset, returns JSON status
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
    v_retry_after := ceil(extract(epoch from (v_gap_seconds || ' seconds')::interval - (v_now - v_user.last_pack_at)))::int;
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

grant execute on function public.check_pack_quota() to authenticated;

-- =========================================================================
-- bump_pack_usage(): increment counter + stamp last_pack_at
-- =========================================================================
create or replace function public.bump_pack_usage()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
    set packs_used_this_month = packs_used_this_month + 1,
        last_pack_at = now()
    where id = auth.uid();
end;
$$;

grant execute on function public.bump_pack_usage() to authenticated;

-- =========================================================================
-- BYOK secrets (Phase 4) — encrypted Anthropic API keys
-- =========================================================================
-- App encrypts with AES-256-GCM (LERNLY_KEY_ENCRYPT_KEY env var) before insert.
-- No RLS policies → only the service role can read/write. Authenticated users
-- go through API routes that decrypt server-side.
create table if not exists public.user_secrets (
  user_id                     uuid primary key references public.users(id) on delete cascade,
  anthropic_key_ciphertext    text,
  anthropic_key_set_at        timestamptz
);

alter table public.user_secrets enable row level security;

-- =========================================================================
-- Stripe billing columns (Phase 5)
-- =========================================================================
alter table public.users
  add column if not exists stripe_customer_id text unique;
alter table public.users
  add column if not exists stripe_subscription_id text;
alter table public.users
  add column if not exists current_period_end timestamptz;

create index if not exists users_stripe_customer_id_idx
  on public.users(stripe_customer_id);

-- =========================================================================
-- Anonymous lead-magnet rate limit (Phase 6)
-- =========================================================================
-- Tracks each anonymous /api/generate invocation by IP so we can enforce a
-- daily cap and protect Lernly's Anthropic bill from anonymous abuse.
-- No RLS policies → only the service role + security-definer functions touch it.
create table if not exists public.anonymous_generations (
  id          uuid primary key default gen_random_uuid(),
  ip_address  text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table public.anonymous_generations enable row level security;

create index if not exists anonymous_generations_ip_created_idx
  on public.anonymous_generations(ip_address, created_at desc);

-- check_anonymous_quota(ip): allow at most one anonymous generation per IP
-- per 24h window. Returns json { ok, reason?, retry_after_seconds? }.
create or replace function public.check_anonymous_quota(p_ip text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_hours int := 24;
  v_last_at timestamptz;
  v_retry_after int;
begin
  if p_ip is null or length(p_ip) = 0 then
    -- Without a reliable IP we cannot enforce; allow but log.
    return json_build_object('ok', true, 'reason', 'no_ip');
  end if;

  select created_at
    into v_last_at
    from public.anonymous_generations
    where ip_address = p_ip
      and created_at > now() - (v_window_hours || ' hours')::interval
    order by created_at desc
    limit 1;

  if v_last_at is not null then
    v_retry_after := ceil(extract(epoch from
      (v_window_hours || ' hours')::interval - (now() - v_last_at)
    ))::int;
    return json_build_object(
      'ok', false,
      'reason', 'anonymous_rate_limit',
      'retry_after_seconds', v_retry_after
    );
  end if;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.check_anonymous_quota(text) to anon, authenticated;

-- bump_anonymous_usage(ip, user_agent): record one successful anonymous gen.
create or replace function public.bump_anonymous_usage(p_ip text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ip is null or length(p_ip) = 0 then
    return;
  end if;
  insert into public.anonymous_generations(ip_address, user_agent)
    values (p_ip, p_user_agent);
end;
$$;

grant execute on function public.bump_anonymous_usage(text, text) to anon, authenticated;
-- list_pack_summaries(): one cheap call returning everything the dashboard
-- needs (id, title, exam_type, created_at, card_count) without shipping the
-- entire 60-100 KB pack_data per row.
create or replace function public.list_pack_summaries()
returns table (
  id          uuid,
  title       text,
  exam_type   text,
  created_at  timestamptz,
  card_count  int
)
language sql
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.title,
    sp.exam_type,
    sp.created_at,
    coalesce(jsonb_array_length(sp.pack_data->'flashcards'), 0)::int as card_count
  from public.study_packs sp
  where sp.user_id = auth.uid()
  order by sp.created_at desc;
$$;

grant execute on function public.list_pack_summaries() to authenticated;
-- =========================================================================
-- Pack credits (Phase 7) — one-time pack purchases independent of monthly quota
-- =========================================================================
-- Each row = one unconsumed pack credit. We don't decrement quantity in place;
-- we mark consumed_at on the oldest non-expired row when a pack is generated.
-- This gives us an audit trail + simple atomic consumption.
create table if not exists public.pack_credits (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  kind                text not null check (kind in ('sprint','payg','pro_topup')),
  stripe_session_id   text,
  expires_at          timestamptz,                          -- null = no expiry
  consumed_at         timestamptz,                          -- null = still available
  created_at          timestamptz not null default now()
);

alter table public.pack_credits enable row level security;

-- Users can see their own credits (for the dashboard display).
drop policy if exists pack_credits_select_own on public.pack_credits;
create policy pack_credits_select_own on public.pack_credits
  for select using (auth.uid() = user_id);

-- No INSERT/UPDATE policies: only the Stripe webhook (service role) inserts;
-- only consume_pack_credit (security definer) updates.

create index if not exists pack_credits_user_available_idx
  on public.pack_credits (user_id, expires_at, created_at)
  where consumed_at is null;

-- =========================================================================
-- available_pack_credits(user) — returns count of usable credits for a user
-- =========================================================================
create or replace function public.available_pack_credits()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.pack_credits
  where user_id = auth.uid()
    and consumed_at is null
    and (expires_at is null or expires_at > now());
$$;

grant execute on function public.available_pack_credits() to authenticated;

-- =========================================================================
-- consume_pack_credit() — atomically marks one credit consumed
-- =========================================================================
-- Picks the oldest non-expired non-consumed credit and marks it consumed.
-- Returns the kind that was consumed (so the API can report it), or null if
-- no credit was available.
create or replace function public.consume_pack_credit()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit record;
begin
  -- FOR UPDATE SKIP LOCKED so concurrent calls don't race on the same row.
  select id, kind
    into v_credit
    from public.pack_credits
    where user_id = auth.uid()
      and consumed_at is null
      and (expires_at is null or expires_at > now())
    order by
      -- expiring credits first (sprint expires in 7d), then oldest
      (expires_at is null) asc,
      expires_at asc,
      created_at asc
    limit 1
    for update skip locked;

  if not found then
    return null;
  end if;

  update public.pack_credits
    set consumed_at = now()
    where id = v_credit.id;

  return v_credit.kind;
end;
$$;

grant execute on function public.consume_pack_credit() to authenticated;
