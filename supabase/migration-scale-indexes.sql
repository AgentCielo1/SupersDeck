-- =============================================================================
-- SupersDeck — indexes required at real client scale
-- =============================================================================
-- Found 2026-08-09 by seeding 100,000 units / 80,000 work orders
-- (scripts/seed-scale.mjs). See master-build/SCALE-FINDINGS.md.
--
-- F1: `select * from work_orders order by reported_at desc` had no supporting
--     index. At 80,000 rows Postgres switched to
--         Sort Method: external merge  Disk: 6272kB
--     i.e. it ran out of work_mem and spilled the sort to disk. At Forest Hills'
--     current volume (a few hundred WOs) it sorts in memory and looks fine, which
--     is exactly why this went unnoticed.
--
--     With this index + LIMIT 50: Index Scan, 0.193 ms.
--
-- ⚠️ This index alone does NOT fix the 12 MB payload the page pulls into Node —
--    that needs pagination in db.ts (F2, still open). The index makes the
--    ordering cheap; it cannot make an unbounded result set small.
--
-- Safe to run on production: CREATE INDEX CONCURRENTLY takes no write lock.
-- Idempotent.
--
-- ⚠️ RUN LAST. `CREATE INDEX CONCURRENTLY` cannot run inside a transaction or a
--    DO block, so the statements below cannot be guarded with an
--    "if the table exists" check. Run this file AFTER every table-creating
--    migration (violations-table.sql in particular). A `relation "..." does not
--    exist` error here means this file ran out of order — the other indexes will
--    still have been created, so just re-run it once the table is present.
-- =============================================================================

-- CONCURRENTLY cannot run inside a transaction block — do not wrap this file.
create index concurrently if not exists idx_wo_reported_at
  on work_orders (reported_at desc);

-- The dashboard filters open work orders per building; this composite serves
-- both that and the per-building listing.
create index concurrently if not exists idx_wo_building_reported
  on work_orders (building_id, reported_at desc);

-- Violations are listed newest-first per building by the /violations page.
create index concurrently if not exists idx_violations_building_issued
  on violations (building_id, nov_issued_date desc);

-- Units are listed per building constantly (every building page).
create index concurrently if not exists idx_units_building
  on units (building_id);
