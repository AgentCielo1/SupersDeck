-- =============================================================================
-- SupersDeck — Contractor logbook (GateLog) migration
-- =============================================================================
-- Adds the contractor sign-in / compliance layer:
--   contractors                — individuals (optionally tied to a vendor company)
--   compliance_documents       — COIs, licenses, W-9s, inductions (+ expiry)
--   contractor_visits          — sign-in/out events (a visit = a work-order event)
--   contractor_blocked_attempts— audit of gated (uninsured) sign-in attempts
--
-- Conventions match schema.sql: TEXT primary keys (app-generated), timestamptz
-- defaults, `create ... if not exists`. Run AFTER schema.sql + role-policies.sql
-- (it reuses public.get_my_role()). Idempotent.
-- =============================================================================

-- ----------------------------- contractors --------------------------------
create table if not exists contractors (
  id            text primary key,
  company_id    text references vendors(id) on delete set null,
  full_name     text not null,
  phone         text,
  email         text,
  photo_url     text,
  returning     boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_contractors_company on contractors (company_id);

-- ----------------------------- compliance_documents -----------------------
-- The compliance layer. Attached to a company (vendor) and/or an individual.
create table if not exists compliance_documents (
  id                 text primary key,
  company_id         text references vendors(id) on delete cascade,
  contractor_id      text references contractors(id) on delete cascade,
  doc_type           text not null check (doc_type in (
                       'gl_coi','workers_comp','disability',
                       'dcwp_hic','trade_license','w9','induction_cert')),
  carrier            text,
  policy_number      text,
  gl_per_occurrence  numeric,   -- NYC: $1M floor
  gl_aggregate       numeric,   -- NYC: commonly $2M — store BOTH
  issuing_agency     text,      -- 'DOB' | 'DCWP' | carrier
  effective_date     date,
  expiry_date        date,
  additional_insured boolean not null default false,
  exemption_type     text,      -- e.g. 'CE-200' no-employees disability waiver
  file_url           text,
  verified_by        text,
  verified_at        timestamptz,
  created_at         timestamptz not null default now(),
  check (company_id is not null or contractor_id is not null)
);
create index if not exists idx_compdocs_company on compliance_documents (company_id);
create index if not exists idx_compdocs_contractor on compliance_documents (contractor_id);
create index if not exists idx_compdocs_expiry on compliance_documents (expiry_date);

-- ----------------------------- contractor_visits --------------------------
-- The sign-in layer. work_order_id is the property-management-native edge.
create table if not exists contractor_visits (
  id                        text primary key,
  contractor_id             text references contractors(id) on delete set null,
  inline_name               text,  -- quick/simple sign-in without a saved contractor
  company_id                text references vendors(id) on delete set null,
  building_id               text not null references buildings(id) on delete cascade,
  unit_id                   text references units(id) on delete set null,
  work_order_id             text references work_orders(id) on delete set null,
  purpose                   text,
  method                    text not null default 'qr'
                              check (method in ('qr','kiosk','phone','staff')),
  sign_in_at                timestamptz not null default now(),
  sign_out_at               timestamptz,
  photo_url                 text,
  signature_ref             text,
  compliance_status_at_entry text,  -- snapshot: compliant|expiring|expired|missing
  created_at                timestamptz not null default now()
);
create index if not exists idx_visits_building on contractor_visits (building_id);
create index if not exists idx_visits_signin on contractor_visits (sign_in_at);
-- fast "who's on site now" lookups
create index if not exists idx_visits_onsite on contractor_visits (building_id)
  where sign_out_at is null;

-- ----------------------------- blocked attempts (audit) -------------------
create table if not exists contractor_blocked_attempts (
  id            text primary key,
  company_id    text references vendors(id) on delete set null,
  inline_name   text,
  building_id   text references buildings(id) on delete cascade,
  reason        text,
  attempted_at  timestamptz not null default now()
);
create index if not exists idx_blocked_at on contractor_blocked_attempts (attempted_at);

-- =============================================================================
-- RLS — mirrors role-policies.sql (admin/super/manager write; porter logs
-- visits; everyone authenticated reads). Public QR sign-in goes through the
-- service-role API (like tenant intake), so no anon insert policy is needed.
-- =============================================================================
alter table contractors                enable row level security;
alter table compliance_documents       enable row level security;
alter table contractor_visits          enable row level security;
alter table contractor_blocked_attempts enable row level security;

-- read: any authenticated user
create policy "cl read contractors"  on contractors                for select using (get_my_role() <> 'anon');
create policy "cl read compdocs"     on compliance_documents       for select using (get_my_role() <> 'anon');
create policy "cl read visits"       on contractor_visits          for select using (get_my_role() <> 'anon');
create policy "cl read blocked"      on contractor_blocked_attempts for select using (get_my_role() <> 'anon');

-- write contractors + compliance docs: admin/super/manager
create policy "cl write contractors" on contractors          for all
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));
create policy "cl write compdocs"    on compliance_documents for all
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));

-- visits: porters can sign people in/out too
create policy "cl insert visits" on contractor_visits for insert
  with check (get_my_role() in ('admin','super','manager','porter'));
create policy "cl update visits" on contractor_visits for update
  using (get_my_role() in ('admin','super','manager','porter'));
create policy "cl delete visits" on contractor_visits for delete
  using (get_my_role() in ('admin','super','manager'));

-- blocked attempts: written by the service-role API; admins/super can also insert
create policy "cl insert blocked" on contractor_blocked_attempts for insert
  with check (get_my_role() in ('admin','super','manager','porter'));

-- =============================================================================
-- Storage: contractor verification photos (private). Public sign-in uploads go
-- through the service-role API (bypasses RLS) — same model as tenant intake —
-- so no anon insert policy. Dashboard reads use short-lived signed URLs.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('contractor-photos', 'contractor-photos', false)
on conflict (id) do nothing;

drop policy if exists "contractor-photos: authenticated read" on storage.objects;
create policy "contractor-photos: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'contractor-photos');
