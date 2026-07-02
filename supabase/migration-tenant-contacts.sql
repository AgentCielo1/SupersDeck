-- =============================================================================
--  migration-tenant-contacts.sql — 2nd phone + emergency contact per tenant
-- =============================================================================
--  Adds a secondary number (the directory's Work/Cell line) and the emergency
--  contact (name + relationship + phone) from the "Contacts Phone #'s For All
--  Tenants" directory, so a super can reach a backup person when the tenant is
--  unreachable. All nullable; additive; idempotent.
-- =============================================================================

alter table units add column if not exists tenant_phone2              text;
alter table units add column if not exists emergency_contact_name     text;
alter table units add column if not exists emergency_contact_relation text;
alter table units add column if not exists emergency_contact_phone    text;

-- Make PostgREST pick up the new columns immediately.
notify pgrst, 'reload schema';
