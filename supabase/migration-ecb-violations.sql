-- =============================================================================
-- SupersDeck — OATH/ECB summonses table (DEP, DOB, FDNY, DSNY, DOHMH, …)
-- =============================================================================
-- Persists OATH Hearings Division case rows (data.cityofnewyork.us ·
-- jz4z-kudi) pulled by /api/violations/refresh. This is the "everything
-- besides HPD" enforcement feed: one summons per row, keyed by OATH ticket
-- number, with the hearing clock and dollar exposure that HPD rows don't have.
--
-- building_id is NULLABLE on purpose: this portfolio is one co-op campus on a
-- single tax lot (BBL 4021590002), and a summons that matches the lot but no
-- known house number is CAMPUS-WIDE — kept visible, never dropped.
-- org_id is set explicitly by the service-role writer (derived from the
-- matched building, or from any campus building for unattributed rows), so
-- the org-isolation RLS pattern still applies to rows with no building.
--
-- Run AFTER schema.sql + role-policies.sql (+ the org-isolation migration if
-- applied — the restrictive policy here mirrors it).
-- =============================================================================

begin;

create table if not exists ecb_violations (
  id                  text primary key,            -- OATH ticket_number
  building_id         text references buildings(id) on delete set null,
  bbl                 text,                        -- lot the row matched on
  org_id              uuid references orgs(id),
  issuing_agency      text,                        -- normalized: DEP/DOB/FDNY/…
  issuing_agency_raw  text,                        -- as published
  charge              text,                        -- charge_1_code_description
  charge_code         text,
  violation_date      date,
  hearing_date        timestamptz,
  hearing_status      text,
  hearing_result      text,
  compliance_status   text,
  penalty_imposed     numeric,
  paid_amount         numeric,
  balance_due         numeric,
  is_open             boolean not null default true,
  is_defaulted        boolean not null default false,
  house               text,                        -- violation_location_house
  street              text,                        -- violation_location_street_name
  raw                 jsonb,
  first_seen_at       timestamptz not null default now(),
  fetched_at          timestamptz not null default now()
);

create index if not exists idx_ecb_building  on ecb_violations (building_id);
create index if not exists idx_ecb_bbl       on ecb_violations (bbl);
create index if not exists idx_ecb_open      on ecb_violations (is_open);
create index if not exists idx_ecb_agency    on ecb_violations (issuing_agency);
create index if not exists idx_ecb_hearing   on ecb_violations (hearing_date desc);
create index if not exists idx_ecb_org       on ecb_violations (org_id);

-- One OATH query serves a whole lot, so sync state is per-BBL, not per-building.
create table if not exists ecb_sync (
  bbl            text primary key,
  last_synced_at timestamptz not null default now(),
  rows_fetched   integer not null default 0,
  rows_new       integer not null default 0
);

alter table ecb_violations enable row level security;
alter table ecb_violations force row level security;
alter table ecb_sync enable row level security;
alter table ecb_sync force row level security;

-- Reads: org fence, same shape as the org-isolation migration's policies.
drop policy if exists "ecb: org select" on ecb_violations;
create policy "ecb: org select"
  on ecb_violations for select to authenticated
  using (org_id is not distinct from public.get_my_org()
         and public.get_my_org() is not null);

-- Restrictive belt on all commands, mirroring "org isolation" elsewhere.
drop policy if exists "ecb: org isolation" on ecb_violations;
create policy "ecb: org isolation"
  on ecb_violations as restrictive for all to authenticated
  using (org_id is not distinct from public.get_my_org()
         and public.get_my_org() is not null)
  with check (org_id is not distinct from public.get_my_org()
         and public.get_my_org() is not null);

-- Sync table has no org column (it is keyed by lot, one org per deployment
-- today); readable by any signed-in user, written only by service role.
drop policy if exists "ecb_sync: auth select" on ecb_sync;
create policy "ecb_sync: auth select"
  on ecb_sync for select to authenticated using (true);

-- Writes happen via the service-role key (cron / refresh endpoint), which
-- bypasses RLS — no per-user write policy needed, matching `violations`.

commit;

-- ------------------------------- verify --------------------------------------
--  After the first refresh runs:
--    select issuing_agency, count(*) filter (where is_open) as open, count(*)
--      from ecb_violations group by 1 order by 2 desc;
--    select * from ecb_sync;
--  Positive/negative RLS check (as in the house rule): an admin session sees
--  rows; a session with no org sees none.
