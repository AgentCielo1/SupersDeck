-- =============================================================================
-- SupersDeck — Files (document repository)
-- =============================================================================
-- Central store for building/tenant/vendor documents (leases, COIs, notices,
-- permits…). Each row tags a file in the private `documents` bucket with a
-- category + optional building/apartment so it's searchable + filterable, and
-- findable from the Tenant directory.
--
-- Single-tenant (role-based RLS) — matches SupersDeck. Run once in the Supabase
-- SQL editor, after role-policies.sql.
-- =============================================================================

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text default 'Other',
  building_id text references buildings(id) on delete set null,
  unit_id     text references units(id) on delete set null,
  path        text not null,                 -- object key in the `documents` bucket
  mime        text,
  size        bigint,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_documents_category on documents(category);
create index if not exists idx_documents_building on documents(building_id);
create index if not exists idx_documents_unit     on documents(unit_id);

alter table documents enable row level security;

-- Read: any authenticated user. Write: admin / super / manager (mirrors units).
drop policy if exists "documents: read" on documents;
create policy "documents: read" on documents for select to authenticated using (true);
drop policy if exists "documents: write (asm)" on documents;
create policy "documents: write (asm)" on documents for insert to authenticated
  with check (get_my_role() in ('admin','super','manager'));
drop policy if exists "documents: update (asm)" on documents;
create policy "documents: update (asm)" on documents for update to authenticated
  using (get_my_role() in ('admin','super','manager'))
  with check (get_my_role() in ('admin','super','manager'));
drop policy if exists "documents: delete (asm)" on documents;
create policy "documents: delete (asm)" on documents for delete to authenticated
  using (get_my_role() in ('admin','super','manager'));

-- ----------------------------- documents bucket ----------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents: authenticated upload" on storage.objects;
create policy "documents: authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');
drop policy if exists "documents: authenticated read" on storage.objects;
create policy "documents: authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'documents');
drop policy if exists "documents: authenticated update" on storage.objects;
create policy "documents: authenticated update" on storage.objects
  for update to authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');
drop policy if exists "documents: authenticated delete" on storage.objects;
create policy "documents: authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');

notify pgrst, 'reload schema';
