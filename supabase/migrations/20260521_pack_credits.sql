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
