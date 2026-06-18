-- Idempotency ledger for the Stripe webhook.
--
-- The webhook can fire the same event more than once (Stripe retries on any
-- non-2xx, network blips, or at-least-once delivery). Provisioning a guest
-- account + granting a plan must NOT happen twice for one payment, so we record
-- each handled Stripe event id and skip events we've already processed.
--
-- Additive + fully backward-compatible: the currently-deployed webhook does not
-- read or write this table, so applying it to the shared DB changes no live
-- behaviour. Service-role only (the webhook uses the service client); RLS is on
-- with no policies so anon/authenticated clients can't touch it.
create table if not exists public.processed_stripe_events (
  event_id     text primary key,
  type         text,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
