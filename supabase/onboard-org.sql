-- =============================================================================
-- BoroDesk — onboard a new customer organization
-- =============================================================================
-- Run in the Supabase SQL editor AFTER migration-organizations.sql is live.
-- Replace the REPLACE_* placeholders, run, then invite the admin (step 4).
-- Inviting the admin USER is NOT SQL — Supabase user invites go through the
-- Auth admin API / dashboard; the handle_new_user trigger stamps their profile
-- from the invite metadata. See DEPLOY-multitenant.md.
-- =============================================================================

-- 1) Create the org. Use a stable id ('org-prestige') + url slug.
insert into organizations (id, name, slug)
values ('org-REPLACE_SLUG', 'REPLACE_Company_Name', 'REPLACE_slug')
on conflict (id) do nothing;

-- 2) Verify it exists.
select id, name, slug, created_at
from organizations
where id = 'org-REPLACE_SLUG';

-- 3) (Optional) Migrate EXISTING rows into this org — only if you're moving
--    data that currently sits under 'org-default'. SKIP for a net-new customer
--    who will create their own buildings in-app (auto-stamped via the trigger).
--    Example:
--      update buildings           set org_id = 'org-REPLACE_SLUG' where id in ('bldg-x');
--      update units               set org_id = 'org-REPLACE_SLUG' where building_id in ('bldg-x');
--      update vendors             set org_id = 'org-REPLACE_SLUG' where id in ('vendor-x');
--      -- (repeat for work_orders, compliance_items, contractors, etc.)

-- 4) Invite the admin (Supabase → Authentication → Users → Invite user), with
--    User Metadata (raw_user_meta_data):
--      { "role": "admin", "full_name": "Their Name", "org_id": "org-REPLACE_SLUG" }
--    handle_new_user() stamps profiles.org_id + role from this on first login.

-- 5) Smoke-test isolation — counts should reflect ONLY this org's data:
--      select count(*) from buildings        where org_id = 'org-REPLACE_SLUG';
--      select count(*) from contractor_visits where org_id = 'org-REPLACE_SLUG';
-- =============================================================================
