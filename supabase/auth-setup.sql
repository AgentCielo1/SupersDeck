-- =============================================================================
-- SupersDeck — Phase 4 auth setup
-- =============================================================================
-- Run this ONCE on a project that already has schema.sql + seed.sql applied.
-- It replaces the `disable-rls-for-dev.sql` step: we re-enable RLS on every
-- app table with policies that allow authenticated users to do everything
-- (per-role fine-grained policies land in phase 5).
--
-- Also creates a `profiles` row per auth.users row so the UI can attach a
-- role and friendly name to each signed-in user.
-- =============================================================================


-- ----------------------------- profiles ----------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'super'
              check (role in ('super','porter','manager','admin','read_only')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is provisioned.
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
    -- First user becomes 'admin' automatically; subsequent users default to
    -- 'super'. Admin can change roles later via the Supabase Table Editor.
    case when not exists (select 1 from public.profiles) then 'admin' else 'super' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any auth.users that pre-date the trigger.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  'admin'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);


-- ----------------------------- RLS: profiles -----------------------------
alter table profiles enable row level security;

drop policy if exists "profiles: read all authenticated" on profiles;
create policy "profiles: read all authenticated"
  on profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles: update own" on profiles;
create policy "profiles: update own"
  on profiles for update
  to authenticated
  using (id = auth.uid());


-- ----------------------------- RLS: app tables ---------------------------
-- For phase 4 we go with "any authenticated user can do everything." Phase 5
-- will tighten per role (porters → only update WO status; read_only → SELECT
-- only; manager → no DELETE; super → full).
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
    execute format('alter table %I enable row level security', tbl);

    execute format('drop policy if exists "auth read all" on %I', tbl);
    execute format(
      'create policy "auth read all" on %I for select to authenticated using (true)',
      tbl
    );

    execute format('drop policy if exists "auth write all" on %I', tbl);
    execute format(
      'create policy "auth write all" on %I for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end $$;


-- ----------------------------- Optional: keep anon read for /intake -----
-- The tenant intake page (/intake/[buildingCode]) is public — tenants need
-- to read the building name without an account. Allow anon SELECT on just
-- the buildings table. Uncomment if you've enabled the public intake form:
--
-- create policy "anon read buildings (intake)"
--   on buildings for select
--   to anon
--   using (true);
