-- Global concurrency cap for /api/generate (Anthropic Tier-2 protection).
-- A serverless process can't hold an in-memory counter shared across Vercel
-- instances, so the slot count lives in the DB. acquire_generation_slot()
-- atomically reserves a slot iff fewer than p_max are currently held; slots
-- self-expire after a TTL so a crashed request can't leak a slot forever.
-- Additive + idempotent: safe to re-run.

create table if not exists public.generation_slots (
  id          uuid primary key default gen_random_uuid(),
  acquired_at timestamptz not null default now()
);

-- RLS on, no policies → only the service role (which bypasses RLS) can touch
-- it. The RPCs below are SECURITY DEFINER so they run as owner regardless.
alter table public.generation_slots enable row level security;

-- Reserve a slot. Sweeps expired slots first (TTL), then inserts a new slot
-- only if the live count is under p_max. Returns true on success, false when
-- the cap is full. p_ttl_seconds must comfortably exceed the request budget
-- (generate maxDuration = 800s) so an in-flight request never expires early.
create or replace function public.acquire_generation_slot(
  p_max integer,
  p_ttl_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live integer;
begin
  delete from public.generation_slots
    where acquired_at < now() - make_interval(secs => p_ttl_seconds);

  select count(*) into v_live from public.generation_slots;
  if v_live >= p_max then
    return false;
  end if;

  insert into public.generation_slots default values;
  return true;
end;
$$;

-- Release the oldest slot. We don't track per-request ids on purpose: a plain
-- "free one slot" keeps the route code trivial and is self-correcting with the
-- TTL sweep. Never goes negative (delete of 0 rows is a no-op).
create or replace function public.release_generation_slot()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.generation_slots
    where id = (
      select id from public.generation_slots
        order by acquired_at asc
        limit 1
    );
end;
$$;

-- Callable by the server only (service role / postgres). Not exposed to
-- anon/authenticated PostgREST clients.
revoke all on function public.acquire_generation_slot(integer, integer) from public, anon, authenticated;
revoke all on function public.release_generation_slot() from public, anon, authenticated;
