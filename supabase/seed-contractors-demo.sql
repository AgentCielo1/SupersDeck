-- =============================================================================
-- SupersDeck — contractor logbook DEMO seed
-- =============================================================================
-- 3 vendors, each with a General Liability COI: one current, one expiring
-- (<=30 days), one expired. Run in the Supabase SQL editor AFTER
-- migration-contractors.sql. Idempotent (on conflict do nothing).
--
-- Watch the gate at /sign-in/<buildingId> (e.g. /sign-in/bldg-1):
--   Apex Plumbing     -> compliant  (signs in)
--   Citywide Electric -> expiring   (signs in; manager nudged)
--   RapidFix Handyman -> expired    (BLOCKED at sign-in)
--
-- Dates are relative to current_date, so the statuses stay correct whenever
-- you run it. Remove later with the DELETEs at the bottom (commented).
-- =============================================================================

insert into vendor_categories (id, name, icon)
values ('cat-demo-trades', 'Trades (demo)', '🔧')
on conflict (id) do nothing;

insert into vendors (id, name, category_id, contact_name, phone, in_my_vendors)
values
  ('vendor-apex',     'Apex Plumbing & Heating', 'cat-demo-trades', 'Luis Romero', '(718) 555-0142', true),
  ('vendor-citywide', 'Citywide Electric',       'cat-demo-trades', 'Marcus Webb', '(718) 555-0177', true),
  ('vendor-rapidfix', 'RapidFix Handyman',       'cat-demo-trades', 'Danny Kwan',  '(718) 555-0199', true)
on conflict (id) do nothing;

insert into compliance_documents
  (id, company_id, doc_type, carrier, policy_number,
   gl_per_occurrence, gl_aggregate, issuing_agency, effective_date, expiry_date)
values
  ('doc-apex-gl', 'vendor-apex', 'gl_coi', 'The Hartford', 'GL-4471902',
     1000000, 2000000, 'The Hartford',
     (current_date - interval '185 days')::date, (current_date + interval '180 days')::date),
  ('doc-citywide-gl', 'vendor-citywide', 'gl_coi', 'Travelers', 'TR-88210',
     1000000, 2000000, 'Travelers',
     (current_date - interval '351 days')::date, (current_date + interval '14 days')::date),
  ('doc-rapidfix-gl', 'vendor-rapidfix', 'gl_coi', 'Geico Commercial', 'GC-55012',
     1000000, 1000000, 'Geico Commercial',
     (current_date - interval '400 days')::date, (current_date - interval '40 days')::date)
on conflict (id) do nothing;

-- Cleanup (uncomment to remove the demo data):
-- delete from compliance_documents where id in ('doc-apex-gl','doc-citywide-gl','doc-rapidfix-gl');
-- delete from vendors where id in ('vendor-apex','vendor-citywide','vendor-rapidfix');
-- delete from vendor_categories where id = 'cat-demo-trades';
