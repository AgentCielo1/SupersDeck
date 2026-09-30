-- =============================================================================
-- SupersDeck — link work orders to the HPD violations they remediate
-- =============================================================================
-- The "+ Create WO" action on /violations opens a prefilled work order and
-- stamps it with the violation it came from. This column is that link: the
-- violations page reads it back to show which violations already have a
-- ticket, so the 57-Class-C wall reads as a work queue instead of a wall.
--
-- Plain nullable text (HPD violationid), no FK — violations live in NYC's
-- dataset, not ours; the synced `violations` table is a cache that can lag.
-- RLS is unchanged: the column rides work_orders' existing policies.
--
-- Run in the Supabase SQL editor. Idempotent.
-- =============================================================================

alter table work_orders
  add column if not exists source_violation_id text;

create index if not exists idx_wo_source_violation
  on work_orders (source_violation_id)
  where source_violation_id is not null;

-- ------------------------------- verify --------------------------------------
--   select column_name from information_schema.columns
--    where table_name = 'work_orders' and column_name = 'source_violation_id';
-- Then create a WO from a violation on /violations — its row shows the WO chip.
