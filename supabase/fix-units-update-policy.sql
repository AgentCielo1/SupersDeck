-- =============================================================================
--  FIX: Tenant directory "Unit not found" on Save
-- =============================================================================
--  SYMPTOM (2026-09-08): editing a tenant on /tenants and hitting Save shows
--  "Unit not found" even though the row is right there on screen.
--
--  CAUSE: PATCH /api/units/:id updates through the user-scoped client, so RLS
--  decides whether the UPDATE may touch the row. Reads work (the org+role
--  SELECT policy is in place), but the permissive UPDATE policy on `units`
--  was lost or mis-scoped somewhere in the recent policy churn (the
--  tenant-PII lockdown and org-isolation migrations both drop-and-recreate
--  policies on this table). An RLS-denied UPDATE matches 0 rows, which the
--  API used to report as "Unit not found".
--
--  Run this in the Supabase SQL editor (project izfz…). Idempotent — safe to
--  run more than once. Run the DIAGNOSIS first if you want to see the state
--  before repairing.

-- ----------------------------- diagnosis ------------------------------------
--  1. What policies does units actually have right now? Healthy state has:
--     - a permissive SELECT policy (org + admin/super)
--     - permissive INSERT/UPDATE (asm) and DELETE (admin) policies
--     - the restrictive "org isolation" ALL policy
select policyname, cmd, permissive, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'units'
 order by cmd, policyname;

--  2. Any unit without an org is invisible AND unwritable under the org fence:
select count(*) as units_missing_org from public.units where org_id is null;

-- ------------------------------- repair -------------------------------------
begin;

-- Recreate the role-gated write policies exactly as role-policies.sql defines
-- them. The restrictive "org isolation" policy (if applied) still ANDs on top,
-- so this cannot widen access across orgs.
drop policy if exists "units: write (asm)" on public.units;
create policy "units: write (asm)"
  on public.units for insert to authenticated
  with check (public.get_my_role() in ('admin','super','manager'));

drop policy if exists "units: update (asm)" on public.units;
create policy "units: update (asm)"
  on public.units for update to authenticated
  using (public.get_my_role() in ('admin','super','manager'))
  with check (public.get_my_role() in ('admin','super','manager'));

drop policy if exists "units: delete (admin)" on public.units;
create policy "units: delete (admin)"
  on public.units for delete to authenticated
  using (public.get_my_role() = 'admin');

-- Re-home any unit that slipped in without an org (derives it from its
-- building, same as the isolation migration's backfill).
update public.units u
   set org_id = (select b.org_id from public.buildings b where b.id = u.building_id)
 where u.org_id is null;

commit;

-- ------------------------------- verify -------------------------------------
--  Positive AND negative, per the house rule:
--    1. In the app as admin/super: edit a tenant on /tenants and Save — works.
--    2. Re-run the diagnosis query — the three write policies are listed.
--    3. units_missing_org returns 0.
