-- =============================================================================
--  SupersDeck — one cloud connection PER ORG, enforced by the database
-- =============================================================================
--  ⚠️  PREPARED, NOT APPLIED. Review, then run in the SupersDeck Supabase
--      project (izfzcvusozmzotjjmmkn). Nothing here has been executed against
--      production.
--
--  WHAT THIS CLOSES
--
--  src/lib/cloud/store.ts used to fetch `id = 'default'` with the SERVICE ROLE
--  key, which bypasses RLS, and never filtered by org_id — even though
--  migration-tenant-isolation.sql had already added that column to this table.
--  With one org that is invisible. With two, the second customer's server call
--  returns the FIRST customer's Dropbox refresh token: not a row of their data,
--  the key to their entire document archive.
--
--  The application fix (already on this branch) scopes every read and write by
--  org_id. This migration makes "one connection per org" a rule the database
--  enforces, so the next person to write a query here cannot reintroduce the
--  bug by forgetting a filter.
--
--  Safe on the current single-org deployment: there is one row, it already has
--  org_id set (backfilled to the seed org by migration-tenant-isolation.sql),
--  and its id stays 'default'.
-- =============================================================================

begin;

-- Refuse to proceed if any row is org-less — a null org_id would silently be
-- exempt from the unique constraint below, which is the same class of hole.
do $$
declare
  orphans int;
begin
  select count(*) into orphans from public.cloud_connections where org_id is null;
  if orphans > 0 then
    raise exception
      'ABORT: % cloud_connections row(s) have no org_id. Backfill them first '
      '(see migration-tenant-isolation.sql) — a null org_id escapes the unique '
      'constraint this migration adds.', orphans;
  end if;
end $$;

alter table public.cloud_connections
  alter column org_id set not null;

-- The actual rule: an org has at most one connected drive.
create unique index if not exists cloud_connections_org_unique
  on public.cloud_connections (org_id);

commit;


-- ----------------------------- verify ---------------------------------------
--   select id, org_id, provider, account_email from public.cloud_connections;
--     -- expect exactly one row, org_id = 00000000-0000-0000-0000-000000000001
--
--   Prove the constraint bites (it should ERROR, not succeed):
--     insert into public.cloud_connections (id, org_id, app_key, refresh_token)
--     values ('probe', '00000000-0000-0000-0000-000000000001', 'x', 'x');
--     -- expect: duplicate key value violates unique constraint
--     -- then:   delete from public.cloud_connections where id = 'probe';
--
--   If that insert SUCCEEDS, the index did not apply — stop and investigate
--   rather than assuming the migration worked.
