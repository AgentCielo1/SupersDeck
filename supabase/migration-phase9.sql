-- =============================================================================
-- Phase 9 migration — leases, Certificate of Occupancy, rent status
-- =============================================================================
-- Run this in Supabase → SQL Editor → New query. Idempotent — safe to re-run.
--
-- What it adds:
--
--   buildings:
--     co_number       — DOB Certificate of Occupancy number (e.g. "340065392").
--     co_issued_at    — date the CO was issued.
--     co_expires_at   — date the current Temporary CO expires; NULL means the
--                       building has a permanent CO (no expiration).
--
--   units:
--     lease_start     — start date of the current lease.
--     lease_end       — end date of the current lease (renewal trigger).
--     rent_status     — 'stabilized' | 'controlled' | 'market' | 'section8'
--                     | 'pact' | NULL (unknown). Constraint enforces the set.
--
-- The /leases page surfaces units whose lease_end is within 90 days plus any
-- TCO expiring within 60 days. Both lists are renewal triggers — leaving
-- them past their dates is a real exposure (tenant holdovers, DOB
-- violations).
-- =============================================================================

alter table buildings
  add column if not exists co_number     text,
  add column if not exists co_issued_at  date,
  add column if not exists co_expires_at date;

alter table units
  add column if not exists lease_start date,
  add column if not exists lease_end   date,
  add column if not exists rent_status text;

-- Constrain rent_status to known values. Use NOT VALID + manual re-check so
-- existing rows (all NULL) don't fail re-runs.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'units_rent_status_check'
  ) then
    alter table units
      add constraint units_rent_status_check
      check (rent_status in (
        'stabilized', 'controlled', 'market', 'section8', 'pact'
      ));
  end if;
end$$;

create index if not exists idx_units_lease_end on units (lease_end);
create index if not exists idx_buildings_co_expires on buildings (co_expires_at);
