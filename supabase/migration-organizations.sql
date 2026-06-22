-- =============================================================================
-- BoroDesk — Multi-tenancy migration (organizations + org-scoped RLS)
-- =============================================================================
-- Turns the single-org app into a multi-tenant SaaS. Adds:
--   organizations            — one row per customer (e.g. Prestige)
--   <table>.org_id           — every tenant-scoped table gets an org_id
--   get_my_org()             — returns the current user's org (mirrors get_my_role())
--   set_org_id() trigger     — auto-stamps org_id on AUTHENTICATED inserts
--   org-scoped RLS           — users only see/write rows in THEIR org
--
-- Enforcement model: RLS is the single source of truth. App write routes use the
-- cookie (authenticated) client, so reads/writes/updates/deletes are all org-
-- scoped automatically. Public/cron paths use the service-role key (bypass RLS)
-- and set org_id explicitly from the building/user.
--
-- SHARED/GLOBAL (no org_id, readable by all authenticated): compliance_templates,
--   vendor_categories, vendor_discovery_sources (NYC reference data).
--
-- Idempotent. Run AFTER: schema.sql, auth-setup.sql, role-policies.sql,
--   migration-contractors.sql, violations-table.sql, migration-unit-rents.sql,
--   migration-phase9/10/10b.sql.
--
-- ⚠️ DEPLOY ORDER: deploy the matching app branch (feat/borodesk) WITH this
--   migration. Service-role insert paths (tenant intake, contractor sign-in,
--   violations refresh, push subscribe) set org_id in code; org_id is NOT NULL.
--   Do NOT run on prod until that branch is deployed.
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

insert into organizations (id, name, slug)
values ('org-default', 'Default Organization', 'default')
on conflict (id) do nothing;

-- 2) profiles.org_id ---------------------------------------------------------
alter table profiles add column if not exists org_id text references organizations(id);
update profiles set org_id = 'org-default' where org_id is null;
alter table profiles alter column org_id set not null;
create index if not exists idx_profiles_org on profiles (org_id);

-- 3) helpers -----------------------------------------------------------------
create or replace function public.get_my_org()
returns text language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid();
$$;
grant execute on function public.get_my_org() to authenticated;

-- Auto-stamp org_id on insert for AUTHENTICATED sessions. Service-role inserts
-- (no auth.uid()) get NULL and MUST set org_id in code (intentional).
create or replace function public.set_org_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null then
    new.org_id := public.get_my_org();
  end if;
  return new;
end;
$$;

-- 4) add org_id + backfill + NOT NULL + index + auto-stamp trigger on ALL
--    tenant-scoped tables (existing data all belongs to the default org). ------
do $$
declare
  t text;
  tenant_tables text[] := array[
    'buildings','units','compliance_items','vendors',
    'work_orders','work_order_updates','heat_logs','certifications',
    'contractors','compliance_documents','contractor_visits','contractor_blocked_attempts',
    'violations','violations_sync','unit_rents','push_subscriptions'
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

-- 5) drop ALL existing policies on scoped tables (clean slate) ---------------
do $$
declare
  r record;
  scoped text[] := array[
    'organizations','profiles',
    'buildings','units','compliance_items','vendors',
    'work_orders','work_order_updates','heat_logs','certifications',
    'contractors','compliance_documents','contractor_visits','contractor_blocked_attempts',
    'violations','violations_sync','unit_rents','push_subscriptions'
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

-- 7) org-scoped SELECT for all-authenticated-readable tenant tables ----------
-- (excludes unit_rents [admin/manager only] + push_subscriptions [per-user].)
do $$
declare
  t text;
  readable text[] := array[
    'buildings','units','compliance_items','vendors',
    'work_orders','work_order_updates','heat_logs','certifications',
    'contractors','compliance_documents','contractor_visits','contractor_blocked_attempts',
    'violations','violations_sync'
  ];
begin
  foreach t in array readable loop
    execute format(
      'create policy "tenant: select own org" on %I for select to authenticated using (org_id = get_my_org())',
      t);
  end loop;
end $$;

-- 8) WRITE policies (role rules from role-policies.sql + org match) ----------

-- buildings / units / compliance_items / certifications: write asm, delete admin
do $$
declare
  t text;
  grp text[] := array['buildings','units','compliance_items','certifications'];
begin
  foreach t in array grp loop
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
  grp text[] := array['vendors','contractors','compliance_documents'];
begin
  foreach t in array grp loop
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

-- violations / violations_sync: SELECT-only for authenticated (writes = service-role)
-- (SELECT policies created in step 7; no write policy = no authenticated writes.)

-- unit_rents: SENSITIVE. read admin/manager, write admin — all org-scoped.
create policy "rent: select am" on unit_rents for select to authenticated
  using (get_my_role() in ('admin','manager') and org_id = get_my_org());
create policy "rent: insert admin" on unit_rents for insert to authenticated
  with check (get_my_role() = 'admin' and org_id = get_my_org());
create policy "rent: update admin" on unit_rents for update to authenticated
  using (get_my_role() = 'admin' and org_id = get_my_org())
  with check (get_my_role() = 'admin' and org_id = get_my_org());
create policy "rent: delete admin" on unit_rents for delete to authenticated
  using (get_my_role() = 'admin' and org_id = get_my_org());

-- push_subscriptions: per-user; a user manages only their own (within their org).
create policy "push: self manage" on push_subscriptions for all to authenticated
  using (user_id = auth.uid() and org_id = get_my_org())
  with check (user_id = auth.uid() and org_id = get_my_org());

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

notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- ONBOARD A NEW CUSTOMER ORG (run per customer, e.g. Prestige)
-- =============================================================================
-- 1) insert into organizations (id, name, slug)
--      values ('org-prestige', 'Prestige Management', 'prestige');
-- 2) invite their admin with user metadata { role:'admin', full_name:'...',
--      org_id:'org-prestige' } — handle_new_user stamps the profile's org.
-- 3) in-app data auto-stamps org_id via the trigger; service-role intake/
--    sign-in/violations/push set org_id from the building/user.
-- =============================================================================
