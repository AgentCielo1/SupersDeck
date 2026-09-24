-- =============================================================================
-- SupersDeck — BIN/BBL backfill for the Forest Hills co-op campus
-- =============================================================================
-- Researched 2026-09-24. All three buildings sit on ONE tax lot:
--   BBL 4021590002  (Queens · block 2159 · lot 2)
-- BBL verified by two independent sources (openigloo building pages, NYCHA
-- Real Talk lot page); the per-building BIN mapping comes from openigloo's
-- per-address pages (single source — spot-check against DOB BIS if in doubt):
--   62-27 108th Street  → BIN 4432109
--   108-53 62nd Drive   → BIN 4432113
--   110-01 62nd Drive   → BIN 4432110
-- The Forest Hills MHA building-info page confirms these are the right
-- buildings (unit mix matches the app's line map exactly).
--
-- OATH/ECB lookups key on BBL; DOB datasets key on BIN. Run in the Supabase
-- SQL editor. Idempotent.
-- =============================================================================

begin;

update buildings set bin = '4432109', bbl = '4021590002'
 where address like '62-27 108th Street%';

update buildings set bin = '4432113', bbl = '4021590002'
 where address like '108-53 62nd Drive%';

update buildings set bin = '4432110', bbl = '4021590002'
 where address like '110-01 62nd Drive%';

commit;

-- ------------------------------- verify --------------------------------------
select name, address, bin, bbl from buildings order by name;
-- Expect: all three rows carry a BIN and the shared BBL 4021590002; any row
-- with an empty bin/bbl was not matched — fix its address or set it by id.
