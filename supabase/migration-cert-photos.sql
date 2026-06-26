-- =============================================================================
--  migration-cert-photos.sql — certificate photos + renewal linkage
-- =============================================================================
--  Adds a photo of the actual certificate (stored in the private `documents`
--  bucket) and a cert_key that links a cert to its compliance template so the
--  app can show the correct "renew at official site" link. Also relaxes the
--  NOT NULL on number / expires_at because many real credentials (OSHA card,
--  EPA 608, training-completion certs) have no card number and never expire.
-- =============================================================================

alter table certifications add column if not exists photo_path text;   -- object key in `documents` bucket
alter table certifications add column if not exists cert_key   text;   -- e.g. 'fdny-s12' → compliance template

alter table certifications alter column number     drop not null;
alter table certifications alter column expires_at drop not null;

-- (issued_at and agency are already nullable.)
