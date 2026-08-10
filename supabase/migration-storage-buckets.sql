-- =============================================================================
--  SupersDeck — storage buckets, corrected and org-scoped
-- =============================================================================
--  ⚠️  PREPARED, NOT APPLIED. Review, then run in the SupersDeck Supabase
--      project (izfzcvusozmzotjjmmkn) SQL editor. Nothing in this file has been
--      executed against production.
--
--  SUPERSEDES supabase/storage-setup.sql, which had two defects:
--
--   1. WRONG BUCKET. It created and hardened `wo-photos`. The application reads
--      and writes `work-orders` (src/lib/buckets.ts). Every policy below the
--      bucket line therefore governed an empty bucket nothing used, while the
--      live one was covered by whatever Supabase's defaults happened to be.
--      Nothing failed loudly — that is precisely why it survived.
--
--   2. TENANT-BLIND. The policies read `using (bucket_id = 'wo-photos')`, i.e.
--      "any authenticated user, any object". No org check, no path check. Ported
--      as-is to the live bucket that would have given a second customer every
--      work-order photo in the system.
--
--  Prerequisites: migration-alerts-billing.sql (defines public.get_my_org()) and
--  migration-tenant-isolation.sql (adds org_id to buildings/work_orders).
--
--  AFTER RUNNING, CONFIRM BY HAND: Storage → work-orders → the bucket's `public`
--  flag must be false. `insert ... on conflict do nothing` below will NOT flip an
--  existing public bucket to private; the verification query at the bottom shows
--  you the real value.
-- =============================================================================

begin;

-- ----------------------------- buckets --------------------------------------
-- Both private. Reads go through short-lived signed URLs the app mints.
insert into storage.buckets (id, name, public)
values ('work-orders', 'work-orders', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', false)
on conflict (id) do nothing;


-- ----------------------------- retire the wrong-bucket policies -------------
-- Named for a bucket the app never used. Dropping them changes no live
-- behaviour; it removes the illusion that work-order photos were protected.
drop policy if exists "wo-photos: authenticated upload" on storage.objects;
drop policy if exists "wo-photos: authenticated read"   on storage.objects;
drop policy if exists "wo-photos: authenticated update" on storage.objects;
drop policy if exists "wo-photos: authenticated delete" on storage.objects;


-- ----------------------------- helper: does this object belong to my org? ---
-- Object keys in `work-orders` come in THREE shapes. Enumerated by reading
-- every upload call, not by assumption — the third one was missed on the first
-- pass and would have made this migration break photo display in production:
--
--   A.  <work_order_id>/<timestamp>-<rand>.<ext>
--       src/app/work-orders/[id]/edit/page.tsx — org derivable via work_orders.
--
--   B.  intake/<building_id>/<uuid>.<ext>
--       src/app/api/intake/photo — org derivable via buildings.
--
--   C.  wo/<uuid>-<filename>
--       src/app/work-orders/new/page.tsx — photos and voice memos are uploaded
--       BEFORE the work order exists, so the key can reference nothing. There
--       is no org anywhere in it.
--
-- A and B are scoped properly below. C CANNOT BE, and pretending otherwise
-- would either lock the owner out of his own work-order photos or, worse, look
-- like a control while being none. It is grandfathered to authenticated users
-- and called out in the warning below.
--
-- An object whose parent row is gone matches nothing and becomes unreadable,
-- which is the correct direction to fail.
create or replace function public.storage_object_in_my_org(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.get_my_org() is not null
    and case
      -- Shape B
      when split_part(object_name, '/', 1) = 'intake' then
        exists (
          select 1 from public.buildings b
          where b.id = split_part(object_name, '/', 2)
            and b.org_id = public.get_my_org()
        )
      -- Shape C — see the WARNING block below. Not org-scoped.
      when split_part(object_name, '/', 1) = 'wo' then
        true
      -- Shape A
      else
        exists (
          select 1 from public.work_orders w
          where w.id = split_part(object_name, '/', 1)
            and w.org_id = public.get_my_org()
        )
    end;
$$;

grant execute on function public.storage_object_in_my_org(text) to authenticated;

-- ---------------------------------------------------------------------------
--  ⚠️  WARNING — WHAT THIS MIGRATION DOES *NOT* FIX (read before org #2)
-- ---------------------------------------------------------------------------
--  Two of the four buckets cannot be org-scoped by path, because their object
--  keys carry no org and reference no row that does:
--
--     work-orders,  keys beginning `wo/`   (new-work-order uploads)
--     task-files,   keys `<uuid>-<name>`   (all backlog attachments)
--
--  On a single-org deployment neither is exploitable: every authenticated user
--  is in the same org. On the day a SECOND org exists, both become exactly the
--  cross-tenant read this migration was written to eliminate.
--
--  The remedy is an APPLICATION change, not a policy change: prefix new uploads
--  with the org id (`<org_id>/wo/<uuid>-<name>`), then backfill existing objects
--  and the paths recorded in work_orders.photos / tasks.files. That is a data
--  migration over live objects and deliberately out of scope for an
--  access-control change. DO NOT ONBOARD A SECOND ORG BEFORE IT IS DONE.
-- ---------------------------------------------------------------------------


-- ----------------------------- work-orders bucket ---------------------------
-- Every policy carries BOTH the bucket check and the org check. The bucket
-- check alone is what the old file did.

drop policy if exists "work-orders: org read" on storage.objects;
create policy "work-orders: org read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'work-orders'
    and public.storage_object_in_my_org(name)
  );

drop policy if exists "work-orders: org upload" on storage.objects;
create policy "work-orders: org upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'work-orders'
    and public.storage_object_in_my_org(name)
    and public.get_my_role() in ('admin','super','manager','porter')
  );

drop policy if exists "work-orders: org update" on storage.objects;
create policy "work-orders: org update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'work-orders'
    and public.storage_object_in_my_org(name)
    and public.get_my_role() in ('admin','super','manager')
  )
  with check (
    bucket_id = 'work-orders'
    and public.storage_object_in_my_org(name)
  );

-- Deletes are admin/super only: a photo is often the only evidence that a
-- condition existed, and HPD proceedings turn on that.
drop policy if exists "work-orders: org delete" on storage.objects;
create policy "work-orders: org delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'work-orders'
    and public.storage_object_in_my_org(name)
    and public.get_my_role() in ('admin','super')
  );


-- ----------------------------- task-files bucket ----------------------------
-- ⚠️ HONEST LIMITATION, READ BEFORE ONBOARDING A SECOND ORG.
--
-- Backlog attachments are stored under a FLAT key: `<uuid>-<filename>`
-- (src/app/backlog/BacklogBoard.tsx). There is no org id in the path and no
-- parent row keyed by the path, so the join trick used above is not available
-- and these policies are authenticated-only — the same tenant-blind shape this
-- migration exists to remove. With one org that is not exploitable; with two it
-- is, exactly like the bug this file fixes.
--
-- The fix is to prefix new uploads with the org id (`<org_id>/<uuid>-<name>`)
-- and backfill, which is an application change plus an object rename and does
-- not belong in an access-control migration. Tracked in the report that
-- accompanies this branch.
drop policy if exists "task-files: authenticated read" on storage.objects;
create policy "task-files: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'task-files');

drop policy if exists "task-files: authenticated upload" on storage.objects;
create policy "task-files: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-files'
    and public.get_my_role() in ('admin','super','manager','porter')
  );

drop policy if exists "task-files: authenticated delete" on storage.objects;
create policy "task-files: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-files'
    and public.get_my_role() in ('admin','super')
  );

commit;


-- ----------------------------- verify ---------------------------------------
-- Run these AFTER the commit and read the output; do not assume.
--
--   1. Both buckets must exist and both `public` flags must be false.
--        select id, public from storage.buckets
--         where id in ('work-orders','task-files');
--
--   2. No policy may remain that names the dead bucket.
--        select policyname from pg_policies
--         where tablename = 'objects' and qual ilike '%wo-photos%';
--      Expect zero rows.
--
--   3. The org helper must refuse an object belonging to another org. As a
--      signed-in user, with <other_org_wo_id> a work order in a DIFFERENT org:
--        select public.storage_object_in_my_org('<other_org_wo_id>/x.jpg');
--      Expect false. If it returns true, STOP — the policies are decorative.
