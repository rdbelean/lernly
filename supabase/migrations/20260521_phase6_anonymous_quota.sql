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
