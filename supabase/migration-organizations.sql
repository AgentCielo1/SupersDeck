-- =============================================================================
-- BoroDesk — Multi-tenancy migration (organizations + org-scoped RLS)
-- =============================================================================
-- Turns the single-org app into a multi-tenant SaaS. Adds:
--   organizations            — one row per customer (e.g. Prestige)
--   <table>.org_id           — every tenant-scoped table gets an org_id
--   get_my_org()             — returns the current user's org (mirrors get_my_role())
--   set_org_id() trigger     — auto-stamps org_id on authenticated inserts
--   org-scoped RLS           — users only see/write rows in THEIR org
--
-- SHARED/GLOBAL (no org_id, readable by all): compliance_templates,
--   vendor_categories, vendor_discovery_sources (NYC reference data).
--
-- Idempotent. Run AFTER: schema.sql, auth-setup.sql, role-policies.sql,
--   migration-contractors.sql (and the phase9/10 migrations).
--
-- ⚠️ DEPLOY ORDER: deploy the matching app branch (feat/borodesk) WITH this
--   migration. The service-role insert paths (public tenant intake, contractor
--   QR sign-in) must set org_id from the building, because org_id is NOT NULL
--   and service-role bypasses the auto-stamp trigger. Do NOT run on prod until
--   the branch that sets org_id on those inserts is deployed.
-- =============================================================================

begin;

-- 1) organizations -----------------------------------------------------------
create table if not exists organizations (
  id          text primary key,
  name        text not null,
  slug        text unique,
  created_at  timestamptz not null default now()
);
alter table organizations enable row level security;

-- A default org to hold all existing (pre-multi-tenant) data.
insert into organizations (id, name, slug)
values ('org-default', 'Default Organization', 'default')
on conflict (id) do nothing;

-- 2) profiles.org_id (each user belongs to exactly one org) -------------------
alter table profiles add column if not exists org_id text references organizations(id);
update profiles set org_id = 'org-default' where org_id is null;
alter table profiles alter column org_id set not null;
create index if not exists idx_profiles_org on profiles (org_id);

-- 3) helpers -----------------------------------------------------------------
-- Current user's org. Security-definer so it can read profiles under RLS.
create or replace function public.get_my_org()
returns text language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid();
$$;
grant execute on function public.get_my_org() to authenticated;

-- Auto-stamp org_id on insert for AUTHENTICATED sessions, so app queries don't
-- each have to set it. Service-role inserts (no auth.uid()) get NULL here and
-- MUST set org_id explicitly in code (intentional — they set the building's org).
create or replace function public.set_org_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null then
    new.org_id := public.get_my_org();
  end if;
  return new;
end;
$$;

-- 4) add org_id + backfill + NOT NULL + index + auto-stamp trigger -----------
do $$
declare
  t text;
  tenant_tables text[] := array[
    'buildings','units','compliance_items','vendors',
    'work_orders','work_order_updates','heat_logs','certifications',
    'contractors','compliance_documents','contractor_visits','contractor_blocked_attempts'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I add column if not exists org_id text references organizations(id)', t);
    execute format('update %I set org_id = ''org-default'' where org_id is null', t);
    execute format('alter table %I alter column org_id set not null', t);
    execute format('create index if not exists idx_%s_org on %I (org_id)', t, t);
    execute format('drop trigger if exists trg_set_org_id on %I', t);
    execute format('create trigger trg_set_org_id before insert on %I for each row execute function public.set_org_id()', t);
  end loop;
end $$;

-- 5) drop ALL existing policies on the tenant tables (clean slate) ------------
do $$
declare
  r record;
  scoped text[] := array[
    'organizations','profiles',
    'buildings','units','compliance_items','vendors',
    'work_orders','work_order_updates','heat_logs','certifications',
    'contractors','compliance_documents','contractor_visits','contractor_blocked_attempts'
  ];
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename = any(scoped)
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 6) organizations: members read their own org -------------------------------
create policy "org: read own" on organizations for select to authenticated
  using (id = get_my_org());
-- (No app-level write policy: orgs are provisioned via the service-role
--  onboarding path, which bypasses RLS.)

-- 7) org-scoped SELECT for every tenant table --------------------------------
do $$
declare
  t text;
  tenant_tables text[] := array[
    'buildings','units','compliance_items','vendors',
    'work_orders','work_order_updates','heat_logs','certifications',
    'contractors','compliance_documents','contractor_visits','contractor_blocked_attempts'
  ];
begin
  foreach t in array tenant_tables loop
    execute format(
      'create policy "tenant: select own org" on %I for select to authenticated using (org_id = get_my_org())',
      t);
  end loop;
end $$;

-- 8) per-table WRITE policies (role rules from role-policies.sql + org match) --
-- helper note: every write requires the row to belong to the caller's org.

-- buildings / units / compliance_items / certifications: write asm, delete admin
do $$
declare
  t text;
  asm_admindelete text[] := array['buildings','units','compliance_items','certifications'];
begin
  foreach t in array asm_admindelete loop
    execute format($f$create policy "tenant: insert asm" on %I for insert to authenticated
      with check (get_my_role() in ('admin','super','manager') and org_id = get_my_org())$f$, t);
    execute format($f$create policy "tenant: update asm" on %I for update to authenticated
      using (get_my_role() in ('admin','super','manager') and org_id = get_my_org())
      with check (get_my_role() in ('admin','super','manager') and org_id = get_my_org())$f$, t);
    execute format($f$create policy "tenant: delete admin" on %I for delete to authenticated
      using (get_my_role() = 'admin' and org_id = get_my_org())$f$, t);
  end loop;
end $$;

-- vendors / contractors / compliance_documents: full write asm (incl. delete)
do $$
declare
  t text;
  asm_all text[] := array['vendors','contractors','compliance_documents'];
begin
  foreach t in array asm_all loop
    execute format($f$create policy "tenant: write asm" on %I for all to authenticated
      using (get_my_role() in ('admin','super','manager') and org_id = get_my_org())
      with check (get_my_role() in ('admin','super','manager') and org_id = get_my_org())$f$, t);
  end loop;
end $$;

-- work_orders: insert/update asmp (porter marks status), delete admin
create policy "wo: insert asmp" on work_orders for insert to authenticated
  with check (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org());
create policy "wo: update asmp" on work_orders for update to authenticated
  using (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org())
  with check (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org());
create policy "wo: delete admin" on work_orders for delete to authenticated
  using (get_my_role() = 'admin' and org_id = get_my_org());

-- work_order_updates: full write asmp
create policy "wou: write asmp" on work_order_updates for all to authenticated
  using (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org())
  with check (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org());

-- heat_logs: insert asmp (porter logs), update asm, delete admin
create policy "heat: insert asmp" on heat_logs for insert to authenticated
  with check (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org());
create policy "heat: update asm" on heat_logs for update to authenticated
  using (get_my_role() in ('admin','super','manager') and org_id = get_my_org())
  with check (get_my_role() in ('admin','super','manager') and org_id = get_my_org());
create policy "heat: delete admin" on heat_logs for delete to authenticated
  using (get_my_role() = 'admin' and org_id = get_my_org());

-- contractor_visits: insert/update asmp, delete asm
create policy "cv: insert asmp" on contractor_visits for insert to authenticated
  with check (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org());
create policy "cv: update asmp" on contractor_visits for update to authenticated
  using (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org())
  with check (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org());
create policy "cv: delete asm" on contractor_visits for delete to authenticated
  using (get_my_role() in ('admin','super','manager') and org_id = get_my_org());

-- contractor_blocked_attempts: insert asmp (audit)
create policy "cba: insert asmp" on contractor_blocked_attempts for insert to authenticated
  with check (get_my_role() in ('admin','super','manager','porter') and org_id = get_my_org());

-- 9) profiles: org-scoped people page ----------------------------------------
create policy "profiles: read own org" on profiles for select to authenticated
  using (org_id = get_my_org());
create policy "profiles: admin updates own org" on profiles for update to authenticated
  using (get_my_role() = 'admin' and org_id = get_my_org())
  with check (get_my_role() = 'admin' and org_id = get_my_org());
create policy "profiles: user edits own name" on profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and org_id = (select p.org_id from public.profiles p where p.id = auth.uid())
  );

-- 10) new-user trigger: org from invite metadata, fallback default -----------
-- BoroDesk invites a customer's users with data:{ role, full_name, org_id }.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, org_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(
      new.raw_user_meta_data->>'role',
      case when not exists (select 1 from public.profiles) then 'admin' else 'super' end
    ),
    coalesce(new.raw_user_meta_data->>'org_id', 'org-default')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

commit;

-- =============================================================================
-- ONBOARD A NEW CUSTOMER ORG (run per customer, e.g. Prestige)
-- =============================================================================
-- 1) create the org:
--      insert into organizations (id, name, slug)
--      values ('org-prestige', 'Prestige Management', 'prestige');
-- 2) invite their admin from the app/Supabase with user metadata:
--      { "role": "admin", "full_name": "...", "org_id": "org-prestige" }
--    (the handle_new_user trigger stamps the profile with that org).
-- 3) their buildings/units/work-orders created in-app auto-stamp org_id via the
--    trigger; service-role intake/sign-in set org_id from the building.
-- =============================================================================
