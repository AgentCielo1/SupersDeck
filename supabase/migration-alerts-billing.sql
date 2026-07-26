-- =============================================================================
-- SupersDeck — Emergency Notifications + Stripe Billing + Multi-tenancy
-- =============================================================================
-- Run this ONCE on a project that already has schema.sql + auth-setup.sql +
-- role-policies.sql applied. It is idempotent and PRODUCTION-SAFE:
--
--   • Introduces a real `orgs` table (the tenancy root) WITHOUT breaking the
--     existing single-tenant deployment. Existing buildings + profiles are
--     backfilled into one "default org" so every current query keeps working,
--     and new rows inherit that org by default. Multi-org is now possible.
--   • Adds the tiered alert tables (alerts, alert_acknowledgments) +
--     SMS delivery log + Stripe billing-event ledger (webhook idempotency).
--   • Adds notification-consent columns to profiles (push/SMS + phone).
--   • RLS on every new table follows the existing get_my_role() pattern and
--     adds org isolation via a new get_my_org() helper.
--
-- IDs: entity tables in this app use TEXT primary keys; orgs/alerts use UUIDs.
-- =============================================================================

-- A fixed UUID for the seed "default org" so backfill + column defaults agree.
-- (Inlined below as a literal because column DEFAULTs can't reference a CTE.)
--   default org id = 00000000-0000-0000-0000-000000000001

-- ----------------------------- orgs (tenancy root) -------------------------
create table if not exists orgs (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  -- Billing lifecycle, driven by the Stripe webhook.
  subscription_status    text not null default 'free'
                         check (subscription_status in ('free','active','past_due','cancelled')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now()
);

-- Seed the default org. 'active' so the existing live deployment is never
-- gated by the new billing middleware on day one.
insert into orgs (id, name, subscription_status)
values ('00000000-0000-0000-0000-000000000001', 'SupersDeck', 'active')
on conflict (id) do nothing;

-- ----------------------------- attach org_id to existing tables -------------
-- Additive + backfilled. New rows default into the seed org so a single-tenant
-- deployment Just Works; a true multi-tenant deployment overrides org_id on
-- insert.
alter table buildings add column if not exists org_id uuid references orgs(id);
alter table profiles  add column if not exists org_id uuid references orgs(id);

update buildings set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update profiles  set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;

alter table buildings alter column org_id set default '00000000-0000-0000-0000-000000000001';
alter table profiles  alter column org_id set default '00000000-0000-0000-0000-000000000001';

create index if not exists idx_buildings_org on buildings (org_id);
create index if not exists idx_profiles_org  on profiles (org_id);

-- ----------------------------- notification consent ------------------------
alter table profiles add column if not exists push_consent boolean default false;
alter table profiles add column if not exists sms_consent boolean default false;
alter table profiles add column if not exists notification_consented_at timestamptz;
alter table profiles add column if not exists phone_number text;

-- ----------------------------- helper: get_my_org() ------------------------
create or replace function public.get_my_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.get_my_org() to authenticated;

-- ----------------------------- alerts --------------------------------------
-- NOTE: building_ids / unit_ids are TEXT[] (not UUID[]) because buildings.id
-- and units.id are TEXT in this schema.
create table if not exists alerts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  created_by    uuid references profiles(id),
  org_id        uuid not null references orgs(id)
                default '00000000-0000-0000-0000-000000000001',
  tier          text not null check (tier in ('routine','urgent','emergency')),
  title         text not null,
  message       text not null,
  building_ids  text[] not null,
  unit_ids      text[],
  -- Channels actually fired for this alert (push/email/sms), for the audit view.
  channels      text[] not null default '{}',
  -- Snapshot of who we intended to reach, for the "X residents / Y staff" detail.
  recipient_staff_count   integer not null default 0,
  recipient_resident_count integer not null default 0,
  status        text not null default 'active' check (status in ('active','resolved')),
  resolved_at   timestamptz,
  resolved_by   uuid references profiles(id),
  -- Auto-escalation bookkeeping (emergency tier only).
  escalated_at  timestamptz,
  owner_notified_at timestamptz
);
create index if not exists idx_alerts_org on alerts (org_id);
create index if not exists idx_alerts_status on alerts (status);
create index if not exists idx_alerts_tier on alerts (tier);
create index if not exists idx_alerts_created on alerts (created_at desc);

-- ----------------------------- alert acknowledgments -----------------------
create table if not exists alert_acknowledgments (
  id              uuid primary key default gen_random_uuid(),
  alert_id        uuid references alerts(id) on delete cascade,
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz not null default now(),
  note            text,
  -- One ack per user per alert → acknowledge is idempotent.
  unique (alert_id, acknowledged_by)
);
create index if not exists idx_acks_alert on alert_acknowledgments (alert_id);

-- ----------------------------- SMS delivery log ----------------------------
-- Per-recipient Twilio result for the EMERGENCY tier (sent/failed), so a
-- Twilio outage is auditable and never silently swallows a life-safety message.
create table if not exists alert_sms_log (
  id           uuid primary key default gen_random_uuid(),
  alert_id     uuid references alerts(id) on delete cascade,
  profile_id   uuid references profiles(id),
  phone_number text not null,
  status       text not null check (status in ('sent','failed')),
  provider_sid text,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sms_log_alert on alert_sms_log (alert_id);

-- ----------------------------- Stripe billing event ledger -----------------
-- Webhook idempotency: each Stripe event.id is recorded once. A duplicate
-- delivery short-circuits before any state change.
create table if not exists billing_events (
  id           text primary key,   -- Stripe event.id (evt_...)
  type         text not null,
  org_id       uuid references orgs(id),
  processed_at timestamptz not null default now()
);

-- =============================================================================
--  Row Level Security
-- =============================================================================
alter table orgs                  enable row level security;
alter table alerts                enable row level security;
alter table alert_acknowledgments enable row level security;
alter table alert_sms_log         enable row level security;
alter table billing_events        enable row level security;

-- ----------------------------- orgs ----------------------------------------
drop policy if exists "orgs: select own" on orgs;
create policy "orgs: select own"
  on orgs for select to authenticated
  using (id = get_my_org());

drop policy if exists "orgs: admin update own" on orgs;
create policy "orgs: admin update own"
  on orgs for update to authenticated
  using (id = get_my_org() and get_my_role() = 'admin')
  with check (id = get_my_org());

-- ----------------------------- alerts --------------------------------------
-- Everyone in the org can READ alerts (supers/porters need to see emergencies).
drop policy if exists "alerts: select own org" on alerts;
create policy "alerts: select own org"
  on alerts for select to authenticated
  using (org_id = get_my_org());

-- Only management (admin/super/manager) can CREATE alerts, and only for their org.
drop policy if exists "alerts: insert (asm) own org" on alerts;
create policy "alerts: insert (asm) own org"
  on alerts for insert to authenticated
  with check (get_my_role() in ('admin','super','manager') and org_id = get_my_org());

drop policy if exists "alerts: update (asm) own org" on alerts;
create policy "alerts: update (asm) own org"
  on alerts for update to authenticated
  using (get_my_role() in ('admin','super','manager') and org_id = get_my_org())
  with check (org_id = get_my_org());

-- ----------------------------- acknowledgments -----------------------------
drop policy if exists "acks: select own org" on alert_acknowledgments;
create policy "acks: select own org"
  on alert_acknowledgments for select to authenticated
  using (exists (select 1 from alerts a where a.id = alert_id and a.org_id = get_my_org()));

-- A user may only acknowledge as themselves, on an alert in their org.
drop policy if exists "acks: insert own" on alert_acknowledgments;
create policy "acks: insert own"
  on alert_acknowledgments for insert to authenticated
  with check (
    acknowledged_by = auth.uid()
    and exists (select 1 from alerts a where a.id = alert_id and a.org_id = get_my_org())
  );

-- ----------------------------- sms log -------------------------------------
drop policy if exists "sms_log: select own org" on alert_sms_log;
create policy "sms_log: select own org"
  on alert_sms_log for select to authenticated
  using (exists (select 1 from alerts a where a.id = alert_id and a.org_id = get_my_org()));

-- ----------------------------- billing events ------------------------------
-- Read-only to admins of the org; all writes happen via the service-role
-- webhook (which bypasses RLS).
drop policy if exists "billing_events: admin select own org" on billing_events;
create policy "billing_events: admin select own org"
  on billing_events for select to authenticated
  using (org_id = get_my_org() and get_my_role() = 'admin');

-- =============================================================================
--  Done. Service-role writes (API routes, cron, Stripe webhook) bypass RLS and
--  set org_id explicitly; authenticated reads are org-isolated by the policies
--  above.
-- =============================================================================
