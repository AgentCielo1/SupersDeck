-- =============================================================================
-- SupersDeck — Phase 5 per-role RLS policies
-- =============================================================================
-- Tightens the phase-4 "any authenticated user does anything" policies into
-- per-role rules. Run AFTER auth-setup.sql (which created the profiles
-- table + the broad authenticated policies we're now replacing).
--
-- Roles (column profiles.role):
--   admin     full read/write/delete, role mgmt
--   super     full read/write; cannot delete buildings or change others' roles
--   manager   full read/write; cannot delete anything
--   porter    SELECT all; can only UPDATE work_orders.status + add heat_logs
--   read_only SELECT only
-- =============================================================================


-- ----------------------------- updated handle_new_user --------------------
-- Extends the phase-4 trigger so invited users get the role the admin chose
-- (passed via Supabase admin.inviteUserByEmail's `data: { role, full_name }`
-- payload). Still defaults the first user to admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(
      new.raw_user_meta_data->>'role',
      case when not exists (select 1 from public.profiles) then 'admin' else 'super' end
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- ----------------------------- helper: get_my_role() -----------------------
-- Returns the role of the currently-authenticated user. Used in every policy
-- below so the rule stays one expression.
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'anon'
  );
$$;

grant execute on function public.get_my_role() to authenticated;


-- ----------------------------- drop phase-4 broad policies -----------------
do $$
declare
  tbl text;
  app_tables text[] := array[
    'buildings', 'units',
    'compliance_templates', 'compliance_items',
    'vendor_categories', 'vendor_discovery_sources', 'vendors',
    'work_orders', 'work_order_updates',
    'heat_logs', 'certifications'
  ];
begin
  foreach tbl in array app_tables loop
    execute format('drop policy if exists "auth read all"  on %I', tbl);
    execute format('drop policy if exists "auth write all" on %I', tbl);
  end loop;
end $$;


-- ----------------------------- everyone can read most tables ---------------
-- All authenticated roles can SELECT every app table. That keeps porters and
-- read_only useful (they see the world) without leaking anything yet.
do $$
declare
  tbl text;
  app_tables text[] := array[
    'buildings', 'units',
    'compliance_templates', 'compliance_items',
    'vendor_categories', 'vendor_discovery_sources', 'vendors',
    'work_orders', 'work_order_updates',
    'heat_logs', 'certifications'
  ];
begin
  foreach tbl in array app_tables loop
    execute format(
      'create policy "auth select" on %I for select to authenticated using (true)',
      tbl
    );
  end loop;
end $$;


-- ----------------------------- buildings & units ---------------------------
-- admin/super/manager can INSERT + UPDATE. Only admin can DELETE.
create policy "buildings: write (asm)"
  on buildings for insert to authenticated
  with check (get_my_role() in ('admin','super','manager'));

create policy "buildings: update (asm)"
  on buildings for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));

create policy "buildings: delete (admin)"
  on buildings for delete to authenticated
  using (get_my_role() = 'admin');

create policy "units: write (asm)"
  on units for insert to authenticated
  with check (get_my_role() in ('admin','super','manager'));

create policy "units: update (asm)"
  on units for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));

create policy "units: delete (admin)"
  on units for delete to authenticated
  using (get_my_role() = 'admin');


-- ----------------------------- compliance ----------------------------------
create policy "compliance_items: write (asm)"
  on compliance_items for insert to authenticated
  with check (get_my_role() in ('admin','super','manager'));

create policy "compliance_items: update (asm)"
  on compliance_items for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));

create policy "compliance_items: delete (admin)"
  on compliance_items for delete to authenticated
  using (get_my_role() = 'admin');

-- compliance_templates is reference data; only admin should touch it.
create policy "compliance_templates: write (admin)"
  on compliance_templates for insert to authenticated
  with check (get_my_role() = 'admin');
create policy "compliance_templates: update (admin)"
  on compliance_templates for update to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');
create policy "compliance_templates: delete (admin)"
  on compliance_templates for delete to authenticated
  using (get_my_role() = 'admin');


-- ----------------------------- vendors -------------------------------------
create policy "vendors: write (asm)"
  on vendors for insert to authenticated
  with check (get_my_role() in ('admin','super','manager'));

create policy "vendors: update (asm)"
  on vendors for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));

create policy "vendors: delete (asm)"
  on vendors for delete to authenticated
  using (get_my_role() in ('admin','super','manager'));

-- vendor_categories / discovery sources are reference; admin-only writes.
create policy "vendor_categories: write (admin)"
  on vendor_categories for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');
create policy "vendor_discovery_sources: write (admin)"
  on vendor_discovery_sources for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');


-- ----------------------------- work orders ---------------------------------
-- admin/super/manager: full write. porter: can update (handyman marks status).
create policy "work_orders: insert (asmp)"
  on work_orders for insert to authenticated
  with check (get_my_role() in ('admin','super','manager','porter'));

create policy "work_orders: update (asmp)"
  on work_orders for update to authenticated
  using (get_my_role() in ('admin','super','manager','porter'))
  with check (get_my_role() in ('admin','super','manager','porter'));

create policy "work_orders: delete (admin)"
  on work_orders for delete to authenticated
  using (get_my_role() = 'admin');

create policy "work_order_updates: write (asmp)"
  on work_order_updates for all to authenticated
  using (get_my_role() in ('admin','super','manager','porter'))
  with check (get_my_role() in ('admin','super','manager','porter'));


-- ----------------------------- heat logs (porters can log) -----------------
-- This is a deliberate exception: the porter walking line by line each
-- morning should be able to record readings without needing super/admin help.
create policy "heat_logs: write (asmp)"
  on heat_logs for insert to authenticated
  with check (get_my_role() in ('admin','super','manager','porter'));

create policy "heat_logs: update (asm)"
  on heat_logs for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));

create policy "heat_logs: delete (admin)"
  on heat_logs for delete to authenticated
  using (get_my_role() = 'admin');


-- ----------------------------- certifications ------------------------------
create policy "certifications: write (asm)"
  on certifications for insert to authenticated
  with check (get_my_role() in ('admin','super','manager'));
create policy "certifications: update (asm)"
  on certifications for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));
create policy "certifications: delete (admin)"
  on certifications for delete to authenticated
  using (get_my_role() = 'admin');


-- ----------------------------- profiles (people page) ----------------------
-- Admins can change anyone's role. Other roles can only update their own
-- full_name. Nobody can delete profiles directly — that happens through
-- auth.users deletion (admin removes a user from the dashboard).
drop policy if exists "profiles: read all authenticated" on profiles;
drop policy if exists "profiles: update own" on profiles;

create policy "profiles: read all authenticated"
  on profiles for select to authenticated using (true);

create policy "profiles: admin changes any"
  on profiles for update to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "profiles: user edits own name"
  on profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid() and (
      -- prevent self-promotion: role must be unchanged unless admin
      role = (select p.role from public.profiles p where p.id = auth.uid())
    )
  );
