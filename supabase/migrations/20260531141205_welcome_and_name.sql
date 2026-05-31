-- Welcome modal + name capture.
-- Adds a display name and a one-time "has seen welcome modal" flag to the
-- user profile. Both are additive and safe to re-run.

alter table public.users
  add column if not exists name text,
  add column if not exists has_seen_welcome boolean not null default false;

-- Extend the existing signup trigger so OAuth (Google) users get their name
-- prefilled from provider metadata. Magic-link users have no metadata name —
-- they fill it in via the welcome modal. Keeps the existing (id) insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name)
  values (
    new.id,
    nullif(
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        ''
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
