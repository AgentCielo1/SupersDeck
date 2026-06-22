-- =============================================================================
-- SupersDeck — Backlog (jobs queue for slow-day handyman work)
-- =============================================================================
-- A lightweight task queue, kept SEPARATE from work_orders (reactive tenant
-- tickets). Tasks live in "folders" (Cabinets, Painting, …) and can sit pending
-- indefinitely until assigned. Attachments (photos, scanned service orders,
-- PDFs) go in a private `task-files` bucket.
--
-- Single-tenant (role-based RLS) — matches SupersDeck. Run once in the Supabase
-- SQL editor, after role-policies.sql + storage-setup.sql.
-- =============================================================================

create table if not exists tasks (
  id                 uuid primary key default gen_random_uuid(),
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

alter table tasks enable row level security;

-- Read: any authenticated user. Write: admin / super / manager (mirrors units).
drop policy if exists "tasks: read" on tasks;
create policy "tasks: read" on tasks for select to authenticated using (true);
drop policy if exists "tasks: write (asm)" on tasks;
create policy "tasks: write (asm)" on tasks for insert to authenticated
  with check (get_my_role() in ('admin','super','manager'));
drop policy if exists "tasks: update (asm)" on tasks;
create policy "tasks: update (asm)" on tasks for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));
drop policy if exists "tasks: delete (asm)" on tasks;
create policy "tasks: delete (asm)" on tasks for delete to authenticated
  using (get_my_role() in ('admin','super','manager'));

-- ----------------------------- attachments bucket --------------------------
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
