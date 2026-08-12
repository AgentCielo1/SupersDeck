-- =============================================================================
-- ROLLBACK for migration-tenant-isolation.sql
-- =============================================================================
-- Returns policy behaviour to EXACTLY the pre-migration state in seconds,
-- without restoring a dump. Use this if the app misbehaves after the migration.
--
-- WHAT IT DOES
--   * Drops the org-scoped read policy and the restrictive isolation policy.
--   * Restores the original tenant-blind `"auth select" … using (true)` reads.
--   * Restores the original `profiles: read all authenticated` policy.
--   * Turns OFF force-RLS (prod had RLS enabled but NOT forced).
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   * It does NOT drop the org_id columns, indexes, triggers, or backfilled
--     values. Those are additive and harmless — no app code reads them yet,
--     and keeping them means re-applying the migration is instant.
--   * It does NOT restore the hard-coded org_id DEFAULTS. Those were a bug
--     (new tenants silently joining org #1) and nothing depends on them.
--     Insert paths are covered by the derive triggers, which stay.
--
-- ⚠️ After running this you are BACK TO TENANT-BLIND. Every authenticated user
--    can read every row again. Only stay here long enough to diagnose.
-- =============================================================================

begin;

do $$
declare
  tbl text;
  -- The exact set that carried "auth select" before the migration, per
  -- role-policies.sql. Restoring more than this would GRANT access that never
  -- existed, so the list is deliberately conservative.
  original_blind text[] := array[
    'buildings', 'units',
    'compliance_templates', 'compliance_items',
    'vendor_categories', 'vendor_discovery_sources', 'vendors',
    'work_orders', 'work_order_updates',
    'heat_logs', 'certifications'
  ];
  -- Tables whose blind policies shipped under other names.
  other_blind text[] := array['violations', 'violations_sync', 'tasks', 'documents'];
  scoped text[] := array[
    'buildings','units','compliance_items','compliance_templates',
    'vendors','vendor_categories','vendor_discovery_sources',
    'work_orders','work_order_updates','heat_logs','certifications',
    'violations','violations_sync','tasks','documents','unit_rents',
    'contractors','contractor_visits','contractor_blocked_attempts',
    'compliance_documents','cloud_connections'
  ];
begin
  -- 1. Remove the isolation this migration added.
  foreach tbl in array scoped loop
    if not exists (select 1 from information_schema.tables
                   where table_schema='public' and table_name=tbl) then
      continue;
    end if;
    execute format('drop policy if exists "org select"    on %I', tbl);
    execute format('drop policy if exists "org isolation" on %I', tbl);
    execute format('alter table %I no force row level security', tbl);
  end loop;

  -- 2. Restore the original permissive reads.
  foreach tbl in array original_blind loop
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name=tbl) then
      execute format('drop policy if exists "auth select" on %I', tbl);
      execute format(
        'create policy "auth select" on %I for select to authenticated using (true)',
        tbl);
    end if;
  end loop;

  foreach tbl in array other_blind loop
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name=tbl) then
      execute format('drop policy if exists %I on %I', tbl || ': auth select', tbl);
      execute format(
        'create policy %I on %I for select to authenticated using (true)',
        tbl || ': auth select', tbl);
    end if;
  end loop;
end $$;

-- 3. profiles back to read-all.
drop policy if exists "profiles: read same org" on profiles;
drop policy if exists "profiles: read all authenticated" on profiles;
create policy "profiles: read all authenticated"
  on profiles for select to authenticated using (true);

commit;

\echo ''
\echo '*** ROLLED BACK — the deployment is TENANT-BLIND again. ***'
\echo '*** Every authenticated user can read every row. Diagnose, then re-apply. ***'
