-- =============================================================================
-- FIX: restore ALL role-gated WRITE policies (the whack-a-mole ends here)
-- =============================================================================
-- HISTORY. Three times now, a write failed in the app while reads worked,
-- because a permissive INSERT/UPDATE/DELETE policy was missing in production
-- after the August policy churn (the PII lockdown and org-isolation
-- migrations drop-and-recreate policies; the write policies from
-- role-policies.sql did not all survive):
--
--   2026-09-08  units UPDATE            → "Unit not found" on tenant save
--   2026-09-29  work_orders UPDATE      → "Work order not found" on close-out
--   (storage's work-orders bucket had the same gap — fixed separately by
--    migration-storage-buckets.sql)
--
-- This script recreates EVERY write policy for every app table, exactly as
-- supabase/role-policies.sql defines them. It touches NO select policy, so
-- the org-isolation and tenant-PII read fences stay exactly as they are, and
-- the restrictive "org isolation" policy still ANDs on top of everything
-- here — nothing below can widen access across orgs.
--
-- Run in the Supabase SQL editor. Idempotent — safe to run more than once.
-- =============================================================================

-- ----------------------------- diagnosis (optional) --------------------------
-- Which tables currently lack an UPDATE policy? Run before the repair to see
-- the damage; after it, this should return no app tables.
select t.tablename
  from (values ('buildings'),('units'),('compliance_items'),('compliance_templates'),
               ('vendors'),('work_orders'),('work_order_updates'),('heat_logs'),
               ('certifications')) as t(tablename)
 where not exists (
   select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename
      and p.cmd in ('UPDATE','ALL') and p.permissive = 'PERMISSIVE');

-- ------------------------------- repair --------------------------------------
begin;

-- buildings ------------------------------------------------------------------
drop policy if exists "buildings: write (asm)" on public.buildings;
create policy "buildings: write (asm)" on public.buildings
  for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "buildings: update (asm)" on public.buildings;
create policy "buildings: update (asm)" on public.buildings
  for update to authenticated
  using (public.get_my_role() in ('admin','super','manager'))
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "buildings: delete (admin)" on public.buildings;
create policy "buildings: delete (admin)" on public.buildings
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- units ----------------------------------------------------------------------
drop policy if exists "units: write (asm)" on public.units;
create policy "units: write (asm)" on public.units
  for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "units: update (asm)" on public.units;
create policy "units: update (asm)" on public.units
  for update to authenticated
  using (public.get_my_role() in ('admin','super','manager'))
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "units: delete (admin)" on public.units;
create policy "units: delete (admin)" on public.units
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- compliance -----------------------------------------------------------------
drop policy if exists "compliance_items: write (asm)" on public.compliance_items;
create policy "compliance_items: write (asm)" on public.compliance_items
  for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "compliance_items: update (asm)" on public.compliance_items;
create policy "compliance_items: update (asm)" on public.compliance_items
  for update to authenticated
  using (public.get_my_role() in ('admin','super','manager'))
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "compliance_items: delete (admin)" on public.compliance_items;
create policy "compliance_items: delete (admin)" on public.compliance_items
  for delete to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "compliance_templates: write (admin)" on public.compliance_templates;
create policy "compliance_templates: write (admin)" on public.compliance_templates
  for insert to authenticated
  with check (public.get_my_role() = 'admin');
drop policy if exists "compliance_templates: update (admin)" on public.compliance_templates;
create policy "compliance_templates: update (admin)" on public.compliance_templates
  for update to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
drop policy if exists "compliance_templates: delete (admin)" on public.compliance_templates;
create policy "compliance_templates: delete (admin)" on public.compliance_templates
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- vendors --------------------------------------------------------------------
drop policy if exists "vendors: write (asm)" on public.vendors;
create policy "vendors: write (asm)" on public.vendors
  for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "vendors: update (asm)" on public.vendors;
create policy "vendors: update (asm)" on public.vendors
  for update to authenticated
  using (public.get_my_role() in ('admin','super','manager'))
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "vendors: delete (asm)" on public.vendors;
create policy "vendors: delete (asm)" on public.vendors
  for delete to authenticated
  using (public.get_my_role() in ('admin','super','manager'));

drop policy if exists "vendor_categories: write (admin)" on public.vendor_categories;
create policy "vendor_categories: write (admin)" on public.vendor_categories
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
drop policy if exists "vendor_discovery_sources: write (admin)" on public.vendor_discovery_sources;
create policy "vendor_discovery_sources: write (admin)" on public.vendor_discovery_sources
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- work orders ----------------------------------------------------------------
-- THE 2026-09-29 FIX: "Work order not found" on the signed-paper close-out
-- was this UPDATE policy missing.
drop policy if exists "work_orders: insert (asmp)" on public.work_orders;
create policy "work_orders: insert (asmp)" on public.work_orders
  for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager','porter'));
drop policy if exists "work_orders: update (asmp)" on public.work_orders;
create policy "work_orders: update (asmp)" on public.work_orders
  for update to authenticated
  using (public.get_my_role() in ('admin','super','manager','porter'))
  with check (public.get_my_role() in ('admin','super','manager','porter'));
drop policy if exists "work_orders: delete (admin)" on public.work_orders;
create policy "work_orders: delete (admin)" on public.work_orders
  for delete to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "work_order_updates: write (asmp)" on public.work_order_updates;
create policy "work_order_updates: write (asmp)" on public.work_order_updates
  for all to authenticated
  using (public.get_my_role() in ('admin','super','manager','porter'))
  with check (public.get_my_role() in ('admin','super','manager','porter'));

-- heat logs ------------------------------------------------------------------
drop policy if exists "heat_logs: write (asmp)" on public.heat_logs;
create policy "heat_logs: write (asmp)" on public.heat_logs
  for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager','porter'));
drop policy if exists "heat_logs: update (asm)" on public.heat_logs;
create policy "heat_logs: update (asm)" on public.heat_logs
  for update to authenticated
  using (public.get_my_role() in ('admin','super','manager'))
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "heat_logs: delete (admin)" on public.heat_logs;
create policy "heat_logs: delete (admin)" on public.heat_logs
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- certifications --------------------------------------------------------------
drop policy if exists "certifications: write (asm)" on public.certifications;
create policy "certifications: write (asm)" on public.certifications
  for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "certifications: update (asm)" on public.certifications;
create policy "certifications: update (asm)" on public.certifications
  for update to authenticated
  using (public.get_my_role() in ('admin','super','manager'))
  with check (public.get_my_role() in ('admin','super','manager'));
drop policy if exists "certifications: delete (admin)" on public.certifications;
create policy "certifications: delete (admin)" on public.certifications
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- profiles (WRITE policies only — the org-scoped read policy is untouched) ----
drop policy if exists "profiles: admin changes any" on public.profiles;
create policy "profiles: admin changes any" on public.profiles
  for update to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
drop policy if exists "profiles: user edits own name" on public.profiles;
create policy "profiles: user edits own name" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid() and (
      role = (select p.role from public.profiles p where p.id = auth.uid())
    )
  );

commit;

-- ------------------------------- verify --------------------------------------
-- Re-run the diagnosis query above: it should return zero rows.
-- Then in the app: complete the signed-paper work order — it should save.
