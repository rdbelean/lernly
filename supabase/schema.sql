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

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (auth.uid() = id);

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
