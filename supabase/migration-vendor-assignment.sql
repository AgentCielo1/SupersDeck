-- =============================================================================
-- Phase 8 migration — vendor assignment on work orders + manager contact
-- =============================================================================
-- Run this in Supabase → SQL Editor → New query. Idempotent — safe to re-run.
--
-- What it adds:
--   1. work_orders.assigned_vendor_id   — FK to vendors(id), nullable.
--      The existing free-text `assigned_to` stays for internal staff
--      (e.g. "Hector (porter)"). The new column is specifically for vendors
--      we have on file so we can render the vendor name + phone in the WO
--      sidebar and (later) email them when assigned.
--   2. buildings.manager_email          — text, nullable.
--      Where the monthly owner report gets sent. One per building so PACT
--      portfolios with split management can route correctly. If null on a
--      building, that building is skipped by the report cron.
--   3. buildings.manager_name           — text, nullable. Cosmetic — shown
--      in the report email greeting ("Hi Lisa, ...").
-- =============================================================================

alter table work_orders
  add column if not exists assigned_vendor_id text references vendors(id) on delete set null;
create index if not exists idx_wo_vendor on work_orders (assigned_vendor_id);

alter table buildings
  add column if not exists manager_email text,
  add column if not exists manager_name  text;
