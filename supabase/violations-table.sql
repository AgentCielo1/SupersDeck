-- =============================================================================
-- SupersDeck — Phase 5 violations table
-- =============================================================================
-- Persists HPD violations pulled from NYC Open Data (data.cityofnewyork.us
-- · wvxf-dwi5). Lets the dashboard count violations without hitting the
-- external API on every page load, and lets us flag *new* violations that
-- appeared since last sync.
--
-- Run AFTER schema.sql + role-policies.sql.
-- =============================================================================

create table if not exists violations (
  id                  text primary key,            -- HPD violationid
  building_id         text references buildings(id) on delete cascade,
  class               text,                        -- A / B / C / I
  status              text,                        -- currentstatus
  description         text,                        -- novdescription
  apartment           text,
  story               text,
  nov_issued_date     date,
  current_status_date date,
  approved_date       date,
  raw                 jsonb,                       -- full NYC Open Data row
  first_seen_at       timestamptz not null default now(),
  fetched_at          timestamptz not null default now()
);

create index if not exists idx_violations_building on violations (building_id);
create index if not exists idx_violations_status on violations (status);
create index if not exists idx_violations_issued on violations (nov_issued_date desc);

-- Track when we last synced each building so the UI can show "synced 12
-- minutes ago" and the cron can skip buildings synced very recently.
create table if not exists violations_sync (
  building_id   text primary key references buildings(id) on delete cascade,
  last_synced_at timestamptz not null default now(),
  rows_fetched  integer not null default 0,
  rows_new      integer not null default 0
);

-- Per-role policies (matches the pattern in role-policies.sql)
alter table violations enable row level security;
alter table violations_sync enable row level security;

create policy "violations: auth select"
  on violations for select to authenticated using (true);
create policy "violations_sync: auth select"
  on violations_sync for select to authenticated using (true);

-- Writes happen via the service-role key (cron / refresh endpoint), so no
-- per-user write policy needed.
