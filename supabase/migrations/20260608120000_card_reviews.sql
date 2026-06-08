-- =========================================================================
-- card_reviews — per-(user,pack,card) spaced-repetition state (SM-2-lite)
-- =========================================================================
-- One row per flashcard a user has rated at least once. Upserted on every
-- 3-stage rating (Nochmal/Fast/Kann ich) via recordCardReview(). due_at
-- drives the global "X Karten fällig" review queue; interval_days drives the
-- per-pack Mastery-%. card_id matches an id inside study_packs.pack_data ->
-- flashcards[].id (stable, model-generated). Card ids are unique only WITHIN
-- a pack, so (user_id, pack_id, card_id) is the identity key.
--
-- Purely additive + backward-compatible: nothing in the currently-deployed
-- code reads this table or the new users columns, so it is safe to apply
-- ahead of the SRS code shipping.
-- =========================================================================

create table if not exists public.card_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  pack_id        uuid not null references public.study_packs(id) on delete cascade,
  card_id        text not null,
  ease           real not null default 2.5,
  interval_days  real not null default 0,
  due_at         timestamptz not null default now(),
  reps           int  not null default 0,
  last_rated_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, pack_id, card_id)
);

alter table public.card_reviews enable row level security;

drop policy if exists card_reviews_select_own on public.card_reviews;
create policy card_reviews_select_own on public.card_reviews
  for select using (auth.uid() = user_id);

drop policy if exists card_reviews_insert_own on public.card_reviews;
create policy card_reviews_insert_own on public.card_reviews
  for insert with check (auth.uid() = user_id);

-- UPDATE policy is required: recordCardReview upserts (onConflict updates the
-- existing row on every subsequent rating). Without it the second rating of a
-- card would be silently rejected by RLS.
drop policy if exists card_reviews_update_own on public.card_reviews;
create policy card_reviews_update_own on public.card_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No DELETE policy in V1 — rows die only via FK cascade on pack/user delete.

-- Due-queue scan: "all my cards due now", ordered by due_at.
create index if not exists card_reviews_due_idx
  on public.card_reviews (user_id, due_at);

-- Per-pack mastery aggregate.
create index if not exists card_reviews_pack_idx
  on public.card_reviews (user_id, pack_id);

-- =========================================================================
-- Study streak (Europe/Berlin date computed in app code). Additive columns
-- on users — bumped by recordCardReview on the first rating of each new day.
-- =========================================================================
alter table public.users add column if not exists srs_streak int not null default 0;
alter table public.users add column if not exists srs_last_review_date date;
