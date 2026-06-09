-- =============================================================================
-- SupersDeck — Supabase Postgres schema
-- =============================================================================
-- Run this in Supabase → SQL Editor → New query (or via psql) on a brand-new
-- project. Then run seed.sql to populate reference data + sample buildings.
--
-- Entity tables use TEXT primary keys so the same IDs work in both DB mode
-- and the bundled-seed fallback. The app generates IDs (slugs / short uuids).
-- =============================================================================

-- ----------------------------- Buildings & units --------------------------
create table if not exists buildings (
  id                  text primary key,
  name                text not null,
  address             text not null,
  borough             text not null check (borough in ('Manhattan','Brooklyn','Queens','Bronx','Staten Island')),
  year_built          integer,
  num_units           integer not null,
  num_floors          integer not null,
  bin                 text,
  bbl                 text,
  hpd_id              text,
  community_district  text,
  has_section8        boolean not null default false,
  is_pact_rad         boolean not null default false,
  has_oil_heat        boolean not null default false,
  has_cooling_tower   boolean not null default false,
  has_sprinkler       boolean not null default true,
  has_known_lead      boolean not null default false,
  heat_notes          text,
  square_footage      integer,
  created_at          timestamptz not null default now()
);

create table if not exists units (
  id                       text primary key,
  building_id              text not null references buildings(id) on delete cascade,
  label                    text not null,
  line                     text,
  floor                    integer,
  bedrooms                 integer,
  bathrooms                integer,
  occupied                 boolean not null default false,
  tenant_name              text,
  tenant_phone             text,
  is_section8              boolean not null default false,
  has_children_under_6     boolean not null default false,
  has_children_under_11    boolean not null default false,
  lead_xrf_completed       date,
  notes                    text,
  created_at               timestamptz not null default now(),
  unique (building_id, label)
);
create index if not exists idx_units_building on units (building_id);

-- ----------------------------- Compliance ---------------------------------
create table if not exists compliance_templates (
  id                      text primary key,
  name                    text not null,
  category                text not null,
  description             text,
  statute                 text,
  agency                  text,
  frequency               text not null,
  due_window              text,
  vendor_type_required    text,
  portal_url              text,
  applies_when            text,
  consequence             text
);

create table if not exists compliance_items (
  id              text primary key,
  building_id     text not null references buildings(id) on delete cascade,
  template_id     text not null references compliance_templates(id),
  status          text not null default 'ok',
  last_completed  date,
  next_due        date not null,
  vendor_id       text,
  notes           text,
  attachments     jsonb default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  unique (building_id, template_id)
);
create index if not exists idx_compliance_due on compliance_items (next_due);
create index if not exists idx_compliance_status on compliance_items (status);

-- ----------------------------- Vendors ------------------------------------
create table if not exists vendor_categories (
  id           text primary key,
  parent_id    text references vendor_categories(id),
  name         text not null,
  icon         text not null,
  description  text
);

create table if not exists vendor_discovery_sources (
  id           text primary key,
  name         text not null,
  url          text not null,
  agency       text not null,
  description  text,
  covers       text[]
);

create table if not exists vendors (
  id                text primary key,
  name              text not null,
  category_id       text not null references vendor_categories(id),
  contact_name      text,
  phone             text,
  email             text,
  address           text,
  license_type      text,
  license_number    text,
  license_expires   date,
  in_my_vendors     boolean not null default true,
  last_used_at      timestamptz,
  notes             text,
  rating            integer check (rating between 1 and 5),
  created_at        timestamptz not null default now()
);
create index if not exists idx_vendors_category on vendors (category_id);
create index if not exists idx_vendors_my on vendors (in_my_vendors);

alter table compliance_items
  add constraint compliance_items_vendor_fk
  foreign key (vendor_id) references vendors(id) on delete set null;

-- ----------------------------- Work orders --------------------------------
create table if not exists work_orders (
  id                       text primary key,
  building_id              text not null references buildings(id),
  unit_id                  text references units(id),
  ticket_number            text not null unique,
  title                    text not null,
  description              text,
  category                 text not null,
  priority                 text not null,
  status                   text not null default 'new',
  reporter_name            text not null,
  reporter_phone           text,
  reporter_email           text,
  reported_at              timestamptz not null default now(),
  due_at                   timestamptz,
  assigned_to              text,
  resolved_at              timestamptz,
  photos                   jsonb default '[]'::jsonb,
  internal_notes           text,
  hpd_risk                 boolean not null default false,
  -- Tenant signs on the handyman's phone when work is done. Replaces SMS.
  completion_signature     text,       -- base64 data URL of signature PNG
  signed_by_name           text,
  signed_at                timestamptz
);
create index if not exists idx_wo_building on work_orders (building_id);
create index if not exists idx_wo_status on work_orders (status);
create index if not exists idx_wo_priority on work_orders (priority);

create table if not exists work_order_updates (
  id              text primary key,
  work_order_id   text not null references work_orders(id) on delete cascade,
  message         text not null,
  author          text not null,
  photos          jsonb default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

-- ----------------------------- Heat & hot water log -----------------------
create table if not exists heat_logs (
  id                  text primary key,
  building_id         text not null references buildings(id) on delete cascade,
  unit_id             text references units(id),
  recorded_at         timestamptz not null default now(),
  indoor_temp_f       numeric(4,1) not null,
  outdoor_temp_f      numeric(4,1),
  hot_water_temp_f    numeric(4,1),
  source              text not null default 'manual',
  notes               text
);
create index if not exists idx_heat_building_time on heat_logs (building_id, recorded_at);

-- ----------------------------- Staff certifications -----------------------
create table if not exists certifications (
  id           text primary key,
  holder_name  text not null,
  type         text not null,
  number       text not null,
  issued_at    date,
  expires_at   date not null,
  agency       text,
  notes        text
);
create index if not exists idx_certs_expiry on certifications (expires_at);

-- ----------------------------- Row Level Security stubs -------------------
-- IMPORTANT: Supabase enables RLS by default on tables created via its UI.
-- Tables created here via raw SQL also inherit it on some Supabase versions.
-- After running this schema, ALSO run `supabase/disable-rls-for-dev.sql`
-- to allow the app's anon-keyed reads. When auth lands in phase 4, replace
-- the disable with real per-role policies.
-- alter table buildings enable row level security;
-- alter table units enable row level security;
-- alter table compliance_items enable row level security;
-- alter table work_orders enable row level security;
-- ... etc.
