-- =============================================================================
-- BoroDesk — Backlog (org-scoped jobs queue for slow-day handyman work)
-- =============================================================================
-- A lightweight task queue, kept SEPARATE from work_orders (reactive tenant
-- tickets). Tasks live in "folders" (Cabinets, Painting, …) and can sit pending
-- indefinitely until assigned. Attachments (photos, scanned work orders, PDFs)
-- go in a private `task-files` bucket.
--
-- Multi-tenant: tasks.org_id is auto-stamped by the set_org_id() trigger on
-- authenticated inserts and every policy is org-scoped — same pattern as the
-- other tenant tables (see migration-organizations.sql). The app writes with
-- the cookie (authenticated) client, so the trigger + RLS handle org scoping
-- transparently; no app code sets org_id.
--
-- Run once in the Supabase SQL editor, AFTER migration-organizations.sql
-- (needs organizations, get_my_org(), set_org_id()) + storage-setup.sql.
-- =============================================================================

create table if not exists tasks (
  id                 uuid primary key default gen_random_uuid(),
  org_id             text not null references organizations(id),
  title              text not null,
  notes              text,
  folder             text default 'General',
  status             text not null default 'pending',   -- pending|assigned|in_progress|done|archived
  priority           text not null default 'normal',    -- low|normal|high
  building_id        text references buildings(id) on delete set null,
  unit_id            text references units(id) on delete set null,
  assigned_to        text,                              -- handyman display name (vendor or free-text)
  assigned_vendor_id text references vendors(id) on delete set null,
  due_date           date,
  files              jsonb not null default '[]'::jsonb, -- [{path,name,type}]
  created_by         uuid references profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create index if not exists idx_tasks_status   on tasks(status);
create index if not exists idx_tasks_folder   on tasks(folder);
create index if not exists idx_tasks_building on tasks(building_id);
create index if not exists idx_tasks_org      on tasks(org_id);

-- Auto-stamp org_id on authenticated insert (service-role would need to set it
-- in code — there are no service-role task inserts).
drop trigger if exists trg_set_org_id on tasks;
create trigger trg_set_org_id before insert on tasks
  for each row execute function public.set_org_id();

alter table tasks enable row level security;

-- Read: any authenticated user in the org (handymen/porters can see the queue).
-- Write: admin / super / manager in the org.
drop policy if exists "tasks: select own org" on tasks;
create policy "tasks: select own org" on tasks for select to authenticated
  using (org_id = get_my_org());
drop policy if exists "tasks: insert asm" on tasks;
create policy "tasks: insert asm" on tasks for insert to authenticated
  with check (get_my_role() in ('admin','super','manager') and org_id = get_my_org());
drop policy if exists "tasks: update asm" on tasks;
create policy "tasks: update asm" on tasks for update to authenticated
  using (get_my_role() in ('admin','super','manager') and org_id = get_my_org())
  with check (get_my_role() in ('admin','super','manager') and org_id = get_my_org());
drop policy if exists "tasks: delete asm" on tasks;
create policy "tasks: delete asm" on tasks for delete to authenticated
  using (get_my_role() in ('admin','super','manager') and org_id = get_my_org());

-- ----------------------------- attachments bucket --------------------------
-- Bucket-level auth (matches wo-photos). Storage RLS is per-bucket, not per-org;
-- acceptable while single-org, consistent with the existing photo bucket.
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', false)
on conflict (id) do nothing;

drop policy if exists "task-files: authenticated upload" on storage.objects;
create policy "task-files: authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-files');
drop policy if exists "task-files: authenticated read" on storage.objects;
create policy "task-files: authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'task-files');
drop policy if exists "task-files: authenticated update" on storage.objects;
create policy "task-files: authenticated update" on storage.objects
  for update to authenticated using (bucket_id = 'task-files') with check (bucket_id = 'task-files');
drop policy if exists "task-files: authenticated delete" on storage.objects;
create policy "task-files: authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'task-files');

notify pgrst, 'reload schema';
