-- =============================================================================
-- SupersDeck — TENANT ISOLATION (org-scoped RLS)
-- =============================================================================
-- WHY THIS EXISTS
--
-- Before this migration, RLS was enabled in production but every read policy
-- was:
--
--     create policy "auth select" on <table> for select to authenticated
--       using (true);
--
-- Tenant-BLIND. Any authenticated user could SELECT every row of every table,
-- regardless of which org they belong to. The anon key was correctly blocked,
-- so there was no public exposure — but the first time a second customer got a
-- login, they would have seen the first customer's buildings, units, rents,
-- work orders and tenant data. That is what blocked customer #2.
--
-- Two further landmines fixed here:
--   1. `buildings.org_id` and `profiles.org_id` DEFAULTED to the hard-coded
--      seed org '…0001'. A new tenant's rows silently landed in the first
--      tenant's org. Removed — org must now be explicit or derived.
--   2. Only `buildings` and `profiles` carried org_id at all. Every other table
--      is scoped here, derived from its building (or unit / work order).
--
-- SAFETY PROPERTIES
--   * Idempotent — safe to re-run.
--   * Additive — no column or row is dropped.
--   * Fail-closed — a row whose org cannot be determined is NOT visible,
--     rather than visible to everyone.
--   * FORCE ROW LEVEL SECURITY so the table owner is subject to policies too;
--     the service-role key still bypasses RLS by design (used by cron/admin).
--
-- ⚠️ RUN ORDER: after auth-setup.sql, role-policies.sql, migration-alerts-billing.sql.
-- ⚠️ Take a database snapshot before running against production.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Guard: orgs + seed org must exist (created in migration-alerts-billing)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'orgs') then
    raise exception 'orgs table missing — run migration-alerts-billing.sql first';
  end if;
end $$;

insert into orgs (id, name, subscription_status)
values ('00000000-0000-0000-0000-000000000001', 'SupersDeck', 'active')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 1. buildings / profiles: keep org_id, DROP the sentinel default
-- ---------------------------------------------------------------------------
-- The default was the bug: new rows silently joined org #1. After this, an
-- insert must state its org (or inherit it via the trigger in §3).
alter table buildings add column if not exists org_id uuid references orgs(id);
alter table profiles  add column if not exists org_id uuid references orgs(id);

update buildings set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update profiles  set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;

alter table buildings alter column org_id drop default;
alter table profiles  alter column org_id drop default;

alter table buildings alter column org_id set not null;
-- profiles.org_id stays nullable: handle_new_user() inserts before an org is
-- assigned. get_my_org() returning null then denies everything (fail-closed).

create index if not exists idx_buildings_org on buildings (org_id);
create index if not exists idx_profiles_org  on profiles (org_id);


-- ---------------------------------------------------------------------------
-- 2. Add org_id to every tenant-scoped table + backfill from its parent
-- ---------------------------------------------------------------------------
do $$
declare
  spec record;   -- .tbl = table to scope, .backfill = SQL yielding its owning org
begin
  for spec in
    select * from (values
      -- scoped via building_id -------------------------------------------------
      ('units',                       'select org_id from buildings b where b.id = t.building_id'),
      ('work_orders',                 'select org_id from buildings b where b.id = t.building_id'),
      ('compliance_items',            'select org_id from buildings b where b.id = t.building_id'),
      ('heat_logs',                   'select org_id from buildings b where b.id = t.building_id'),
      ('violations',                  'select org_id from buildings b where b.id = t.building_id'),
      ('violations_sync',             'select org_id from buildings b where b.id = t.building_id'),
      ('tasks',                       'select org_id from buildings b where b.id = t.building_id'),
      ('documents',                   'select org_id from buildings b where b.id = t.building_id'),
      ('contractor_visits',           'select org_id from buildings b where b.id = t.building_id'),
      ('contractor_blocked_attempts', 'select org_id from buildings b where b.id = t.building_id'),
      -- scoped one hop further -------------------------------------------------
      ('unit_rents',                  'select b.org_id from units u join buildings b on b.id = u.building_id where u.id = t.unit_id'),
      ('work_order_updates',          'select b.org_id from work_orders w join buildings b on b.id = w.building_id where w.id = t.work_order_id')
    ) as s(tbl, backfill)
  loop
    -- Skip tables that don't exist in this deployment.
    if not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = spec.tbl) then
      raise notice 'skipping %, not present', spec.tbl;
      continue;
    end if;

    execute format(
      'alter table %I add column if not exists org_id uuid references orgs(id)',
      spec.tbl
    );
    execute format(
      'update %I t set org_id = (%s) where t.org_id is null',
      spec.tbl, spec.backfill
    );
    execute format(
      'create index if not exists %I on %I (org_id)',
      'idx_' || spec.tbl || '_org', spec.tbl
    );
  end loop;
end $$;

-- Org-level tables (no building parent). These are reference/config data owned
-- by the org as a whole. Backfilled to the seed org because that is factually
-- where the existing rows belong — this deployment has exactly one org.
do $$
declare
  tbl text;
  org_level text[] := array[
    'vendors', 'vendor_categories', 'vendor_discovery_sources',
    'contractors', 'certifications', 'compliance_templates',
    'compliance_documents', 'cloud_connections'
  ];
begin
  foreach tbl in array org_level loop
    if not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = tbl) then
      raise notice 'skipping %, not present', tbl;
      continue;
    end if;
    execute format('alter table %I add column if not exists org_id uuid references orgs(id)', tbl);
    execute format(
      'update %I set org_id = ''00000000-0000-0000-0000-000000000001'' where org_id is null',
      tbl
    );
    execute format('create index if not exists %I on %I (org_id)', 'idx_' || tbl || '_org', tbl);
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 2c. Sweep: any row that could not derive an org belongs to the seed org
-- ---------------------------------------------------------------------------
-- Four tables allow a NULL building_id (tasks, documents, violations,
-- contractor_blocked_attempts), so the building-based backfill above cannot
-- reach every row. Found in staging: one real task ("Oven repair") with no
-- building — it would have been left org-less and therefore INVISIBLE TO
-- EVERYONE, which is a data-loss-shaped bug, not a security win.
--
-- Assigning these to the seed org is factually correct: at migration time this
-- deployment has exactly one tenant, so every pre-existing row is theirs. This
-- is a ONE-TIME backfill of historical data — it is NOT a default, and new
-- rows never land here (see the triggers in §3).
do $$
declare
  tbl text;
  n   int;
  scoped text[] := array[
    'units','work_orders','compliance_items','heat_logs','violations',
    'violations_sync','tasks','documents','contractor_visits',
    'contractor_blocked_attempts','unit_rents','work_order_updates'
  ];
begin
  foreach tbl in array scoped loop
    if not exists (select 1 from information_schema.tables
                   where table_schema='public' and table_name=tbl) then
      continue;
    end if;
    execute format(
      'update %I set org_id = ''00000000-0000-0000-0000-000000000001''
         where org_id is null', tbl);
    get diagnostics n = row_count;
    if n > 0 then
      raise notice 'swept % orphaned row(s) in % into the seed org', n, tbl;
    end if;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 3. Derive org_id on INSERT so existing app/cron code keeps working
-- ---------------------------------------------------------------------------
-- Without this, every insert path in the app would have to be rewritten to
-- pass org_id. Instead the row inherits its org from its parent building; if
-- there is no building, it falls back to the inserting user's org.
create or replace function public.derive_org_from_building()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.org_id is null then
    new.org_id := (select org_id from buildings where id = new.building_id);
  end if;
  if new.org_id is null then
    new.org_id := public.get_my_org();
  end if;
  return new;
end;
$$;

create or replace function public.derive_org_from_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.org_id is null then
    new.org_id := public.get_my_org();
  end if;
  return new;
end;
$$;

do $$
declare
  tbl text;
  building_scoped text[] := array[
    'units', 'work_orders', 'compliance_items', 'heat_logs',
    'violations', 'violations_sync', 'tasks', 'documents',
    'contractor_visits', 'contractor_blocked_attempts'
  ];
  session_scoped text[] := array[
    'vendors', 'vendor_categories', 'vendor_discovery_sources',
    'contractors', 'certifications', 'compliance_templates',
    'compliance_documents', 'cloud_connections', 'buildings'
  ];
begin
  foreach tbl in array building_scoped loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = tbl) then
      execute format('drop trigger if exists trg_org_derive on %I', tbl);
      execute format(
        'create trigger trg_org_derive before insert on %I
           for each row execute function public.derive_org_from_building()', tbl
      );
    end if;
  end loop;

  foreach tbl in array session_scoped loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = tbl) then
      execute format('drop trigger if exists trg_org_derive on %I', tbl);
      execute format(
        'create trigger trg_org_derive before insert on %I
           for each row execute function public.derive_org_from_session()', tbl
      );
    end if;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 4. Replace the tenant-BLIND `using (true)` read policies with org-scoped ones
-- ---------------------------------------------------------------------------
-- This is the actual fix. Everything above is plumbing to make it possible.
do $$
declare
  tbl text;
  scoped text[] := array[
    'buildings', 'units',
    'compliance_items', 'compliance_templates',
    'vendors', 'vendor_categories', 'vendor_discovery_sources',
    'work_orders', 'work_order_updates',
    'heat_logs', 'certifications',
    'violations', 'violations_sync', 'tasks', 'documents',
    'unit_rents', 'contractors', 'contractor_visits',
    'contractor_blocked_attempts', 'compliance_documents',
    'cloud_connections'
  ];
begin
  foreach tbl in array scoped loop
    if not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = tbl) then
      continue;
    end if;

    -- RLS on, and FORCEd so the owning role is subject to it too.
    execute format('alter table %I enable row level security', tbl);
    execute format('alter table %I force row level security', tbl);

    -- Drop EVERY permissive read-all policy on this table, whatever it is
    -- called. Naming has drifted across migrations ("auth select",
    -- "violations: auth select", "documents: read", …) so matching on the
    -- predicate is the only reliable way to catch them all.
    declare
      pol text;
    begin
      for pol in
        select policyname from pg_policies
         where schemaname = 'public'
           and tablename = tbl
           and permissive = 'PERMISSIVE'
           and cmd in ('SELECT', 'ALL')
           and coalesce(qual, 'true') = 'true'
      loop
        raise notice 'dropping tenant-blind policy %.%', tbl, pol;
        execute format('drop policy if exists %I on %I', pol, tbl);
      end loop;
    end;

    execute format('drop policy if exists "org select" on %I', tbl);

    -- Read: only rows belonging to the caller's org.
    -- get_my_org() returns NULL for a profile with no org → matches nothing.
    execute format(
      'create policy "org select" on %I for select to authenticated
         using (org_id is not distinct from public.get_my_org()
                and public.get_my_org() is not null)',
      tbl
    );
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 5. Constrain WRITES to the caller's org as well
-- ---------------------------------------------------------------------------
-- The role-based write policies from role-policies.sql stay (they encode who
-- may write). These add the orthogonal question of WHICH org may be written to.
-- Postgres ANDs the permissive role policy with this restrictive one.
do $$
declare
  tbl text;
  scoped text[] := array[
    'buildings', 'units',
    'compliance_items', 'compliance_templates',
    'vendors', 'vendor_categories', 'vendor_discovery_sources',
    'work_orders', 'work_order_updates',
    'heat_logs', 'certifications',
    'violations', 'violations_sync', 'tasks', 'documents',
    'unit_rents', 'contractors', 'contractor_visits',
    'contractor_blocked_attempts', 'compliance_documents',
    'cloud_connections'
  ];
begin
  foreach tbl in array scoped loop
    if not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = tbl) then
      continue;
    end if;
    execute format('drop policy if exists "org isolation" on %I', tbl);
    execute format(
      'create policy "org isolation" on %I as restrictive for all to authenticated
         using (org_id is not distinct from public.get_my_org()
                and public.get_my_org() is not null)
         with check (org_id is not distinct from public.get_my_org()
                and public.get_my_org() is not null)',
      tbl
    );
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 6. profiles: a user may only see people in their own org
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
drop policy if exists "profiles: read all authenticated" on profiles;
drop policy if exists "profiles: read same org" on profiles;
create policy "profiles: read same org"
  on profiles for select to authenticated
  using (
    id = auth.uid()
    or (public.get_my_org() is not null and org_id = public.get_my_org())
  );

commit;

-- =============================================================================
-- VERIFY (run manually after applying)
-- =============================================================================
--   -- no table still carries a tenant-blind read policy:
--   select tablename, policyname, qual from pg_policies
--    where schemaname = 'public' and qual = 'true' and cmd = 'SELECT';
--
--   -- every scoped table has org_id populated:
--   select 'units' t, count(*) filter (where org_id is null) as orphaned from units
--   union all select 'work_orders', count(*) filter (where org_id is null) from work_orders;
--
--   -- the sentinel default is gone:
--   select column_name, column_default from information_schema.columns
--    where table_name = 'buildings' and column_name = 'org_id';
-- =============================================================================
