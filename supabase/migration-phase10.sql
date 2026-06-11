-- =============================================================================
-- Phase 10 migration — legal entity per building + Web Push subscriptions
-- =============================================================================
-- Idempotent. Safe to re-run.
--
-- legal_entity:
--   Per-building label that drives the header on the printable work-order
--   form (e.g. "FOREST HILLS MHA HDFC" vs "FOREST HILLS MHA HSG DEV"). Some
--   portfolios have buildings under different HDFCs/entities; this lets each
--   one print under the right legal name without code changes.
--
-- push_subscriptions:
--   Web Push subscription endpoints for each (user, device) pair. Populated
--   by the client after the user grants notification permission. The
--   /api/cron/* + work-order POST handlers fan out push notifications to
--   every admin/super subscription stored here.
-- =============================================================================

alter table buildings
  add column if not exists legal_entity text;

create table if not exists push_subscriptions (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_push_user on push_subscriptions (user_id);
