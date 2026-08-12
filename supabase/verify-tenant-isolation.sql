-- =============================================================================
-- Post-migration verification for migration-tenant-isolation.sql
-- =============================================================================
-- Run against STAGING first, then production immediately after applying.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/verify-tenant-isolation.sql
--
-- Raises an exception on any failure, so a non-zero exit means DO NOT PROCEED.
-- =============================================================================

\echo '--- 1. tenant-blind policies (expect: none) ---'
select tablename, policyname
  from pg_policies
 where schemaname = 'public'
   and permissive = 'PERMISSIVE'
   and cmd in ('SELECT', 'ALL')
   and coalesce(qual, 'true') = 'true'
   and tablename in (
     'buildings','units','work_orders','violations','violations_sync',
     'documents','tasks','unit_rents','heat_logs','compliance_items',
     'certifications','vendors','contractors','contractor_visits',
     'compliance_templates','cloud_connections','work_order_updates',
     'vendor_categories','vendor_discovery_sources','contractor_blocked_attempts',
     'compliance_documents'
   );

\echo '--- 2. org_id defaults removed (expect: NONE) ---'
select table_name, coalesce(column_default, 'NONE') as org_default
  from information_schema.columns
 where table_name in ('buildings','profiles') and column_name = 'org_id';

\echo '--- 3. row counts still intact ---'
select 'buildings' t, count(*) from buildings
union all select 'units', count(*) from units
union all select 'work_orders', count(*) from work_orders
union all select 'unit_rents', count(*) from unit_rents
union all select 'profiles', count(*) from profiles
order by 1;

\echo '--- 4. HARD ASSERTIONS ---'
do $$
declare
  n int;
  bad text := '';
  t   text;
begin
  -- 4a. No tenant-blind read policy may survive.
  select count(*) into n from pg_policies
   where schemaname='public' and permissive='PERMISSIVE'
     and cmd in ('SELECT','ALL') and coalesce(qual,'true')='true'
     and tablename in ('buildings','units','work_orders','violations','documents',
                       'tasks','unit_rents','heat_logs','compliance_items');
  if n > 0 then
    raise exception 'FAIL: % tenant-blind policies still present', n;
  end if;

  -- 4b. No scoped table may contain an unassigned row (would be invisible to all).
  foreach t in array array['buildings','units','work_orders','violations',
                           'heat_logs','compliance_items','unit_rents',
                           'documents','tasks'] loop
    if exists (select 1 from information_schema.columns
                where table_schema='public' and table_name=t and column_name='org_id') then
      execute format('select count(*) from %I where org_id is null', t) into n;
      if n > 0 then bad := bad || format(' %s(%s)', t, n); end if;
    end if;
  end loop;
  if bad <> '' then
    raise exception 'FAIL: rows with NULL org_id (invisible to everyone):%', bad;
  end if;

  -- 4c. Every profile must have an org, or that user sees a blank app.
  select count(*) into n from profiles where org_id is null;
  if n > 0 then
    raise exception
      'FAIL: % profile(s) have NULL org_id — they will see an EMPTY app. Assign an org before proceeding.', n;
  end if;

  -- 4d. The sentinel defaults must be gone.
  select count(*) into n from information_schema.columns
   where table_name in ('buildings','profiles')
     and column_name='org_id' and column_default is not null;
  if n > 0 then
    raise exception 'FAIL: org_id still has a hardcoded default on % column(s)', n;
  end if;

  -- 4e. FORCE RLS actually applied.
  select count(*) into n from pg_class
   where relnamespace='public'::regnamespace and relrowsecurity and relforcerowsecurity;
  if n < 15 then
    raise exception 'FAIL: only % tables have FORCE RLS, expected >=15', n;
  end if;

  raise notice 'ALL VERIFICATION CHECKS PASSED (% tables force-RLS)', n;
end $$;
