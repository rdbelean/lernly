-- Welcome modal + name capture.
-- Adds a display name and a one-time "has seen welcome modal" flag to the
-- user profile. Both are additive and safe to re-run.

alter table public.users
  add column if not exists name text,
  add column if not exists has_seen_welcome boolean not null default false;

-- Extend the existing signup trigger so OAuth (Google) users get their name
-- prefilled from provider metadata. Magic-link users have no metadata name —
-- they fill it in via the welcome modal.
--
-- IMPORTANT: public.users.email is NOT NULL with no default, so the INSERT
-- MUST keep populating email from new.email (as the original trigger did).
-- Dropping it would abort every signup transaction. We only ADD name here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
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
