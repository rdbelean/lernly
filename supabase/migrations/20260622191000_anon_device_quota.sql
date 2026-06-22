-- =========================================================================
-- Device-scoped anonymous trial quota (TikTok-gate)
-- =========================================================================
-- The old quota was keyed on IP (1/IP/24h), so co-located visitors (campus /
-- dorm / carrier NAT) collided on one quota. Re-key the per-user quota on a
-- device cookie (lernly_did) and keep a generous IP ceiling as the abuse
-- backstop. ADDITIVE: new column + NEW function overloads (by arity); the old
-- check_anonymous_quota(text) / bump_anonymous_usage(text,text) stay so the
-- currently-deployed code keeps working. Apply BEFORE merging the new code.
-- =========================================================================

alter table public.anonymous_generations
  add column if not exists device_id text;

create index if not exists anonymous_generations_device_created_idx
  on public.anonymous_generations(device_id, created_at desc);

-- New 2-arg check: device limit first (the per-user key), then the IP ceiling.
create or replace function public.check_anonymous_quota(p_device_id text, p_ip text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_hours int := 24;
  v_device_limit int := 1;   -- free packs per device / window
  v_ip_ceiling   int := 50;  -- abuse backstop per IP / window
  v_device_count int;
  v_ip_count int;
  v_oldest timestamptz;
  v_retry_after int;
begin
  -- Device quota (per honest user). A blank device id can't be device-limited,
  -- so it falls through to the IP ceiling only.
  if p_device_id is not null and length(p_device_id) > 0 then
    select count(*) into v_device_count
      from public.anonymous_generations
      where device_id = p_device_id
        and created_at > now() - (v_window_hours || ' hours')::interval;
    if v_device_count >= v_device_limit then
      select min(created_at) into v_oldest
        from public.anonymous_generations
        where device_id = p_device_id
          and created_at > now() - (v_window_hours || ' hours')::interval;
      v_retry_after := ceil(extract(epoch from
        (v_window_hours || ' hours')::interval - (now() - v_oldest)))::int;
      return json_build_object(
        'ok', false, 'reason', 'anon_device_limit',
        'retry_after_seconds', v_retry_after
      );
    end if;
  end if;

  -- IP ceiling (abuse backstop, independent of device).
  if p_ip is not null and length(p_ip) > 0 then
    select count(*) into v_ip_count
      from public.anonymous_generations
      where ip_address = p_ip
        and created_at > now() - (v_window_hours || ' hours')::interval;
    if v_ip_count >= v_ip_ceiling then
      return json_build_object(
        'ok', false, 'reason', 'anon_ip_ceiling',
        'retry_after_seconds', 3600
      );
    end if;
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.check_anonymous_quota(text, text) from public;
grant execute on function public.check_anonymous_quota(text, text) to anon, authenticated;

-- New 3-arg bump: records device_id alongside ip + user agent.
create or replace function public.bump_anonymous_usage(
  p_device_id text, p_ip text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.anonymous_generations(device_id, ip_address, user_agent)
    values (p_device_id, coalesce(p_ip, ''), p_user_agent);
end;
$$;

revoke all on function public.bump_anonymous_usage(text, text, text) from public;
grant execute on function public.bump_anonymous_usage(text, text, text) to anon, authenticated;
