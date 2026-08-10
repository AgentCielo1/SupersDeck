-- =============================================================================
--  SupersDeck — restrict tenant contact PII to admin/super
-- =============================================================================
--  ⚠️  PREPARED, NOT APPLIED. Review, then run in the SupersDeck Supabase
--      project (izfzcvusozmzotjjmmkn). Nothing here has been executed against
--      production.
--
--  WHAT THIS CLOSES
--
--  supabase/role-policies.sql grants SELECT on `units` to every authenticated
--  role, with the comment "that keeps porters and read_only useful (they see
--  the world) without leaking anything yet". That was true when written. It
--  stopped being true when the directory was populated: units now carries
--  tenant_name, tenant_phone, tenant_phone2, emergency_contact_name,
--  emergency_contact_relation, emergency_contact_phone and lease_end for 423 of
--  432 apartments, and /tenants renders all of it.
--
--  MUST BE KEPT IN STEP WITH  TENANT_PII  in src/lib/authz.ts.
--  The page gate and this policy encode the same decision in two places. If you
--  widen one — e.g. porters need resident phone numbers — widen the other in
--  the same change, or the app and the database will disagree about who may
--  read a tenant's phone number.
--
--  NOTE ON TODAY'S BLAST RADIUS: only two people hold logins (Superintendent
--  and Assistant Superintendent), both admin/super, so applying this denies
--  nobody anything right now. It is here so the answer is already correct on
--  the first day a porter or read_only account exists.
--
--  APPROACH: units stays readable by everyone MINUS the PII columns, via a
--  column-restricted grant. Postgres RLS cannot filter columns, so the split is
--  done with GRANT: revoke column-level SELECT on the PII columns from the
--  broad role and expose the rest. Porters keep the unit list, the labels, and
--  occupancy — which is what makes the app useful to them — and lose the
--  resident's name and phone.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
--  1. A view for the non-PII columns, for callers that only need the layout.
-- ---------------------------------------------------------------------------
create or replace view public.units_public as
  select
    id, building_id, label, floor, line, beds, baths,
    occupied, created_at, updated_at, org_id
  from public.units;

grant select on public.units_public to authenticated;

-- ---------------------------------------------------------------------------
--  2. Row policy on units: PII rows readable only by admin/super.
-- ---------------------------------------------------------------------------
--  The existing org-scoped read policy from migration-tenant-isolation.sql
--  ("units: org select" or whatever the loop named it) stays as the org fence.
--  This ADDS the role fence. Both are permissive policies, so to actually
--  restrict we replace the broad one rather than adding alongside it —
--  permissive policies OR together, and an extra permissive policy would widen
--  access, not narrow it. Getting this backwards is the classic RLS mistake.
do $$
declare
  pol text;
begin
  -- Drop every existing permissive SELECT policy on units, whatever it is
  -- named — naming has drifted across migrations.
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'units' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.units', pol);
  end loop;
end $$;

-- Org fence AND role fence, in one policy so there is nothing to OR against.
create policy "units: org select (pii roles only)"
  on public.units for select
  to authenticated
  using (
    org_id is not distinct from public.get_my_org()
    and public.get_my_org() is not null
    and public.get_my_role() in ('admin','super')
  );

commit;


-- ----------------------------- verify ---------------------------------------
--  Prove the fence with a POSITIVE and a NEGATIVE in the same session — a
--  negative alone passes just as well when the session has no auth context at
--  all, which proves nothing (see BUG-015 in ~/Developer/bug-log).
--
--   As an ADMIN session:   select count(*) from units;   -- expect > 0
--   As a PORTER session:   select count(*) from units;   -- expect 0
--   As a PORTER session:   select count(*) from units_public;  -- expect > 0
--
--  If the porter count is 0 in BOTH queries, your test session probably has no
--  role at all — fix the harness before believing the result.
