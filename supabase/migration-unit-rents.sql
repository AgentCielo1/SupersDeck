-- =============================================================================
-- SupersDeck — sensitive rent figures (admin/owner-only)
-- =============================================================================
-- Rent is the most sensitive field in the dataset, so it lives in its OWN table
-- (NOT as columns on `units`). Reason: Postgres RLS is row-level, not
-- column-level — if rent were on `units`, the blanket "auth select using(true)"
-- policy would expose it to every role (super, manager, porter, read_only).
--
-- This table is deliberately absent from the permissive read loop in
-- role-policies.sql, and gets strict admin-only policies below. Non-admins get
-- ZERO rows at the database. The service-role key (used by the import script)
-- bypasses RLS, so loading still works.
--
-- Run once in the Supabase SQL editor, after schema.sql + role-policies.sql.
-- =============================================================================

create table if not exists unit_rents (
  unit_id        text primary key references units(id) on delete cascade,
  base_charge    numeric(10,2),   -- legal / base regulated rent
  repeat_charges numeric(10,2),   -- recurring adjustment (negative = preferential / subsidy discount)
  total_charge   numeric(10,2),   -- actual rent charged
  source         text default 'rent_roll',
  updated_at     timestamptz not null default now()
);

alter table unit_rents enable row level security;

-- ----------------------------- read: owner + managers ----------------------
-- Owner (admin) and managers can VIEW rent. Writes stay admin-only (below),
-- so managers see but can't change figures. Super / porter / read_only: none.
drop policy if exists "unit_rents: select (admin)" on unit_rents;
drop policy if exists "unit_rents: select (admin/manager)" on unit_rents;
create policy "unit_rents: select (admin/manager)"
  on unit_rents for select to authenticated
  using (get_my_role() in ('admin', 'manager'));

drop policy if exists "unit_rents: insert (admin)" on unit_rents;
create policy "unit_rents: insert (admin)"
  on unit_rents for insert to authenticated
  with check (get_my_role() = 'admin');

drop policy if exists "unit_rents: update (admin)" on unit_rents;
create policy "unit_rents: update (admin)"
  on unit_rents for update to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

drop policy if exists "unit_rents: delete (admin)" on unit_rents;
create policy "unit_rents: delete (admin)"
  on unit_rents for delete to authenticated
  using (get_my_role() = 'admin');

-- Let PostgREST pick up the new table immediately.
notify pgrst, 'reload schema';
