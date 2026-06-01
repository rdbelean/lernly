-- Generic sliding-window rate limiter, used first for magic-link requests
-- (per-IP and per-email) to stop email-enumeration / inbox-spam abuse. The
-- magic-link path uses service.auth.admin.* + Resend, so it bypasses
-- Supabase's built-in auth rate limiter entirely — this fills that gap.
-- Additive + idempotent: safe to re-run.

create table if not exists public.rate_limit_events (
  id         bigint generated always as identity primary key,
  bucket     text not null,        -- e.g. 'magiclink:ip:1.2.3.4' / 'magiclink:email:x@y.de'
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_bucket_time_idx
  on public.rate_limit_events (bucket, created_at desc);

alter table public.rate_limit_events enable row level security;
-- No policies → service-role only.

-- Returns true if the action is ALLOWED (and records it), false if the bucket
-- already has >= p_max events within the trailing p_window_seconds. Also sweeps
-- this bucket's old events opportunistically so the table stays small.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rate_limit_events
    where bucket = p_bucket
      and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
    from public.rate_limit_events
    where bucket = p_bucket
      and created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into public.rate_limit_events (bucket) values (p_bucket);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
