-- =============================================================================
-- DISABLE Row Level Security (dev / single-user mode only)
-- =============================================================================
-- Supabase enables RLS by default on new tables. With RLS on and no policies
-- attached, the `anon` role can't see or modify anything — which makes the
-- whole app look empty even though the rows are in Postgres.
--
-- For phase 1-3 (single super, no auth) we just disable RLS so the app's
-- anon-keyed reads and service-role-keyed writes both work.
--
-- For phase 4 (auth + multi-user roles), re-enable RLS and add proper
-- policies per role (super, porter, manager, read-only). Sample policy:
--
--   alter table buildings enable row level security;
--   create policy "super reads own buildings"
--     on buildings for select to authenticated
--     using (auth.uid() in (select user_id from building_supers where building_id = buildings.id));
--
-- Run this file once, after schema.sql and seed.sql.
-- =============================================================================

alter table buildings                disable row level security;
alter table units                    disable row level security;
alter table compliance_templates     disable row level security;
alter table compliance_items         disable row level security;
alter table vendor_categories        disable row level security;
alter table vendor_discovery_sources disable row level security;
alter table vendors                  disable row level security;
alter table work_orders              disable row level security;
alter table work_order_updates       disable row level security;
alter table heat_logs                disable row level security;
alter table certifications           disable row level security;
