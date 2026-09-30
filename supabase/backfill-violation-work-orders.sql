-- =============================================================================
-- SupersDeck — create a work order for EVERY open HPD violation (one paste)
-- =============================================================================
-- Generated 2026-09-30 from the app's own /api/violations/export CSV
-- (b42351ab-supersdeck-violations-open-2026-09-24.csv): 178 open HPD
-- violations across Building 1/2/3. Each statement:
--   • is skipped if a work order for that violationid already exists
--     (idempotent — safe to run again; also safe after some were made by hand
--     via "+ Create WO" on /violations),
--   • resolves the building by NAME and the unit by label at run time,
--   • carries the violation's full NOV text + provenance in the description,
--   • sets category/priority/hpd_risk exactly as src/lib/violation-wo.ts does,
--   • seeds the ticket's timeline ("Reported: …" by HPD import).
-- OATH/ECB summonses are NOT included: they are hearings/penalties on the
-- lot, not apartment repairs — tell Claude if you want tickets for those too.
--
-- The column migration is inlined below, so this file alone is enough.
-- Run in the Supabase SQL editor.
-- =============================================================================

alter table work_orders
  add column if not exists source_violation_id text;

create index if not exists idx_wo_source_violation
  on work_orders (source_violation_id)
  where source_violation_id is not null;

-- WO-MUNGPYHY · Building 1 · Apt 8B · Class C · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyhy', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYHY', 'HPD C · Apt 8B · properly repair the broken or defective lock and assembly at door i…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOCK AND ASSEMBLY AT DOOR IN THE ENTRANCE LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 15622318 · Class C · issued 12/20/2022 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 8B · properly repair the broken or defective lock and assembly at door i…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOCK AND ASSEMBLY AT DOOR IN THE ENTRANCE LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 15622318 · Class C · issued 12/20/2022 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'lock-key', 'high', 'new',
       'HPD import', false, '15622318'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15622318');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyhy-created', 'wo-mungpyhy', 'Reported: HPD C · Apt 8B · properly repair the broken or defective lock and assembly at door i…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyhy'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyhy-created');

-- WO-MUNGPYHZ · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyhz', b.id, null, b.org_id, 'WO-MUNGPYHZ', 'HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE AT BULKHEAD DOOR AT SOUTH SECTION AT PUBLIC HALL, 12th STORY

— From HPD violation 16014920 · Class C · issued 6/5/2023 · status: NOT COMPLIED WITH.',
       'HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE AT BULKHEAD DOOR AT SOUTH SECTION AT PUBLIC HALL, 12th STORY

— From HPD violation 16014920 · Class C · issued 6/5/2023 · status: NOT COMPLIED WITH.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '16014920'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16014920');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyhz-created', 'wo-mungpyhz', 'Reported: HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyhz'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyhz-created');

-- WO-MUNGPYI0 · Building 1 · Apt 12L · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi0', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYI0', 'HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881029 · Class C · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881029 · Class C · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16881029'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881029');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi0-created', 'wo-mungpyi0', 'Reported: HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi0'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi0-created');

-- WO-MUNGPYI1 · Building 1 · Apt 12L · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi1', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYI1', 'HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881030 · Class C · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881030 · Class C · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16881030'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881030');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi1-created', 'wo-mungpyi1', 'Reported: HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi1'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi1-created');

-- WO-MUNGPYI2 · Building 1 · Apt 12L · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi2', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYI2', 'HPD C · Apt 12L · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE LATCH IN THE ENTRANCE LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881031 · Class C · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 12L · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE LATCH IN THE ENTRANCE LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881031 · Class C · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'high', 'new',
       'HPD import', false, '16881031'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881031');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi2-created', 'wo-mungpyi2', 'Reported: HPD C · Apt 12L · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi2'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi2-created');

-- WO-MUNGPYI3 · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi3', b.id, null, b.org_id, 'WO-MUNGPYI3', 'HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 16917555 · Class C · issued 4/25/2024 · status: NOT COMPLIED WITH.',
       'HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 16917555 · Class C · issued 4/25/2024 · status: NOT COMPLIED WITH.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '16917555'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16917555');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi3-created', 'wo-mungpyi3', 'Reported: HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi3'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi3-created');

-- WO-MUNGPYI4 · Building 1 · Apt 12L · Class C · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi4', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYI4', 'HPD C · Apt 12L · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROX 50 SQFT AT CEILING IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16940293 · Class C · issued 5/2/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 12L · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROX 50 SQFT AT CEILING IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16940293 · Class C · issued 5/2/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'mold', 'high', 'new',
       'HPD import', true, '16940293'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16940293');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi4-created', 'wo-mungpyi4', 'Reported: HPD C · Apt 12L · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi4'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi4-created');

-- WO-MUNGPYI5 · Building 1 · Apt 12L · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi5', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYI5', 'HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION ''''NORTH''''

— From HPD violation 16943675 · Class C · issued 5/3/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION ''''NORTH''''

— From HPD violation 16943675 · Class C · issued 5/3/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16943675'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16943675');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi5-created', 'wo-mungpyi5', 'Reported: HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi5'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi5-created');

-- WO-MUNGPYI6 · Building 1 · Apt 12L · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi6', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYI6', 'HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION ''''NORTH''''

— From HPD violation 16943676 · Class C · issued 5/3/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION ''''NORTH''''

— From HPD violation 16943676 · Class C · issued 5/3/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16943676'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16943676');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi6-created', 'wo-mungpyi6', 'Reported: HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi6'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi6-created');

-- WO-MUNGPYI7 · Building 1 · Apt 8B · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi7', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYI7', 'HPD C · Apt 8B · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065804 · Class C · issued 6/24/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 8B · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065804 · Class C · issued 6/24/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17065804'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065804');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi7-created', 'wo-mungpyi7', 'Reported: HPD C · Apt 8B · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi7'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi7-created');

-- WO-MUNGPYI8 · Building 1 · Apt 11B · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi8', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11B') limit 1), b.org_id, 'WO-MUNGPYI8', 'HPD C · Apt 11B · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE LATCH SET IN THE ENTRANCE LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243854 · Class C · issued 9/5/2024 · status: NOV SENT OUT.',
       'HPD C · Apt 11B · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE LATCH SET IN THE ENTRANCE LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243854 · Class C · issued 9/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '17243854'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17243854');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi8-created', 'wo-mungpyi8', 'Reported: HPD C · Apt 11B · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi8'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi8-created');

-- WO-MUNGPYI9 · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyi9', b.id, null, b.org_id, 'WO-MUNGPYI9', 'HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17243858 · Class C · issued 9/5/2024 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17243858 · Class C · issued 9/5/2024 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '17243858'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17243858');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyi9-created', 'wo-mungpyi9', 'Reported: HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyi9'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyi9-created');

-- WO-MUNGPYIA · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyia', b.id, null, b.org_id, 'WO-MUNGPYIA', 'HPD C · common area · remove the illegal fastening consisting on unaccetble electromanagt…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING ON UNACCETBLE ELECTROMANAGTIC LOCKING DEVICE AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17276471 · Class C · issued 9/17/2024 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening consisting on unaccetble electromanagt…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING ON UNACCETBLE ELECTROMANAGTIC LOCKING DEVICE AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17276471 · Class C · issued 9/17/2024 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '17276471'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17276471');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyia-created', 'wo-mungpyia', 'Reported: HPD C · common area · remove the illegal fastening consisting on unaccetble electromanagt…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyia'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyia-created');

-- WO-MUNGPYIB · Building 1 · Apt 12K · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyib', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12K') limit 1), b.org_id, 'WO-MUNGPYIB', 'HPD C · Apt 12K · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12K, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317498 · Class C · issued 10/3/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 12K · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12K, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317498 · Class C · issued 10/3/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17317498'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17317498');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyib-created', 'wo-mungpyib', 'Reported: HPD C · Apt 12K · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyib'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyib-created');

-- WO-MUNGPYIC · Building 1 · Apt 12L · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyic', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYIC', 'HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317501 · Class C · issued 10/3/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317501 · Class C · issued 10/3/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17317501'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17317501');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyic-created', 'wo-mungpyic', 'Reported: HPD C · Apt 12L · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyic'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyic-created');

-- WO-MUNGPYID · Building 1 · Apt 12L · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyid', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYID', 'HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317502 · Class C · issued 10/3/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317502 · Class C · issued 10/3/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17317502'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17317502');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyid-created', 'wo-mungpyid', 'Reported: HPD C · Apt 12L · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyid'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyid-created');

-- WO-MUNGPYIE · Building 1 · Apt 6A · Class C · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyie', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6A') limit 1), b.org_id, 'WO-MUNGPYIE', 'HPD C · Apt 6A · properly repair or replace the broken or defective lock and assembl…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LOCK AND ASSEMBLY AT DOOR IN THE ENTRANCE LOCATED AT APT 6A, 6th STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368756 · Class C · issued 10/31/2024 · status: NOV SENT OUT.',
       'HPD C · Apt 6A · properly repair or replace the broken or defective lock and assembl…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LOCK AND ASSEMBLY AT DOOR IN THE ENTRANCE LOCATED AT APT 6A, 6th STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368756 · Class C · issued 10/31/2024 · status: NOV SENT OUT.', 'en', 'lock-key', 'high', 'new',
       'HPD import', false, '17368756'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17368756');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyie-created', 'wo-mungpyie', 'Reported: HPD C · Apt 6A · properly repair or replace the broken or defective lock and assembl…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyie'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyie-created');

-- WO-MUNGPYIF · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyif', b.id, null, b.org_id, 'WO-MUNGPYIF', 'HPD C · common area · remove the illegal fastening consisting of an unacceptable electrom…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT BUILDING VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17391374 · Class C · issued 10/31/2024 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening consisting of an unacceptable electrom…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT BUILDING VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17391374 · Class C · issued 10/31/2024 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '17391374'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17391374');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyif-created', 'wo-mungpyif', 'Reported: HPD C · common area · remove the illegal fastening consisting of an unacceptable electrom…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyif'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyif-created');

-- WO-MUNGPYIG · Building 1 · Apt 12A · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyig', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12A') limit 1), b.org_id, 'WO-MUNGPYIG', 'HPD C · Apt 12A · remove device preventing door from being self-closing door sweeper …', '§ 27-2005, 2007 ADM CODE REMOVE DEVICE PREVENTING DOOR FROM BEING SELF-CLOSING DOOR SWEEPER INSTALLED IN THE ENTRANCE LOCATED AT APT 12A, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 17433895 · Class C · issued 11/25/2024 · status: NOV SENT OUT.',
       'HPD C · Apt 12A · remove device preventing door from being self-closing door sweeper …', '§ 27-2005, 2007 ADM CODE REMOVE DEVICE PREVENTING DOOR FROM BEING SELF-CLOSING DOOR SWEEPER INSTALLED IN THE ENTRANCE LOCATED AT APT 12A, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 17433895 · Class C · issued 11/25/2024 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '17433895'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17433895');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyig-created', 'wo-mungpyig', 'Reported: HPD C · Apt 12A · remove device preventing door from being self-closing door sweeper …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyig'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyig-created');

-- WO-MUNGPYIH · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyih', b.id, null, b.org_id, 'WO-MUNGPYIH', 'HPD C · common area · remove the illegal fastening consisting of unacceptable electro mag…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTRO MAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17433896 · Class C · issued 11/25/2024 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening consisting of unacceptable electro mag…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTRO MAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17433896 · Class C · issued 11/25/2024 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '17433896'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17433896');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyih-created', 'wo-mungpyih', 'Reported: HPD C · common area · remove the illegal fastening consisting of unacceptable electro mag…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyih'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyih-created');

-- WO-MUNGPYII · Building 1 · Apt 10K · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyii', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYII', 'HPD C · Apt 10K · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225134 · Class C · issued 9/15/2025 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 10K · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225134 · Class C · issued 9/15/2025 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '18225134'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225134');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyii-created', 'wo-mungpyii', 'Reported: HPD C · Apt 10K · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyii'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyii-created');

-- WO-MUNGPYIJ · Building 1 · Apt 10K · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyij', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYIJ', 'HPD C · Apt 10K · properly repair or replace the broken or defective glass pane at up…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE GLASS PANE AT UPPER SASH AT 3RD WINDOW AT EAST IN THE 2nd ROOM FROM NORTH LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225138 · Class C · issued 9/15/2025 · status: NOV SENT OUT.',
       'HPD C · Apt 10K · properly repair or replace the broken or defective glass pane at up…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE GLASS PANE AT UPPER SASH AT 3RD WINDOW AT EAST IN THE 2nd ROOM FROM NORTH LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225138 · Class C · issued 9/15/2025 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18225138'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225138');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyij-created', 'wo-mungpyij', 'Reported: HPD C · Apt 10K · properly repair or replace the broken or defective glass pane at up…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyij'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyij-created');

-- WO-MUNGPYIK · Building 1 · common area · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyik', b.id, null, b.org_id, 'WO-MUNGPYIK', 'HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED ON VESTIBULE DOOR , 1st STORY

— From HPD violation 18362238 · Class C · issued 11/12/2025 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED ON VESTIBULE DOOR , 1st STORY

— From HPD violation 18362238 · Class C · issued 11/12/2025 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18362238'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18362238');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyik-created', 'wo-mungpyik', 'Reported: HPD C · common area · remove the illegal fastening consisting of unacceptable electromagn…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyik'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyik-created');

-- WO-MUNGPYIL · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyil', b.id, null, b.org_id, 'WO-MUNGPYIL', 'HPD C · common area · remove the illegal fastening consisting of an unacceptable electrom…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 18629042 · Class C · issued 2/10/2026 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening consisting of an unacceptable electrom…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 18629042 · Class C · issued 2/10/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '18629042'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18629042');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyil-created', 'wo-mungpyil', 'Reported: HPD C · common area · remove the illegal fastening consisting of an unacceptable electrom…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyil'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyil-created');

-- WO-MUNGPYIM · Building 1 · Apt 1A · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyim', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1A') limit 1), b.org_id, 'WO-MUNGPYIM', 'HPD C · Apt 1A · remove device preventing door from being self-closing weatherstrip …', '§ 27-2005, 2007 ADM CODE REMOVE DEVICE PREVENTING DOOR FROM BEING SELF-CLOSING WEATHERSTRIP AT BOTTOM OF DOOR IN THE ENTRANCE LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629045 · Class C · issued 2/10/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 1A · remove device preventing door from being self-closing weatherstrip …', '§ 27-2005, 2007 ADM CODE REMOVE DEVICE PREVENTING DOOR FROM BEING SELF-CLOSING WEATHERSTRIP AT BOTTOM OF DOOR IN THE ENTRANCE LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629045 · Class C · issued 2/10/2026 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18629045'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18629045');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyim-created', 'wo-mungpyim', 'Reported: HPD C · Apt 1A · remove device preventing door from being self-closing weatherstrip …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyim'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyim-created');

-- WO-MUNGPYIN · Building 1 · Apt 1A · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyin', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1A') limit 1), b.org_id, 'WO-MUNGPYIN', 'HPD C · Apt 1A · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE DOOR AND FRAME AT DOOR IN THE ENTRANCE LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629046 · Class C · issued 2/10/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 1A · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE DOOR AND FRAME AT DOOR IN THE ENTRANCE LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629046 · Class C · issued 2/10/2026 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18629046'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18629046');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyin-created', 'wo-mungpyin', 'Reported: HPD C · Apt 1A · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyin'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyin-created');

-- WO-MUNGPYIO · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyio', b.id, null, b.org_id, 'WO-MUNGPYIO', 'HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR TO BUILDING AT PUBLIC HALL, 1st STORY

— From HPD violation 18653971 · Class C · issued 2/19/2026 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR TO BUILDING AT PUBLIC HALL, 1st STORY

— From HPD violation 18653971 · Class C · issued 2/19/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '18653971'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18653971');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyio-created', 'wo-mungpyio', 'Reported: HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyio'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyio-created');

-- WO-MUNGPYIP · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyip', b.id, null, b.org_id, 'WO-MUNGPYIP', 'HPD C · common area · provide ready access to buildings heating system door locked at cel…', '§ 27-2033 ADM CODE PROVIDE READY ACCESS TO BUILDINGS HEATING SYSTEM DOOR LOCKED AT CELLAR AT BOILER ROOM

— From HPD violation 18667867 · Class C · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD C · common area · provide ready access to buildings heating system door locked at cel…', '§ 27-2033 ADM CODE PROVIDE READY ACCESS TO BUILDINGS HEATING SYSTEM DOOR LOCKED AT CELLAR AT BOILER ROOM

— From HPD violation 18667867 · Class C · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '18667867'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667867');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyip-created', 'wo-mungpyip', 'Reported: HPD C · common area · provide ready access to buildings heating system door locked at cel…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyip'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyip-created');

-- WO-MUNGPYIQ · Building 1 · Apt 11F · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyiq', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11F') limit 1), b.org_id, 'WO-MUNGPYIQ', 'HPD C · Apt 11F · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE HINGES AT DOOR IN THE ENTRANCE LOCATED AT APT 11F, 11th STORY, 4th APARTMENT FROM SOUTH AT WEST

— From HPD violation 18667868 · Class C · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 11F · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE HINGES AT DOOR IN THE ENTRANCE LOCATED AT APT 11F, 11th STORY, 4th APARTMENT FROM SOUTH AT WEST

— From HPD violation 18667868 · Class C · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18667868'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667868');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyiq-created', 'wo-mungpyiq', 'Reported: HPD C · Apt 11F · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyiq'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyiq-created');

-- WO-MUNGPYIR · Building 1 · common area · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyir', b.id, null, b.org_id, 'WO-MUNGPYIR', 'HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR , 1st STORY

— From HPD violation 18667871 · Class C · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR , 1st STORY

— From HPD violation 18667871 · Class C · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18667871'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667871');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyir-created', 'wo-mungpyir', 'Reported: HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyir'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyir-created');

-- WO-MUNGPYIS · Building 1 · common area · Class C · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyis', b.id, null, b.org_id, 'WO-MUNGPYIS', 'HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT FIRE EXIT DOOR LEADING TO EAST YARD AT CELLAR

— From HPD violation 18667873 · Class C · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT FIRE EXIT DOOR LEADING TO EAST YARD AT CELLAR

— From HPD violation 18667873 · Class C · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'high', 'new',
       'HPD import', false, '18667873'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667873');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyis-created', 'wo-mungpyis', 'Reported: HPD C · common area · remove the illegal fastening unacceptable electromagnetic locking d…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyis'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyis-created');

-- WO-MUNGPYIT · Building 1 · common area · Class C · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyit', b.id, null, b.org_id, 'WO-MUNGPYIT', 'HPD C · common area · post notice, in form approved by the department, stating the name a…', '§ 27-2033 ADM CODE POST NOTICE, IN FORM APPROVED BY THE DEPARTMENT, STATING THE NAME AND LOCATION OF THE PERSON DESIGNATED BY THE OWNER TO HAVE KEY TO BUILDINGS HEATING SYSTEM MISSING CONTACT INFORMATION AT PUBLIC HALL, 1st STORY

— From HPD violation 18667875 · Class C · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD C · common area · post notice, in form approved by the department, stating the name a…', '§ 27-2033 ADM CODE POST NOTICE, IN FORM APPROVED BY THE DEPARTMENT, STATING THE NAME AND LOCATION OF THE PERSON DESIGNATED BY THE OWNER TO HAVE KEY TO BUILDINGS HEATING SYSTEM MISSING CONTACT INFORMATION AT PUBLIC HALL, 1st STORY

— From HPD violation 18667875 · Class C · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'lock-key', 'high', 'new',
       'HPD import', false, '18667875'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667875');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyit-created', 'wo-mungpyit', 'Reported: HPD C · common area · post notice, in form approved by the department, stating the name a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyit'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyit-created');

-- WO-MUNGPYIU · Building 1 · Apt 1M · Class C · no-hot-water
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyiu', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1M') limit 1), b.org_id, 'WO-MUNGPYIU', 'HPD C · Apt 1M · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1M, 1st STORY, 3rd APARTMENT FROM NORTH AT EAST

— From HPD violation 18803440 · Class C · issued 4/22/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 1M · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1M, 1st STORY, 3rd APARTMENT FROM NORTH AT EAST

— From HPD violation 18803440 · Class C · issued 4/22/2026 · status: NOV SENT OUT.', 'en', 'no-hot-water', 'high', 'new',
       'HPD import', true, '18803440'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18803440');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyiu-created', 'wo-mungpyiu', 'Reported: HPD C · Apt 1M · provide hot water at all hot water fixtures in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyiu'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyiu-created');

-- WO-MUNGPYIV · Building 1 · Apt 1K · Class C · no-hot-water
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyiv', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1K') limit 1), b.org_id, 'WO-MUNGPYIV', 'HPD C · Apt 1K · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1K, 1st STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18803443 · Class C · issued 4/22/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 1K · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1K, 1st STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18803443 · Class C · issued 4/22/2026 · status: NOV SENT OUT.', 'en', 'no-hot-water', 'high', 'new',
       'HPD import', true, '18803443'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18803443');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyiv-created', 'wo-mungpyiv', 'Reported: HPD C · Apt 1K · provide hot water at all hot water fixtures in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyiv'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyiv-created');

-- WO-MUNGPYIW · Building 1 · Apt 1L · Class C · no-hot-water
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyiw', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1L') limit 1), b.org_id, 'WO-MUNGPYIW', 'HPD C · Apt 1L · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1L, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 18803444 · Class C · issued 4/22/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 1L · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1L, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 18803444 · Class C · issued 4/22/2026 · status: NOV SENT OUT.', 'en', 'no-hot-water', 'high', 'new',
       'HPD import', true, '18803444'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18803444');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyiw-created', 'wo-mungpyiw', 'Reported: HPD C · Apt 1L · provide hot water at all hot water fixtures in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyiw'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyiw-created');

-- WO-MUNGPYIX · Building 1 · Apt 1G · Class C · no-hot-water
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyix', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1G') limit 1), b.org_id, 'WO-MUNGPYIX', 'HPD C · Apt 1G · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1G, 1st STORY, 3rd APARTMENT FROM SOUTH AT WEST

— From HPD violation 18803446 · Class C · issued 4/22/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 1G · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 1G, 1st STORY, 3rd APARTMENT FROM SOUTH AT WEST

— From HPD violation 18803446 · Class C · issued 4/22/2026 · status: NOV SENT OUT.', 'en', 'no-hot-water', 'high', 'new',
       'HPD import', true, '18803446'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18803446');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyix-created', 'wo-mungpyix', 'Reported: HPD C · Apt 1G · provide hot water at all hot water fixtures in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyix'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyix-created');

-- WO-MUNGPYIY · Building 1 · Apt 3A · Class C · no-hot-water
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyiy', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3A') limit 1), b.org_id, 'WO-MUNGPYIY', 'HPD C · Apt 3A · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18803447 · Class C · issued 4/22/2026 · status: NOV SENT OUT.',
       'HPD C · Apt 3A · provide hot water at all hot water fixtures in the entire apartment…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18803447 · Class C · issued 4/22/2026 · status: NOV SENT OUT.', 'en', 'no-hot-water', 'high', 'new',
       'HPD import', true, '18803447'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18803447');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyiy-created', 'wo-mungpyiy', 'Reported: HPD C · Apt 3A · provide hot water at all hot water fixtures in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyiy'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyiy-created');

-- WO-MUNGPYIZ · Building 1 · Apt 10K · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyiz', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYIZ', 'HPD C · Apt 10K · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 19163379 · Class C · issued 8/26/2026 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 10K · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 19163379 · Class C · issued 8/26/2026 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '19163379'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '19163379');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyiz-created', 'wo-mungpyiz', 'Reported: HPD C · Apt 10K · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyiz'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyiz-created');

-- WO-MUNGPYJ0 · Building 1 · Apt 8B · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj0', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJ0', 'HPD B · Apt 8B · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROX 8 SQ. FT. AT CEILING IN THE BATHROOM LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST ORIGINAL VIOLATION 13624214 ISSUED 27-FEB-20 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 13711465 · Class B · issued 7/1/2020 · status: DEFECT LETTER ISSUED.',
       'HPD B · Apt 8B · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROX 8 SQ. FT. AT CEILING IN THE BATHROOM LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST ORIGINAL VIOLATION 13624214 ISSUED 27-FEB-20 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 13711465 · Class B · issued 7/1/2020 · status: DEFECT LETTER ISSUED.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '13711465'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '13711465');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj0-created', 'wo-mungpyj0', 'Reported: HPD B · Apt 8B · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj0'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj0-created');

-- WO-MUNGPYJ1 · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj1', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJ1', 'HPD B · Apt 12L · repair or replace the carbon monoxide detecting device(s). missing …', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881022 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · repair or replace the carbon monoxide detecting device(s). missing …', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881022 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881022'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881022');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj1-created', 'wo-mungpyj1', 'Reported: HPD B · Apt 12L · repair or replace the carbon monoxide detecting device(s). missing …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj1'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj1-created');

-- WO-MUNGPYJ2 · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj2', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJ2', 'HPD B · Apt 12L · repair or replace the smoke detector missing in the entire apartmen…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881023 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · repair or replace the smoke detector missing in the entire apartmen…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881023 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881023'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881023');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj2-created', 'wo-mungpyj2', 'Reported: HPD B · Apt 12L · repair or replace the smoke detector missing in the entire apartmen…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj2'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj2-created');

-- WO-MUNGPYJ3 · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj3', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJ3', 'HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR THE CEILING AND ALL WALLS IN THE 2nd ROOM FROM NORTH LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881025 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR THE CEILING AND ALL WALLS IN THE 2nd ROOM FROM NORTH LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881025 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881025'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881025');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj3-created', 'wo-mungpyj3', 'Reported: HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj3'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj3-created');

-- WO-MUNGPYJ4 · Building 1 · Apt 12L · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj4', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJ4', 'HPD B · Apt 12L · repair the roof so that it will not leak over ceiling in the 2nd ro…', '§ 27-2005 ADM CODE REPAIR THE ROOF SO THAT IT WILL NOT LEAK OVER CEILING IN THE 2nd ROOM FROM NORTH LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881026 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · repair the roof so that it will not leak over ceiling in the 2nd ro…', '§ 27-2005 ADM CODE REPAIR THE ROOF SO THAT IT WILL NOT LEAK OVER CEILING IN THE 2nd ROOM FROM NORTH LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881026 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '16881026'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881026');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj4-created', 'wo-mungpyj4', 'Reported: HPD B · Apt 12L · repair the roof so that it will not leak over ceiling in the 2nd ro…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj4'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj4-created');

-- WO-MUNGPYJ5 · Building 1 · Apt 12L · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj5', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJ5', 'HPD B · Apt 12L · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATE 15 SQ.FT MOLD AT CEILING IN THE 2nd ROOM FROM NORTH LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881027 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATE 15 SQ.FT MOLD AT CEILING IN THE 2nd ROOM FROM NORTH LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881027 · Class B · issued 4/17/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '16881027'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881027');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj5-created', 'wo-mungpyj5', 'Reported: HPD B · Apt 12L · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj5'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj5-created');

-- WO-MUNGPYJ6 · Building 1 · common area · Class B · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj6', b.id, null, b.org_id, 'WO-MUNGPYJ6', 'HPD B · common area · remove the illegal fastening consisting of an unacceptable electrom…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT 1ST STORY PUBLIC HALL AT PUBLIC HALL, 1st STORY

— From HPD violation 16881038 · Class B · issued 4/17/2024 · status: NOT COMPLIED WITH.',
       'HPD B · common area · remove the illegal fastening consisting of an unacceptable electrom…', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTROMAGNETIC LOCKING DEVICE INSTALLED AT VESTIBULE DOOR AT 1ST STORY PUBLIC HALL AT PUBLIC HALL, 1st STORY

— From HPD violation 16881038 · Class B · issued 4/17/2024 · status: NOT COMPLIED WITH.', 'en', 'common-area', 'normal', 'new',
       'HPD import', false, '16881038'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881038');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj6-created', 'wo-mungpyj6', 'Reported: HPD B · common area · remove the illegal fastening consisting of an unacceptable electrom…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj6'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj6-created');

-- WO-MUNGPYJ7 · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj7', b.id, null, b.org_id, 'WO-MUNGPYJ7', 'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR. AT PUBLIC HALL, 1st STORY

— From HPD violation 16881039 · Class B · issued 4/17/2024 · status: NOT COMPLIED WITH.',
       'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR. AT PUBLIC HALL, 1st STORY

— From HPD violation 16881039 · Class B · issued 4/17/2024 · status: NOT COMPLIED WITH.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '16881039'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881039');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj7-created', 'wo-mungpyj7', 'Reported: HPD B · common area · provide security in the event of a power outage by means of an acce…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj7'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj7-created');

-- WO-MUNGPYJ8 · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj8', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJ8', 'HPD B · Apt 12L · properly repair with similar material the broken or defective baseb…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE BASEBOARD AT SOUTH WALL IN THE PRIVATE HALLWAY LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881024 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · properly repair with similar material the broken or defective baseb…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE BASEBOARD AT SOUTH WALL IN THE PRIVATE HALLWAY LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881024 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881024'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881024');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj8-created', 'wo-mungpyj8', 'Reported: HPD B · Apt 12L · properly repair with similar material the broken or defective baseb…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj8'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj8-created');

-- WO-MUNGPYJ9 · Building 1 · Apt 12L · Class B · electrical
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyj9', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJ9', 'HPD B · Apt 12L · properly repair or replace the broken or defective electrical outle…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE ELECTRICAL OUTLET AT SOUTH WALL IN THE KITCHEN LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881028 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · properly repair or replace the broken or defective electrical outle…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE ELECTRICAL OUTLET AT SOUTH WALL IN THE KITCHEN LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881028 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'electrical', 'normal', 'new',
       'HPD import', false, '16881028'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881028');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyj9-created', 'wo-mungpyj9', 'Reported: HPD B · Apt 12L · properly repair or replace the broken or defective electrical outle…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyj9'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyj9-created');

-- WO-MUNGPYJA · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyja', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJA', 'HPD B · Apt 12L · refit doors at north and south upper wall cabinets in the kitchen …', '§ 27-2005 HMC: REFIT DOORS AT NORTH AND SOUTH UPPER WALL CABINETS IN THE KITCHEN LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881032 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · refit doors at north and south upper wall cabinets in the kitchen …', '§ 27-2005 HMC: REFIT DOORS AT NORTH AND SOUTH UPPER WALL CABINETS IN THE KITCHEN LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881032 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881032'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881032');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyja-created', 'wo-mungpyja', 'Reported: HPD B · Apt 12L · refit doors at north and south upper wall cabinets in the kitchen …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyja'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyja-created');

-- WO-MUNGPYJB · Building 1 · Apt 12L · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjb', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJB', 'HPD B · Apt 12L · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATE 10 SQ.FT MOLD AT CEILING IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881033 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATE 10 SQ.FT MOLD AT CEILING IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881033 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '16881033'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881033');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjb-created', 'wo-mungpyjb', 'Reported: HPD B · Apt 12L · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjb'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjb-created');

-- WO-MUNGPYJC · Building 1 · Apt 12L · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjc', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJC', 'HPD B · Apt 12L · properly secure the loose wash basin at north wall in the bathroom …', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE WASH BASIN AT NORTH WALL IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881034 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · properly secure the loose wash basin at north wall in the bathroom …', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE WASH BASIN AT NORTH WALL IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881034 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '16881034'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881034');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjc-created', 'wo-mungpyjc', 'Reported: HPD B · Apt 12L · properly secure the loose wash basin at north wall in the bathroom …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjc'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjc-created');

-- WO-MUNGPYJD · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjd', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJD', 'HPD B · Apt 12L · properly secure the loose base board at floor in the bathroom locat…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE BASE BOARD AT FLOOR IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881035 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · properly secure the loose base board at floor in the bathroom locat…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE BASE BOARD AT FLOOR IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881035 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881035'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881035');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjd-created', 'wo-mungpyjd', 'Reported: HPD B · Apt 12L · properly secure the loose base board at floor in the bathroom locat…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjd'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjd-created');

-- WO-MUNGPYJE · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyje', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJE', 'HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR ALL WALLS AND CEILING IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881036 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR ALL WALLS AND CEILING IN THE BATHROOM LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881036 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881036'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881036');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyje-created', 'wo-mungpyje', 'Reported: HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyje'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyje-created');

-- WO-MUNGPYJF · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjf', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJF', 'HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR ALL WALLS IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881037 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR ALL WALLS IN THE ENTIRE APARTMENT LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16881037 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16881037'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16881037');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjf-created', 'wo-mungpyjf', 'Reported: HPD B · Apt 12L · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjf'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjf-created');

-- WO-MUNGPYJG · Building 1 · Apt 12L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjg', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12L') limit 1), b.org_id, 'WO-MUNGPYJG', 'HPD B · Apt 12L · refit door at north wall base cabinet in the kitchen located at ap…', '§ 27-2005 HMC: REFIT DOOR AT NORTH WALL BASE CABINET IN THE KITCHEN LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16912918 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 12L · refit door at north wall base cabinet in the kitchen located at ap…', '§ 27-2005 HMC: REFIT DOOR AT NORTH WALL BASE CABINET IN THE KITCHEN LOCATED AT APT 12L, 12th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 16912918 · Class B · issued 4/18/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16912918'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16912918');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjg-created', 'wo-mungpyjg', 'Reported: HPD B · Apt 12L · refit door at north wall base cabinet in the kitchen located at ap…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjg'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjg-created');

-- WO-MUNGPYJH · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjh', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJH', 'HPD B · Apt 8B · properly repair with similar material the broken or defective vinyl…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE VINYL FLOOR TILES IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065798 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · properly repair with similar material the broken or defective vinyl…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE VINYL FLOOR TILES IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065798 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065798'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065798');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjh-created', 'wo-mungpyjh', 'Reported: HPD B · Apt 8B · properly repair with similar material the broken or defective vinyl…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjh'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjh-created');

-- WO-MUNGPYJI · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyji', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJI', 'HPD B · Apt 8B · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR NORTH AND SOUTH WALL IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065799 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR NORTH AND SOUTH WALL IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065799 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065799'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065799');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyji-created', 'wo-mungpyji', 'Reported: HPD B · Apt 8B · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyji'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyji-created');

-- WO-MUNGPYJJ · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjj', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJJ', 'HPD B · Apt 8B · properly repair or replace the broken or defective hinges at closet…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE HINGES AT CLOSET DOOR IN THE 1st ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065800 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · properly repair or replace the broken or defective hinges at closet…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE HINGES AT CLOSET DOOR IN THE 1st ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065800 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065800'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065800');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjj-created', 'wo-mungpyjj', 'Reported: HPD B · Apt 8B · properly repair or replace the broken or defective hinges at closet…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjj'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjj-created');

-- WO-MUNGPYJK · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjk', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJK', 'HPD B · Apt 8B · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR SOUTH WALL IN THE 1st ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065801 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR SOUTH WALL IN THE 1st ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065801 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065801'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065801');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjk-created', 'wo-mungpyjk', 'Reported: HPD B · Apt 8B · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjk'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjk-created');

-- WO-MUNGPYJL · Building 1 · Apt 8B · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjl', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJL', 'HPD B · Apt 8B · repair the leaky and/or defective faucets wash basin in the bathroo…', '§ 27-2026 ADM CODE REPAIR THE LEAKY AND/OR DEFECTIVE FAUCETS WASH BASIN IN THE BATHROOM LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065802 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · repair the leaky and/or defective faucets wash basin in the bathroo…', '§ 27-2026 ADM CODE REPAIR THE LEAKY AND/OR DEFECTIVE FAUCETS WASH BASIN IN THE BATHROOM LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065802 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '17065802'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065802');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjl-created', 'wo-mungpyjl', 'Reported: HPD B · Apt 8B · repair the leaky and/or defective faucets wash basin in the bathroo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjl'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjl-created');

-- WO-MUNGPYJM · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjm', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJM', 'HPD B · Apt 8B · properly secure the loose sink at north wall in the kitchen located…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE SINK AT NORTH WALL IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065803 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · properly secure the loose sink at north wall in the kitchen located…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE SINK AT NORTH WALL IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065803 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065803'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065803');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjm-created', 'wo-mungpyjm', 'Reported: HPD B · Apt 8B · properly secure the loose sink at north wall in the kitchen located…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjm'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjm-created');

-- WO-MUNGPYJN · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjn', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJN', 'HPD B · Apt 8B · properly repair or replace the broken or defective window upper sas…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE WINDOW UPPER SASH COUNTERBALANCE IN THE 1st ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065805 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · properly repair or replace the broken or defective window upper sas…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE WINDOW UPPER SASH COUNTERBALANCE IN THE 1st ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065805 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065805'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065805');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjn-created', 'wo-mungpyjn', 'Reported: HPD B · Apt 8B · properly repair or replace the broken or defective window upper sas…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjn'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjn-created');

-- WO-MUNGPYJO · Building 1 · Apt 8B · Class B · electrical
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjo', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJO', 'HPD B · Apt 8B · properly repair or replace the broken or defective light fixture at…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LIGHT FIXTURE AT WEST WALL IN THE BATHROOM LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065806 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · properly repair or replace the broken or defective light fixture at…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LIGHT FIXTURE AT WEST WALL IN THE BATHROOM LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065806 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'electrical', 'normal', 'new',
       'HPD import', false, '17065806'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065806');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjo-created', 'wo-mungpyjo', 'Reported: HPD B · Apt 8B · properly repair or replace the broken or defective light fixture at…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjo'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjo-created');

-- WO-MUNGPYJP · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjp', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJP', 'HPD B · Apt 8B · properly repair or replace the broken or defective sliding closet d…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE SLIDING CLOSET DOOR IN THE PRIVATE HALLWAY LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065807 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · properly repair or replace the broken or defective sliding closet d…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE SLIDING CLOSET DOOR IN THE PRIVATE HALLWAY LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065807 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065807'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065807');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjp-created', 'wo-mungpyjp', 'Reported: HPD B · Apt 8B · properly repair or replace the broken or defective sliding closet d…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjp'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjp-created');

-- WO-MUNGPYJQ · Building 1 · Apt 8B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjq', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYJQ', 'HPD B · Apt 8B · properly repair with similar material the broken or defective vinyl…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE VINYL FLOOR TILES IN THE 2nd ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065808 · Class B · issued 6/24/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 8B · properly repair with similar material the broken or defective vinyl…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE VINYL FLOOR TILES IN THE 2nd ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17065808 · Class B · issued 6/24/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17065808'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17065808');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjq-created', 'wo-mungpyjq', 'Reported: HPD B · Apt 8B · properly repair with similar material the broken or defective vinyl…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjq'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjq-created');

-- WO-MUNGPYJR · Building 1 · Apt 11B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjr', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11B') limit 1), b.org_id, 'WO-MUNGPYJR', 'HPD B · Apt 11B · properly repair with similar material the broken or defective wood …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE WOOD FLOOR IN THE 2nd ROOM FROM NORTH LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243853 · Class B · issued 9/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 11B · properly repair with similar material the broken or defective wood …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE WOOD FLOOR IN THE 2nd ROOM FROM NORTH LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243853 · Class B · issued 9/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17243853'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17243853');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjr-created', 'wo-mungpyjr', 'Reported: HPD B · Apt 11B · properly repair with similar material the broken or defective wood …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjr'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjr-created');

-- WO-MUNGPYJS · Building 1 · Apt 11B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjs', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11B') limit 1), b.org_id, 'WO-MUNGPYJS', 'HPD B · Apt 11B · properly repair or replace the broken or defective latch set in the…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH SET IN THE ENTRANCE LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243855 · Class B · issued 9/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 11B · properly repair or replace the broken or defective latch set in the…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH SET IN THE ENTRANCE LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243855 · Class B · issued 9/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17243855'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17243855');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjs-created', 'wo-mungpyjs', 'Reported: HPD B · Apt 11B · properly repair or replace the broken or defective latch set in the…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjs'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjs-created');

-- WO-MUNGPYJT · Building 1 · Apt 11B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjt', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11B') limit 1), b.org_id, 'WO-MUNGPYJT', 'HPD B · Apt 11B · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243856 · Class B · issued 9/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 11B · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243856 · Class B · issued 9/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17243856'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17243856');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjt-created', 'wo-mungpyjt', 'Reported: HPD B · Apt 11B · repair or replace the carbon monoxide detecting device(s). defectiv…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjt'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjt-created');

-- WO-MUNGPYJU · Building 1 · Apt 11B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyju', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11B') limit 1), b.org_id, 'WO-MUNGPYJU', 'HPD B · Apt 11B · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243857 · Class B · issued 9/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 11B · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17243857 · Class B · issued 9/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17243857'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17243857');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyju-created', 'wo-mungpyju', 'Reported: HPD B · Apt 11B · repair or replace the smoke detector defective in the entire apartm…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyju'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyju-created');

-- WO-MUNGPYJV · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjv', b.id, null, b.org_id, 'WO-MUNGPYJV', 'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17243859 · Class B · issued 9/5/2024 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17243859 · Class B · issued 9/5/2024 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '17243859'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17243859');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjv-created', 'wo-mungpyjv', 'Reported: HPD B · common area · provide security in the event of a power outage by means of an acce…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjv'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjv-created');

-- WO-MUNGPYJW · Building 1 · Apt 11B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjw', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11B') limit 1), b.org_id, 'WO-MUNGPYJW', 'HPD B · Apt 11B · properly repair or replace the broken or defective latch on apartme…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH ON APARTMENT DOOR IN THE ENTRANCE LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17276470 · Class B · issued 9/17/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 11B · properly repair or replace the broken or defective latch on apartme…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH ON APARTMENT DOOR IN THE ENTRANCE LOCATED AT APT 11B, 11th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17276470 · Class B · issued 9/17/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17276470'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17276470');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjw-created', 'wo-mungpyjw', 'Reported: HPD B · Apt 11B · properly repair or replace the broken or defective latch on apartme…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjw'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjw-created');

-- WO-MUNGPYJX · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjx', b.id, null, b.org_id, 'WO-MUNGPYJX', 'HPD B · common area · provide security in event of power outage by means of an mechanical…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN EVENT OF POWER OUTAGE BY MEANS OF AN MECHANICAL HEAVY DUTY LOCK AT VESTIBULE AT PUBLIC HALL, 1st STORY

— From HPD violation 17276472 · Class B · issued 9/17/2024 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in event of power outage by means of an mechanical…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN EVENT OF POWER OUTAGE BY MEANS OF AN MECHANICAL HEAVY DUTY LOCK AT VESTIBULE AT PUBLIC HALL, 1st STORY

— From HPD violation 17276472 · Class B · issued 9/17/2024 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '17276472'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17276472');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjx-created', 'wo-mungpyjx', 'Reported: HPD B · common area · provide security in event of power outage by means of an mechanical…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjx'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjx-created');

-- WO-MUNGPYJY · Building 1 · common area · Class B · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjy', b.id, null, b.org_id, 'WO-MUNGPYJY', 'HPD B · common area · remove the accumulation of refuse and/or rubbish and maintain in a …', '§ 27-2010, 2011, 2012 ADM CODE REMOVE THE ACCUMULATION OF REFUSE AND/OR RUBBISH AND MAINTAIN IN A CLEAN CONDITION THE PLYWOOD, GARBAGE BAGS AND ROOF SHEATHING MATERIALS COURT

— From HPD violation 17291693 · Class B · issued 9/23/2024 · status: NOV SENT OUT.',
       'HPD B · common area · remove the accumulation of refuse and/or rubbish and maintain in a …', '§ 27-2010, 2011, 2012 ADM CODE REMOVE THE ACCUMULATION OF REFUSE AND/OR RUBBISH AND MAINTAIN IN A CLEAN CONDITION THE PLYWOOD, GARBAGE BAGS AND ROOF SHEATHING MATERIALS COURT

— From HPD violation 17291693 · Class B · issued 9/23/2024 · status: NOV SENT OUT.', 'en', 'common-area', 'normal', 'new',
       'HPD import', false, '17291693'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17291693');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjy-created', 'wo-mungpyjy', 'Reported: HPD B · common area · remove the accumulation of refuse and/or rubbish and maintain in a …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjy'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjy-created');

-- WO-MUNGPYJZ · Building 1 · Apt 12K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyjz', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12K') limit 1), b.org_id, 'WO-MUNGPYJZ', 'HPD B · Apt 12K · repair or replace the smoke detector missing in the entire apartmen…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12K, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317499 · Class B · issued 10/3/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 12K · repair or replace the smoke detector missing in the entire apartmen…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12K, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317499 · Class B · issued 10/3/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17317499'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17317499');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyjz-created', 'wo-mungpyjz', 'Reported: HPD B · Apt 12K · repair or replace the smoke detector missing in the entire apartmen…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyjz'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyjz-created');

-- WO-MUNGPYK0 · Building 1 · Apt 12K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk0', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12K') limit 1), b.org_id, 'WO-MUNGPYK0', 'HPD B · Apt 12K · repair or replace the carbon monoxide detecting device(s). missing …', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12K, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317500 · Class B · issued 10/3/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 12K · repair or replace the carbon monoxide detecting device(s). missing …', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). MISSING IN THE ENTIRE APARTMENT LOCATED AT APT 12K, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT NORTH

— From HPD violation 17317500 · Class B · issued 10/3/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17317500'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17317500');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk0-created', 'wo-mungpyk0', 'Reported: HPD B · Apt 12K · repair or replace the carbon monoxide detecting device(s). missing …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk0'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk0-created');

-- WO-MUNGPYK1 · Building 1 · Apt 4A · Class B · appliance
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk1', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('4A') limit 1), b.org_id, 'WO-MUNGPYK1', 'HPD B · Apt 4A · provide an adequate supply of gas to the fixtures at range in the k…', '§ 27-2070 ADM CODE PROVIDE AN ADEQUATE SUPPLY OF GAS TO THE FIXTURES AT RANGE IN THE KITCHEN LOCATED AT APT 4A, 4th STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368767 · Class B · issued 10/31/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 4A · provide an adequate supply of gas to the fixtures at range in the k…', '§ 27-2070 ADM CODE PROVIDE AN ADEQUATE SUPPLY OF GAS TO THE FIXTURES AT RANGE IN THE KITCHEN LOCATED AT APT 4A, 4th STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368767 · Class B · issued 10/31/2024 · status: NOV SENT OUT.', 'en', 'appliance', 'normal', 'new',
       'HPD import', false, '17368767'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17368767');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk1-created', 'wo-mungpyk1', 'Reported: HPD B · Apt 4A · provide an adequate supply of gas to the fixtures at range in the k…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk1'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk1-created');

-- WO-MUNGPYK2 · Building 1 · Apt 3A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk2', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3A') limit 1), b.org_id, 'WO-MUNGPYK2', 'HPD B · Apt 3A · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT CEILING IN THE BATHROOM LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368784 · Class B · issued 10/31/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 3A · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT CEILING IN THE BATHROOM LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368784 · Class B · issued 10/31/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17368784'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17368784');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk2-created', 'wo-mungpyk2', 'Reported: HPD B · Apt 3A · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk2'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk2-created');

-- WO-MUNGPYK3 · Building 1 · Apt 3A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk3', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3A') limit 1), b.org_id, 'WO-MUNGPYK3', 'HPD B · Apt 3A · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT CEILING IN THE 4th ROOM FROM NORTH LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368788 · Class B · issued 10/31/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 3A · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT CEILING IN THE 4th ROOM FROM NORTH LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 17368788 · Class B · issued 10/31/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17368788'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17368788');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk3-created', 'wo-mungpyk3', 'Reported: HPD B · Apt 3A · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk3'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk3-created');

-- WO-MUNGPYK4 · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk4', b.id, null, b.org_id, 'WO-MUNGPYK4', 'HPD B · common area · provide security in the event of power outage by means of an accept…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF POWER OUTAGE BY MEANS OF AN ACCEPTABLE HEAVY DUTY LOCK AND LATCH SET AT THE BUILDING VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17391383 · Class B · issued 10/31/2024 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in the event of power outage by means of an accept…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF POWER OUTAGE BY MEANS OF AN ACCEPTABLE HEAVY DUTY LOCK AND LATCH SET AT THE BUILDING VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17391383 · Class B · issued 10/31/2024 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '17391383'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17391383');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk4-created', 'wo-mungpyk4', 'Reported: HPD B · common area · provide security in the event of power outage by means of an accept…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk4'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk4-created');

-- WO-MUNGPYK5 · Building 1 · Apt 12A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk5', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12A') limit 1), b.org_id, 'WO-MUNGPYK5', 'HPD B · Apt 12A · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 12A, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 17433893 · Class B · issued 11/25/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 12A · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 12A, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 17433893 · Class B · issued 11/25/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17433893'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17433893');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk5-created', 'wo-mungpyk5', 'Reported: HPD B · Apt 12A · repair or replace the carbon monoxide detecting device(s). defectiv…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk5'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk5-created');

-- WO-MUNGPYK6 · Building 1 · Apt 12A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk6', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12A') limit 1), b.org_id, 'WO-MUNGPYK6', 'HPD B · Apt 12A · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 12A, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 17433894 · Class B · issued 11/25/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 12A · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 12A, 12th STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 17433894 · Class B · issued 11/25/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17433894'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17433894');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk6-created', 'wo-mungpyk6', 'Reported: HPD B · Apt 12A · repair or replace the smoke detector defective in the entire apartm…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk6'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk6-created');

-- WO-MUNGPYK7 · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk7', b.id, null, b.org_id, 'WO-MUNGPYK7', 'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVYDUTY LOCK AND LATCH SET AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17433897 · Class B · issued 11/25/2024 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVYDUTY LOCK AND LATCH SET AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 17433897 · Class B · issued 11/25/2024 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '17433897'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17433897');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk7-created', 'wo-mungpyk7', 'Reported: HPD B · common area · provide security in the event of a power outage by means of an acce…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk7'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk7-created');

-- WO-MUNGPYK8 · Building 1 · Apt 10K · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk8', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYK8', 'HPD B · Apt 10K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... GREATER THAN 10 SQ.FT AT CEILING, WEST WALL AND EAST WALL IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225131 · Class B · issued 9/15/2025 · status: DEFECT LETTER ISSUED.',
       'HPD B · Apt 10K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... GREATER THAN 10 SQ.FT AT CEILING, WEST WALL AND EAST WALL IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225131 · Class B · issued 9/15/2025 · status: DEFECT LETTER ISSUED.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '18225131'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225131');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk8-created', 'wo-mungpyk8', 'Reported: HPD B · Apt 10K · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk8'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk8-created');

-- WO-MUNGPYK9 · Building 1 · Apt 10K · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyk9', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYK9', 'HPD B · Apt 10K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT CEILING IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225132 · Class B · issued 9/15/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 10K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT CEILING IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225132 · Class B · issued 9/15/2025 · status: NOV SENT OUT.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '18225132'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225132');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyk9-created', 'wo-mungpyk9', 'Reported: HPD B · Apt 10K · properly repair the source and abate the evidence of a water leak a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyk9'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyk9-created');

-- WO-MUNGPYKA · Building 1 · Apt 10K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyka', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYKA', 'HPD B · Apt 10K · properly repair or replace the broken or defective door at entrance…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE DOOR AT ENTRANCE IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225133 · Class B · issued 9/15/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 10K · properly repair or replace the broken or defective door at entrance…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE DOOR AT ENTRANCE IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225133 · Class B · issued 9/15/2025 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18225133'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225133');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyka-created', 'wo-mungpyka', 'Reported: HPD B · Apt 10K · properly repair or replace the broken or defective door at entrance…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyka'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyka-created');

-- WO-MUNGPYKB · Building 1 · Apt 10K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykb', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYKB', 'HPD B · Apt 10K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225135 · Class B · issued 9/15/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 10K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225135 · Class B · issued 9/15/2025 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18225135'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225135');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykb-created', 'wo-mungpykb', 'Reported: HPD B · Apt 10K · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykb'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykb-created');

-- WO-MUNGPYKC · Building 1 · Apt 10K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykc', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYKC', 'HPD B · Apt 10K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR THE CEILING, EAST WALL AND WEST WALL IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225136 · Class B · issued 9/15/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 10K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR THE CEILING, EAST WALL AND WEST WALL IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225136 · Class B · issued 9/15/2025 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18225136'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225136');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykc-created', 'wo-mungpykc', 'Reported: HPD B · Apt 10K · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykc'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykc-created');

-- WO-MUNGPYKD · Building 1 · Apt 10K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykd', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYKD', 'HPD B · Apt 10K · properly repair or replace the broken or defective mechanical venti…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE MECHANICAL VENTILATION SYSTEM AT NORTH WALL IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225137 · Class B · issued 9/15/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 10K · properly repair or replace the broken or defective mechanical venti…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE MECHANICAL VENTILATION SYSTEM AT NORTH WALL IN THE BATHROOM LOCATED AT APT 10K, 10th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 18225137 · Class B · issued 9/15/2025 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18225137'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18225137');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykd-created', 'wo-mungpykd', 'Reported: HPD B · Apt 10K · properly repair or replace the broken or defective mechanical venti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykd'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykd-created');

-- WO-MUNGPYKE · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyke', b.id, null, b.org_id, 'WO-MUNGPYKE', 'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK SET VESTIBULE DOOR , 1st STORY

— From HPD violation 18362239 · Class B · issued 11/12/2025 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK SET VESTIBULE DOOR , 1st STORY

— From HPD violation 18362239 · Class B · issued 11/12/2025 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '18362239'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18362239');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyke-created', 'wo-mungpyke', 'Reported: HPD B · common area · provide security in the event of a power outage by means of an acce…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyke'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyke-created');

-- WO-MUNGPYKF · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykf', b.id, null, b.org_id, 'WO-MUNGPYKF', 'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 18629043 · Class B · issued 2/10/2026 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR AT PUBLIC HALL, 1st STORY

— From HPD violation 18629043 · Class B · issued 2/10/2026 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '18629043'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18629043');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykf-created', 'wo-mungpykf', 'Reported: HPD B · common area · provide security in the event of a power outage by means of an acce…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykf'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykf-created');

-- WO-MUNGPYKG · Building 1 · Apt 1A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykg', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1A') limit 1), b.org_id, 'WO-MUNGPYKG', 'HPD B · Apt 1A · refit door and frame rubbing at door in the entrance located at ap…', '§ 27-2005 HMC: REFIT DOOR AND FRAME RUBBING AT DOOR IN THE ENTRANCE LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629044 · Class B · issued 2/10/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 1A · refit door and frame rubbing at door in the entrance located at ap…', '§ 27-2005 HMC: REFIT DOOR AND FRAME RUBBING AT DOOR IN THE ENTRANCE LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629044 · Class B · issued 2/10/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18629044'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18629044');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykg-created', 'wo-mungpykg', 'Reported: HPD B · Apt 1A · refit door and frame rubbing at door in the entrance located at ap…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykg'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykg-created');

-- WO-MUNGPYKH · Building 1 · Apt 1A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykh', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1A') limit 1), b.org_id, 'WO-MUNGPYKH', 'HPD B · Apt 1A · repair, replace or provide an approved and operational carbon monox…', '§ 27-2045(B)(1)(B) HMC, § 12-06, § 12-07, § 12-09 RCNY REPAIR, REPLACE OR PROVIDE AN APPROVED AND OPERATIONAL CARBON MONOXIDE DETECTING DEVICE, INSTALLED IN ACCORDANCE WITH APPLICABLE LAW AND RULES DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629047 · Class B · issued 2/10/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 1A · repair, replace or provide an approved and operational carbon monox…', '§ 27-2045(B)(1)(B) HMC, § 12-06, § 12-07, § 12-09 RCNY REPAIR, REPLACE OR PROVIDE AN APPROVED AND OPERATIONAL CARBON MONOXIDE DETECTING DEVICE, INSTALLED IN ACCORDANCE WITH APPLICABLE LAW AND RULES DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629047 · Class B · issued 2/10/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18629047'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18629047');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykh-created', 'wo-mungpykh', 'Reported: HPD B · Apt 1A · repair, replace or provide an approved and operational carbon monox…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykh'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykh-created');

-- WO-MUNGPYKI · Building 1 · Apt 1A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyki', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1A') limit 1), b.org_id, 'WO-MUNGPYKI', 'HPD B · Apt 1A · repair, replace or provide an approved and operational smoke detect…', '§ 27-2045(B)(1)(A) HMC, § 12-01, § 12-03 RCNY REPAIR, REPLACE OR PROVIDE AN APPROVED AND OPERATIONAL SMOKE DETECTING DEVICE, INSTALLED IN ACCORDANCE WITH DEPARTMENT OF BUILDINGS RULES AND REGULATIONS DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629048 · Class B · issued 2/10/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 1A · repair, replace or provide an approved and operational smoke detect…', '§ 27-2045(B)(1)(A) HMC, § 12-01, § 12-03 RCNY REPAIR, REPLACE OR PROVIDE AN APPROVED AND OPERATIONAL SMOKE DETECTING DEVICE, INSTALLED IN ACCORDANCE WITH DEPARTMENT OF BUILDINGS RULES AND REGULATIONS DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 1A, 1st STORY, 1st APARTMENT FROM NORTH AT EAST , SECTION AT SOUTH

— From HPD violation 18629048 · Class B · issued 2/10/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18629048'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18629048');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyki-created', 'wo-mungpyki', 'Reported: HPD B · Apt 1A · repair, replace or provide an approved and operational smoke detect…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyki'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyki-created');

-- WO-MUNGPYKJ · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykj', b.id, null, b.org_id, 'WO-MUNGPYKJ', 'HPD B · common area · provide security in the event of power outage by means of an accept…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY-DUTY LOCK AND LATCH SET AT VESTIBULE DOOR TO BUILDING 1ST STORY AT PUBLIC HALL, 1st STORY

— From HPD violation 18653970 · Class B · issued 2/19/2026 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in the event of power outage by means of an accept…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY-DUTY LOCK AND LATCH SET AT VESTIBULE DOOR TO BUILDING 1ST STORY AT PUBLIC HALL, 1st STORY

— From HPD violation 18653970 · Class B · issued 2/19/2026 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '18653970'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18653970');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykj-created', 'wo-mungpykj', 'Reported: HPD B · common area · provide security in the event of power outage by means of an accept…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykj'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykj-created');

-- WO-MUNGPYKK · Building 1 · Apt 12G · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykk', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('12G') limit 1), b.org_id, 'WO-MUNGPYKK', 'HPD B · Apt 12G · repair, replace or provide an approved and operational carbon monox…', '§ 27-2045(B)(1)(B) HMC, § 12-06, § 12-07, § 12-09 RCNY REPAIR, REPLACE OR PROVIDE AN APPROVED AND OPERATIONAL CARBON MONOXIDE DETECTING DEVICE, INSTALLED IN ACCORDANCE WITH APPLICABLE LAW AND RULES DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 12G, 12th STORY, 5th APARTMENT FROM SOUTH AT WEST

— From HPD violation 18667870 · Class B · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 12G · repair, replace or provide an approved and operational carbon monox…', '§ 27-2045(B)(1)(B) HMC, § 12-06, § 12-07, § 12-09 RCNY REPAIR, REPLACE OR PROVIDE AN APPROVED AND OPERATIONAL CARBON MONOXIDE DETECTING DEVICE, INSTALLED IN ACCORDANCE WITH APPLICABLE LAW AND RULES DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 12G, 12th STORY, 5th APARTMENT FROM SOUTH AT WEST

— From HPD violation 18667870 · Class B · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18667870'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667870');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykk-created', 'wo-mungpykk', 'Reported: HPD B · Apt 12G · repair, replace or provide an approved and operational carbon monox…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykk'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykk-created');

-- WO-MUNGPYKL · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykl', b.id, null, b.org_id, 'WO-MUNGPYKL', 'HPD B · common area · provide security by means of an acceptable mechanical heavy duty lo…', '§ 27-2005 ADM CODE PROVIDE SECURITY BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR , 1st STORY

— From HPD violation 18667872 · Class B · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD B · common area · provide security by means of an acceptable mechanical heavy duty lo…', '§ 27-2005 ADM CODE PROVIDE SECURITY BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT VESTIBULE DOOR , 1st STORY

— From HPD violation 18667872 · Class B · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '18667872'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667872');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykl-created', 'wo-mungpykl', 'Reported: HPD B · common area · provide security by means of an acceptable mechanical heavy duty lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykl'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykl-created');

-- WO-MUNGPYKM · Building 1 · common area · Class B · lock-key
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykm', b.id, null, b.org_id, 'WO-MUNGPYKM', 'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT FIRE EXIT DOOR LEADING TO EAST YARD AT CELLAR

— From HPD violation 18667874 · Class B · issued 2/26/2026 · status: NOV SENT OUT.',
       'HPD B · common area · provide security in the event of a power outage by means of an acce…', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK AND LATCH SET AT FIRE EXIT DOOR LEADING TO EAST YARD AT CELLAR

— From HPD violation 18667874 · Class B · issued 2/26/2026 · status: NOV SENT OUT.', 'en', 'lock-key', 'normal', 'new',
       'HPD import', false, '18667874'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18667874');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykm-created', 'wo-mungpykm', 'Reported: HPD B · common area · provide security in the event of a power outage by means of an acce…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykm'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykm-created');

-- WO-MUNGPYKN · Building 1 · Apt 4A · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykn', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('4A') limit 1), b.org_id, 'WO-MUNGPYKN', 'HPD B · Apt 4A · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILES AT FLOOR AND SOUTH WALL IN THE BATHROOM LOCATED AT APT 4A, 4th STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18694658 · Class B · issued 3/10/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 4A · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILES AT FLOOR AND SOUTH WALL IN THE BATHROOM LOCATED AT APT 4A, 4th STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18694658 · Class B · issued 3/10/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18694658'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18694658');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykn-created', 'wo-mungpykn', 'Reported: HPD B · Apt 4A · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykn'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykn-created');

-- WO-MUNGPYKO · Building 1 · Apt 11D · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyko', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11D') limit 1), b.org_id, 'WO-MUNGPYKO', 'HPD B · Apt 11D · properly secure the loose toilet seat at water closet in the bathro…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE TOILET SEAT AT WATER CLOSET IN THE BATHROOM LOCATED AT APT 11D, 10th STORY, 2nd APARTMENT FROM WEST AT NORTH

— From HPD violation 19126952 · Class B · issued 8/10/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 11D · properly secure the loose toilet seat at water closet in the bathro…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE TOILET SEAT AT WATER CLOSET IN THE BATHROOM LOCATED AT APT 11D, 10th STORY, 2nd APARTMENT FROM WEST AT NORTH

— From HPD violation 19126952 · Class B · issued 8/10/2026 · status: NOV SENT OUT.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '19126952'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '19126952');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyko-created', 'wo-mungpyko', 'Reported: HPD B · Apt 11D · properly secure the loose toilet seat at water closet in the bathro…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyko'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyko-created');

-- WO-MUNGPYKP · Building 1 · Apt 10K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykp', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYKP', 'HPD B · Apt 10K · properly repair or replace the broken or defective mechanical vent …', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE MECHANICAL VENT IN THE BATHROOM LOCATED AT APT 10K, 7th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 19104618 · Class B · issued 8/20/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 10K · properly repair or replace the broken or defective mechanical vent …', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE MECHANICAL VENT IN THE BATHROOM LOCATED AT APT 10K, 7th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 19104618 · Class B · issued 8/20/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '19104618'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '19104618');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykp-created', 'wo-mungpykp', 'Reported: HPD B · Apt 10K · properly repair or replace the broken or defective mechanical vent …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykp'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykp-created');

-- WO-MUNGPYKQ · Building 1 · Apt 10K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykq', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10K') limit 1), b.org_id, 'WO-MUNGPYKQ', 'HPD B · Apt 10K · properly repair or replace the broken or defective cracked window p…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE CRACKED WINDOW PANE- UPPER SASH AT 3RD WINDOW FROM NORTH IN THE 1st LIVING ROOM FROM EAST LOCATED AT APT 10K, 7th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 19104619 · Class B · issued 8/20/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 10K · properly repair or replace the broken or defective cracked window p…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE CRACKED WINDOW PANE- UPPER SASH AT 3RD WINDOW FROM NORTH IN THE 1st LIVING ROOM FROM EAST LOCATED AT APT 10K, 7th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 19104619 · Class B · issued 8/20/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '19104619'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '19104619');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykq-created', 'wo-mungpykq', 'Reported: HPD B · Apt 10K · properly repair or replace the broken or defective cracked window p…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykq'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykq-created');

-- WO-MUNGPYKR · Building 1 · Apt 8B · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykr', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYKR', 'HPD A · Apt 8B · properly repair the broken or defective lower sash of window at eas…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOWER SASH OF WINDOW AT EAST WALL IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13624162 · Class A · issued 3/2/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 8B · properly repair the broken or defective lower sash of window at eas…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOWER SASH OF WINDOW AT EAST WALL IN THE KITCHEN LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13624162 · Class A · issued 3/2/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '13624162'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '13624162');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykr-created', 'wo-mungpykr', 'Reported: HPD A · Apt 8B · properly repair the broken or defective lower sash of window at eas…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykr'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykr-created');

-- WO-MUNGPYKS · Building 1 · Apt 8B · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyks', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYKS', 'HPD A · Apt 8B · properly repair the broken or defective lower sash of window at eas…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOWER SASH OF WINDOW AT EAST WALL IN THE 2nd ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13624171 · Class A · issued 3/2/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 8B · properly repair the broken or defective lower sash of window at eas…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOWER SASH OF WINDOW AT EAST WALL IN THE 2nd ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13624171 · Class A · issued 3/2/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '13624171'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '13624171');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyks-created', 'wo-mungpyks', 'Reported: HPD A · Apt 8B · properly repair the broken or defective lower sash of window at eas…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyks'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyks-created');

-- WO-MUNGPYKT · Building 1 · Apt 8B · Class A · intercom
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykt', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYKT', 'HPD A · Apt 8B · properly repair the broken or defective intercom at entrance locate…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE INTERCOM AT ENTRANCE LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13624180 · Class A · issued 3/2/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 8B · properly repair the broken or defective intercom at entrance locate…', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE INTERCOM AT ENTRANCE LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13624180 · Class A · issued 3/2/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'intercom', 'low', 'new',
       'HPD import', false, '13624180'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '13624180');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykt-created', 'wo-mungpykt', 'Reported: HPD A · Apt 8B · properly repair the broken or defective intercom at entrance locate…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykt'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykt-created');

-- WO-MUNGPYKU · Building 1 · Apt 8B · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyku', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('8B') limit 1), b.org_id, 'WO-MUNGPYKU', 'HPD A · Apt 8B · refit sliding doors in west wall closet. in the 2nd room from north…', '§ 27-2005 ADM CODE REFIT SLIDING DOORS IN WEST WALL CLOSET. IN THE 2nd ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13761490 · Class A · issued 8/12/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 8B · refit sliding doors in west wall closet. in the 2nd room from north…', '§ 27-2005 ADM CODE REFIT SLIDING DOORS IN WEST WALL CLOSET. IN THE 2nd ROOM FROM NORTH LOCATED AT APT 8B, 8th STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 13761490 · Class A · issued 8/12/2020 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '13761490'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '13761490');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyku-created', 'wo-mungpyku', 'Reported: HPD A · Apt 8B · refit sliding doors in west wall closet. in the 2nd room from north…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyku'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyku-created');

-- WO-MUNGPYKV · Building 1 · common area · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykv', b.id, null, b.org_id, 'WO-MUNGPYKV', 'HPD A · common area · post a proper notice regarding rent stabilization law, in a form ap…', '§27-2104(B) HMC POST A PROPER NOTICE REGARDING RENT STABILIZATION LAW, IN A FORM APPROVED BY THE COMMISSIONER, IN A CONSPICUOUS LOCATION WITHIN THE COMMON AREA AT THE BUILDINGS ENTRANCE. FOR MORE INFORMATION ABOUT SIGNAGE REQUIREMENTS, PLEASE VISIT: HTTPS://WWW.NYC.GOV/SITE/HPD/SERVICES-AND-INFORMATION/REQUIRED-SIGNAGE.PAGE

— From HPD violation 18912980 · Class A · issued 5/13/2026 · status: NOV SENT OUT.',
       'HPD A · common area · post a proper notice regarding rent stabilization law, in a form ap…', '§27-2104(B) HMC POST A PROPER NOTICE REGARDING RENT STABILIZATION LAW, IN A FORM APPROVED BY THE COMMISSIONER, IN A CONSPICUOUS LOCATION WITHIN THE COMMON AREA AT THE BUILDINGS ENTRANCE. FOR MORE INFORMATION ABOUT SIGNAGE REQUIREMENTS, PLEASE VISIT: HTTPS://WWW.NYC.GOV/SITE/HPD/SERVICES-AND-INFORMATION/REQUIRED-SIGNAGE.PAGE

— From HPD violation 18912980 · Class A · issued 5/13/2026 · status: NOV SENT OUT.', 'en', 'other', 'low', 'new',
       'HPD import', false, '18912980'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18912980');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykv-created', 'wo-mungpykv', 'Reported: HPD A · common area · post a proper notice regarding rent stabilization law, in a form ap…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykv'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykv-created');

-- WO-MUNGPYKW · Building 1 · common area · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykw', b.id, null, b.org_id, 'WO-MUNGPYKW', 'HPD A · common area · post a proper notice regarding rent stabilization law, in a form ap…', '§27-2104(B) HMC POST A PROPER NOTICE REGARDING RENT STABILIZATION LAW, IN A FORM APPROVED BY THE COMMISSIONER, IN A CONSPICUOUS LOCATION WITHIN THE COMMON AREA AT THE BUILDINGS ENTRANCE. FOR MORE INFORMATION ABOUT SIGNAGE REQUIREMENTS, PLEASE VISIT: HTTPS://WWW.NYC.GOV/SITE/HPD/SERVICES-AND-INFORMATION/REQUIRED-SIGNAGE.PAGE

— From HPD violation 19126953 · Class A · issued 8/10/2026 · status: NOV SENT OUT.',
       'HPD A · common area · post a proper notice regarding rent stabilization law, in a form ap…', '§27-2104(B) HMC POST A PROPER NOTICE REGARDING RENT STABILIZATION LAW, IN A FORM APPROVED BY THE COMMISSIONER, IN A CONSPICUOUS LOCATION WITHIN THE COMMON AREA AT THE BUILDINGS ENTRANCE. FOR MORE INFORMATION ABOUT SIGNAGE REQUIREMENTS, PLEASE VISIT: HTTPS://WWW.NYC.GOV/SITE/HPD/SERVICES-AND-INFORMATION/REQUIRED-SIGNAGE.PAGE

— From HPD violation 19126953 · Class A · issued 8/10/2026 · status: NOV SENT OUT.', 'en', 'other', 'low', 'new',
       'HPD import', false, '19126953'
  from public.buildings b
 where b.name = 'Building 1'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '19126953');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykw-created', 'wo-mungpykw', 'Reported: HPD A · common area · post a proper notice regarding rent stabilization law, in a form ap…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykw'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykw-created');

-- WO-MUNGPYKX · Building 2 · Apt 1B · Class C · no-hot-water
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykx', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1B') limit 1), b.org_id, 'WO-MUNGPYKX', 'HPD C · Apt 1B · provide hot water at all hot water fixtures in the bathroom located…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE BATHROOM LOCATED AT APT 1B, 2nd STORY, 6th APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605042 · Class C · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 1B · provide hot water at all hot water fixtures in the bathroom located…', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE BATHROOM LOCATED AT APT 1B, 2nd STORY, 6th APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605042 · Class C · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'no-hot-water', 'high', 'new',
       'HPD import', true, '16605042'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16605042');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykx-created', 'wo-mungpykx', 'Reported: HPD C · Apt 1B · provide hot water at all hot water fixtures in the bathroom located…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykx'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykx-created');

-- WO-MUNGPYKY · Building 2 · common area · Class C · electrical
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyky', b.id, null, b.org_id, 'WO-MUNGPYKY', 'HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE HINGES ON WEST WALL DOOR LEADING TO ELECTRICAL ROOM AREA AT CELLAR

— From HPD violation 17040597 · Class C · issued 6/11/2024 · status: NOT COMPLIED WITH.',
       'HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE HINGES ON WEST WALL DOOR LEADING TO ELECTRICAL ROOM AREA AT CELLAR

— From HPD violation 17040597 · Class C · issued 6/11/2024 · status: NOT COMPLIED WITH.', 'en', 'electrical', 'high', 'new',
       'HPD import', false, '17040597'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17040597');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyky-created', 'wo-mungpyky', 'Reported: HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyky'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyky-created');

-- WO-MUNGPYKZ · Building 2 · Apt 1D · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpykz', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1D') limit 1), b.org_id, 'WO-MUNGPYKZ', 'HPD C · Apt 1D · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821398 · Class C · issued 4/14/2025 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 1D · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821398 · Class C · issued 4/14/2025 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17821398'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17821398');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpykz-created', 'wo-mungpykz', 'Reported: HPD C · Apt 1D · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpykz'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpykz-created');

-- WO-MUNGPYL0 · Building 2 · Apt 1D · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl0', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1D') limit 1), b.org_id, 'WO-MUNGPYL0', 'HPD C · Apt 1D · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821401 · Class C · issued 4/14/2025 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 1D · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821401 · Class C · issued 4/14/2025 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17821401'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17821401');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl0-created', 'wo-mungpyl0', 'Reported: HPD C · Apt 1D · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl0'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl0-created');

-- WO-MUNGPYL1 · Building 2 · common area · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl1', b.id, null, b.org_id, 'WO-MUNGPYL1', 'HPD C · common area · provide ready access to buildings heating system boiler room door l…', '§ 27-2033 ADM CODE PROVIDE READY ACCESS TO BUILDINGS HEATING SYSTEM BOILER ROOM DOOR LOCKED AT BASEMENT AT BOILER ROOM, 1st STORY

— From HPD violation 18620968 · Class C · issued 2/6/2026 · status: NOV SENT OUT.',
       'HPD C · common area · provide ready access to buildings heating system boiler room door l…', '§ 27-2033 ADM CODE PROVIDE READY ACCESS TO BUILDINGS HEATING SYSTEM BOILER ROOM DOOR LOCKED AT BASEMENT AT BOILER ROOM, 1st STORY

— From HPD violation 18620968 · Class C · issued 2/6/2026 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18620968'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18620968');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl1-created', 'wo-mungpyl1', 'Reported: HPD C · common area · provide ready access to buildings heating system boiler room door l…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl1'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl1-created');

-- WO-MUNGPYL2 · Building 2 · common area · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl2', b.id, null, b.org_id, 'WO-MUNGPYL2', 'HPD C · common area · properly repair with similar material the broken or defective fire …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETARDANT MATERIAL AT CEILING AT BASEMENT

— From HPD violation 18639717 · Class C · issued 2/13/2026 · status: NOV SENT OUT.',
       'HPD C · common area · properly repair with similar material the broken or defective fire …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETARDANT MATERIAL AT CEILING AT BASEMENT

— From HPD violation 18639717 · Class C · issued 2/13/2026 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '18639717'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18639717');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl2-created', 'wo-mungpyl2', 'Reported: HPD C · common area · properly repair with similar material the broken or defective fire …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl2'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl2-created');

-- WO-MUNGPYL3 · Building 2 · Apt 6K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl3', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYL3', 'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15937363 · Class B · issued 4/24/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15937363 · Class B · issued 4/24/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '15937363'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15937363');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl3-created', 'wo-mungpyl3', 'Reported: HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl3'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl3-created');

-- WO-MUNGPYL4 · Building 2 · Apt 6K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl4', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYL4', 'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILES AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964310 · Class B · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILES AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964310 · Class B · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '15964310'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15964310');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl4-created', 'wo-mungpyl4', 'Reported: HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl4'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl4-created');

-- WO-MUNGPYL5 · Building 2 · Apt 6K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl5', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYL5', 'HPD B · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT EAST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964312 · Class B · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT EAST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964312 · Class B · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '15964312'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15964312');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl5-created', 'wo-mungpyl5', 'Reported: HPD B · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl5'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl5-created');

-- WO-MUNGPYL6 · Building 2 · Apt 6K · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl6', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYL6', 'HPD B · Apt 6K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964314 · Class B · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964314 · Class B · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '15964314'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15964314');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl6-created', 'wo-mungpyl6', 'Reported: HPD B · Apt 6K · properly repair the source and abate the evidence of a water leak a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl6'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl6-created');

-- WO-MUNGPYL7 · Building 2 · Apt 6K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl7', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYL7', 'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILE AT EAST WALL & FLOOR IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024650 · Class B · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILE AT EAST WALL & FLOOR IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024650 · Class B · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16024650'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16024650');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl7-created', 'wo-mungpyl7', 'Reported: HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl7'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl7-created');

-- WO-MUNGPYL8 · Building 2 · Apt 6K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl8', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYL8', 'HPD B · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR THE WEST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024652 · Class B · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR THE WEST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024652 · Class B · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16024652'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16024652');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl8-created', 'wo-mungpyl8', 'Reported: HPD B · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl8'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl8-created');

-- WO-MUNGPYL9 · Building 2 · Apt 6K · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyl9', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYL9', 'HPD B · Apt 6K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATELY 2 SQUARE FEET AT EAST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST ORIGINAL VIOLATION 16024654 ISSUED 07-JUN-23 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 16297599 · Class B · issued 10/10/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATELY 2 SQUARE FEET AT EAST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST ORIGINAL VIOLATION 16024654 ISSUED 07-JUN-23 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 16297599 · Class B · issued 10/10/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '16297599'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16297599');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyl9-created', 'wo-mungpyl9', 'Reported: HPD B · Apt 6K · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyl9'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyl9-created');

-- WO-MUNGPYLA · Building 2 · Apt 6K · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyla', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLA', 'HPD B · Apt 6K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATELY 2 SQ FT AT SOUTH WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST ORIGINAL VIOLATION 16179690 ISSUED 22-AUG-23 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 16544795 · Class B · issued 12/21/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROXIMATELY 2 SQ FT AT SOUTH WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST ORIGINAL VIOLATION 16179690 ISSUED 22-AUG-23 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 16544795 · Class B · issued 12/21/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '16544795'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16544795');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyla-created', 'wo-mungpyla', 'Reported: HPD B · Apt 6K · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyla'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyla-created');

-- WO-MUNGPYLB · Building 2 · Apt 6K · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylb', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLB', 'HPD B · Apt 6K · repair the leaky and/or defective faucets at bathtub at east wall i…', '§ 27-2026 ADM CODE REPAIR THE LEAKY AND/OR DEFECTIVE FAUCETS AT BATHTUB AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605039 · Class B · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · repair the leaky and/or defective faucets at bathtub at east wall i…', '§ 27-2026 ADM CODE REPAIR THE LEAKY AND/OR DEFECTIVE FAUCETS AT BATHTUB AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605039 · Class B · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '16605039'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16605039');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylb-created', 'wo-mungpylb', 'Reported: HPD B · Apt 6K · repair the leaky and/or defective faucets at bathtub at east wall i…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylb'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylb-created');

-- WO-MUNGPYLC · Building 2 · Apt 6K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylc', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLC', 'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605040 · Class B · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605040 · Class B · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16605040'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16605040');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylc-created', 'wo-mungpylc', 'Reported: HPD B · Apt 6K · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylc'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylc-created');

-- WO-MUNGPYLD · Building 2 · Apt 6K · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyld', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLD', 'HPD B · Apt 6K · remove the torn and/or loose floor covering , in the 5th room from …', '§ 27-2005 ADM CODE REMOVE THE TORN AND/OR LOOSE FLOOR COVERING , IN THE 5th ROOM FROM NORTH AT EAST LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605041 · Class B · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD B · Apt 6K · remove the torn and/or loose floor covering , in the 5th room from …', '§ 27-2005 ADM CODE REMOVE THE TORN AND/OR LOOSE FLOOR COVERING , IN THE 5th ROOM FROM NORTH AT EAST LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16605041 · Class B · issued 1/19/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '16605041'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16605041');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyld-created', 'wo-mungpyld', 'Reported: HPD B · Apt 6K · remove the torn and/or loose floor covering , in the 5th room from …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyld'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyld-created');

-- WO-MUNGPYLE · Building 2 · Apt 6C · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyle', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6C') limit 1), b.org_id, 'WO-MUNGPYLE', 'HPD B · Apt 6C · properly repair or replace the broken or defective spring balance a…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE SPRING BALANCE AT LOWER WINDOW SASH AT EAST WALL IN THE KITCHEN LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037569 · Class B · issued 6/12/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 6C · properly repair or replace the broken or defective spring balance a…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE SPRING BALANCE AT LOWER WINDOW SASH AT EAST WALL IN THE KITCHEN LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037569 · Class B · issued 6/12/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17037569'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17037569');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyle-created', 'wo-mungpyle', 'Reported: HPD B · Apt 6C · properly repair or replace the broken or defective spring balance a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyle'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyle-created');

-- WO-MUNGPYLF · Building 2 · Apt 6C · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylf', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6C') limit 1), b.org_id, 'WO-MUNGPYLF', 'HPD B · Apt 6C · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037570 · Class B · issued 6/12/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 6C · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037570 · Class B · issued 6/12/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17037570'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17037570');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylf-created', 'wo-mungpylf', 'Reported: HPD B · Apt 6C · repair or replace the carbon monoxide detecting device(s). defectiv…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylf'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylf-created');

-- WO-MUNGPYLG · Building 2 · Apt 6C · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylg', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6C') limit 1), b.org_id, 'WO-MUNGPYLG', 'HPD B · Apt 6C · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037571 · Class B · issued 6/12/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 6C · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037571 · Class B · issued 6/12/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17037571'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17037571');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylg-created', 'wo-mungpylg', 'Reported: HPD B · Apt 6C · repair or replace the smoke detector defective in the entire apartm…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylg'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylg-created');

-- WO-MUNGPYLH · Building 2 · Apt 6C · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylh', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6C') limit 1), b.org_id, 'WO-MUNGPYLH', 'HPD B · Apt 6C · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE 2nd ROOM FROM NORTH AT EAST LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037572 · Class B · issued 6/12/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 6C · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC FLOOR TILES IN THE 2nd ROOM FROM NORTH AT EAST LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037572 · Class B · issued 6/12/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17037572'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17037572');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylh-created', 'wo-mungpylh', 'Reported: HPD B · Apt 6C · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylh'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylh-created');

-- WO-MUNGPYLI · Building 2 · Apt 1D · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyli', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1D') limit 1), b.org_id, 'WO-MUNGPYLI', 'HPD B · Apt 1D · properly repair or replace the broken or defective door at sink cab…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE DOOR AT SINK CABINET IN THE KITCHEN LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821400 · Class B · issued 4/14/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 1D · properly repair or replace the broken or defective door at sink cab…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE DOOR AT SINK CABINET IN THE KITCHEN LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821400 · Class B · issued 4/14/2025 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17821400'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17821400');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyli-created', 'wo-mungpyli', 'Reported: HPD B · Apt 1D · properly repair or replace the broken or defective door at sink cab…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyli'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyli-created');

-- WO-MUNGPYLJ · Building 2 · Apt 6C · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylj', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6C') limit 1), b.org_id, 'WO-MUNGPYLJ', 'HPD B · Apt 6C · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... LESS THAN 10 SQ FT AT ALL WALL IN THE KITCHEN LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST ORIGINAL VIOLATION 17821402 ISSUED 11-APR-25 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 18164126 · Class B · issued 8/13/2025 · status: DEFECT LETTER ISSUED.',
       'HPD B · Apt 6C · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... LESS THAN 10 SQ FT AT ALL WALL IN THE KITCHEN LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST ORIGINAL VIOLATION 17821402 ISSUED 11-APR-25 HAS BEEN UPGRADED TO CLASS B PER ADMINISTRATIVE CODE §27-2017.3a(3)(a) or (b).

— From HPD violation 18164126 · Class B · issued 8/13/2025 · status: DEFECT LETTER ISSUED.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '18164126'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18164126');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylj-created', 'wo-mungpylj', 'Reported: HPD B · Apt 6C · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylj'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylj-created');

-- WO-MUNGPYLK · Building 2 · Apt 1J · Class B · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylk', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1J') limit 1), b.org_id, 'WO-MUNGPYLK', 'HPD B · Apt 1J · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... GREATER THAN 10 SQUARE FEET AT ALL WALLS AND CEILING IN THE BATHROOM LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599635 · Class B · issued 1/28/2026 · status: DEFECT LETTER ISSUED.',
       'HPD B · Apt 1J · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... GREATER THAN 10 SQUARE FEET AT ALL WALLS AND CEILING IN THE BATHROOM LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599635 · Class B · issued 1/28/2026 · status: DEFECT LETTER ISSUED.', 'en', 'mold', 'normal', 'new',
       'HPD import', true, '18599635'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18599635');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylk-created', 'wo-mungpylk', 'Reported: HPD B · Apt 1J · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylk'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylk-created');

-- WO-MUNGPYLL · Building 2 · Apt 1J · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyll', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1J') limit 1), b.org_id, 'WO-MUNGPYLL', 'HPD B · Apt 1J · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT ALL WALLS AND CEILING IN THE BATHROOM LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599636 · Class B · issued 1/28/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 1J · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT ALL WALLS AND CEILING IN THE BATHROOM LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599636 · Class B · issued 1/28/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18599636'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18599636');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyll-created', 'wo-mungpyll', 'Reported: HPD B · Apt 1J · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyll'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyll-created');

-- WO-MUNGPYLM · Building 2 · Apt 1J · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylm', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1J') limit 1), b.org_id, 'WO-MUNGPYLM', 'HPD B · Apt 1J · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT NORTH AND EAST WALL IN THE KITCHEN LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599637 · Class B · issued 1/28/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 1J · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT NORTH AND EAST WALL IN THE KITCHEN LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599637 · Class B · issued 1/28/2026 · status: NOV SENT OUT.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '18599637'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18599637');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylm-created', 'wo-mungpylm', 'Reported: HPD B · Apt 1J · properly repair the source and abate the evidence of a water leak a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylm'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylm-created');

-- WO-MUNGPYLN · Building 2 · Apt 1J · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyln', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1J') limit 1), b.org_id, 'WO-MUNGPYLN', 'HPD B · Apt 1J · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT NORTH AND EAST WALL IN THE KITCHEN LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599638 · Class B · issued 1/28/2026 · status: NOV SENT OUT.',
       'HPD B · Apt 1J · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT NORTH AND EAST WALL IN THE KITCHEN LOCATED AT APT 1J, 1st STORY, 7th APARTMENT FROM NORTH AT EAST

— From HPD violation 18599638 · Class B · issued 1/28/2026 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '18599638'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18599638');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyln-created', 'wo-mungpyln', 'Reported: HPD B · Apt 1J · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyln'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyln-created');

-- WO-MUNGPYLO · Building 2 · common area · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylo', b.id, null, b.org_id, 'WO-MUNGPYLO', 'HPD B · common area · properly repair the source and abate the evidence of a water leak c…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK CEILING AT BASEMENT

— From HPD violation 18639718 · Class B · issued 2/13/2026 · status: NOV SENT OUT.',
       'HPD B · common area · properly repair the source and abate the evidence of a water leak c…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK CEILING AT BASEMENT

— From HPD violation 18639718 · Class B · issued 2/13/2026 · status: NOV SENT OUT.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '18639718'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18639718');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylo-created', 'wo-mungpylo', 'Reported: HPD B · common area · properly repair the source and abate the evidence of a water leak c…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylo'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylo-created');

-- WO-MUNGPYLP · Building 2 · common area · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylp', b.id, null, b.org_id, 'WO-MUNGPYLP', 'HPD B · common area · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 18789053 · Class B · issued 4/16/2026 · status: NOV SENT OUT.',
       'HPD B · common area · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 18789053 · Class B · issued 4/16/2026 · status: NOV SENT OUT.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '18789053'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18789053');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylp-created', 'wo-mungpylp', 'Reported: HPD B · common area · properly repair the source and abate the evidence of a water leak a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylp'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylp-created');

-- WO-MUNGPYLQ · Building 2 · common area · Class B · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylq', b.id, null, b.org_id, 'WO-MUNGPYLQ', 'HPD B · common area · properly repair with similar material the broken or defective fire …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETARDANT MATERIALS AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 18789054 · Class B · issued 4/16/2026 · status: NOV SENT OUT.',
       'HPD B · common area · properly repair with similar material the broken or defective fire …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETARDANT MATERIALS AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 18789054 · Class B · issued 4/16/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'normal', 'new',
       'HPD import', false, '18789054'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18789054');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylq-created', 'wo-mungpylq', 'Reported: HPD B · common area · properly repair with similar material the broken or defective fire …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylq'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylq-created');

-- WO-MUNGPYLR · Building 2 · common area · Class B · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylr', b.id, null, b.org_id, 'WO-MUNGPYLR', 'HPD B · common area · properly repair with similar material the broken or defective fire …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETARDANT MATERIALS AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 19030084 · Class B · issued 6/26/2026 · status: NOV SENT OUT.',
       'HPD B · common area · properly repair with similar material the broken or defective fire …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETARDANT MATERIALS AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 19030084 · Class B · issued 6/26/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'normal', 'new',
       'HPD import', false, '19030084'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '19030084');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylr-created', 'wo-mungpylr', 'Reported: HPD B · common area · properly repair with similar material the broken or defective fire …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylr'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylr-created');

-- WO-MUNGPYLS · Building 2 · Apt 5J · Class A · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyls', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('5J') limit 1), b.org_id, 'WO-MUNGPYLS', 'HPD A · Apt 5J · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... AT CEILING IN THE BATHROOM LOCATED AT APT 5J, 5th STORY, 4th APARTMENT FROM WEST AT NORTH

— From HPD violation 14999537 · Class A · issued 3/14/2022 · status: VIOLATION WILL BE REINSPECTED.',
       'HPD A · Apt 5J · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... AT CEILING IN THE BATHROOM LOCATED AT APT 5J, 5th STORY, 4th APARTMENT FROM WEST AT NORTH

— From HPD violation 14999537 · Class A · issued 3/14/2022 · status: VIOLATION WILL BE REINSPECTED.', 'en', 'mold', 'low', 'new',
       'HPD import', true, '14999537'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '14999537');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyls-created', 'wo-mungpyls', 'Reported: HPD A · Apt 5J · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyls'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyls-created');

-- WO-MUNGPYLT · Building 2 · Apt 6K · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylt', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLT', 'HPD A · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR ALL WALLS IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15937362 · Class A · issued 4/24/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR ALL WALLS IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15937362 · Class A · issued 4/24/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '15937362'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15937362');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylt-created', 'wo-mungpylt', 'Reported: HPD A · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylt'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylt-created');

-- WO-MUNGPYLU · Building 2 · Apt 6K · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylu', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLU', 'HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT AT WEST WALL IN THE BATHROOM LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964311 · Class A · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT AT WEST WALL IN THE BATHROOM LOCATED AT APT 6K, 7th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15964311 · Class A · issued 5/8/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '15964311'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15964311');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylu-created', 'wo-mungpylu', 'Reported: HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylu'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylu-created');

-- WO-MUNGPYLV · Building 2 · Apt 6K · Class A · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylv', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLV', 'HPD A · Apt 6K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024649 · Class A · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024649 · Class A · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'leak', 'low', 'new',
       'HPD import', true, '16024649'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16024649');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylv-created', 'wo-mungpylv', 'Reported: HPD A · Apt 6K · properly repair the source and abate the evidence of a water leak a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylv'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylv-created');

-- WO-MUNGPYLW · Building 2 · Apt 6K · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylw', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLW', 'HPD A · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT WEST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024651 · Class A · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT WEST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024651 · Class A · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '16024651'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16024651');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylw-created', 'wo-mungpylw', 'Reported: HPD A · Apt 6K · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylw'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylw-created');

-- WO-MUNGPYLX · Building 2 · Apt 6K · Class A · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylx', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLX', 'HPD A · Apt 6K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT WEST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024653 · Class A · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · properly repair the source and abate the evidence of a water leak a…', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT WEST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16024653 · Class A · issued 6/9/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'leak', 'low', 'new',
       'HPD import', true, '16024653'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16024653');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylx-created', 'wo-mungpylx', 'Reported: HPD A · Apt 6K · properly repair the source and abate the evidence of a water leak a…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylx'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylx-created');

-- WO-MUNGPYLY · Building 2 · Apt 6K · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyly', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLY', 'HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT THE EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16179688 · Class A · issued 8/23/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT THE EAST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16179688 · Class A · issued 8/23/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '16179688'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16179688');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyly-created', 'wo-mungpyly', 'Reported: HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyly'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyly-created');

-- WO-MUNGPYLZ · Building 2 · Apt 6K · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpylz', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYLZ', 'HPD A · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC WALL TILES AT WEST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16179689 · Class A · issued 8/23/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC WALL TILES AT WEST WALL IN THE BATHROOM LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16179689 · Class A · issued 8/23/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '16179689'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16179689');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpylz-created', 'wo-mungpylz', 'Reported: HPD A · Apt 6K · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpylz'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpylz-created');

-- WO-MUNGPYM0 · Building 2 · Apt 6K · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym0', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6K') limit 1), b.org_id, 'WO-MUNGPYM0', 'HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT THE WEST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16179691 · Class A · issued 8/23/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT THE WEST WALL IN THE PRIVATE HALLWAY LOCATED AT APT 6K, 6th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 16179691 · Class A · issued 8/23/2023 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'other', 'low', 'new',
       'HPD import', false, '16179691'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16179691');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym0-created', 'wo-mungpym0', 'Reported: HPD A · Apt 6K · paint with light colored paint to the satisfaction of this departme…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym0'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym0-created');

-- WO-MUNGPYM1 · Building 2 · Apt 6C · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym1', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('6C') limit 1), b.org_id, 'WO-MUNGPYM1', 'HPD A · Apt 6C · refit at entrance door in the entrance located at apt 6c, 6th stor…', '§ 27-2005 HMC: REFIT AT ENTRANCE DOOR IN THE ENTRANCE LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037568 · Class A · issued 6/12/2024 · status: NOV SENT OUT.',
       'HPD A · Apt 6C · refit at entrance door in the entrance located at apt 6c, 6th stor…', '§ 27-2005 HMC: REFIT AT ENTRANCE DOOR IN THE ENTRANCE LOCATED AT APT 6C, 6th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17037568 · Class A · issued 6/12/2024 · status: NOV SENT OUT.', 'en', 'other', 'low', 'new',
       'HPD import', false, '17037568'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17037568');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym1-created', 'wo-mungpym1', 'Reported: HPD A · Apt 6C · refit at entrance door in the entrance located at apt 6c, 6th stor…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym1'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym1-created');

-- WO-MUNGPYM2 · Building 2 · Apt 1D · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym2', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('1D') limit 1), b.org_id, 'WO-MUNGPYM2', 'HPD A · Apt 1D · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILES AT FLOOR IN THE 2nd ROOM FROM NORTH LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821399 · Class A · issued 4/14/2025 · status: NOV SENT OUT.',
       'HPD A · Apt 1D · properly repair with similar material the broken or defective ceram…', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC TILES AT FLOOR IN THE 2nd ROOM FROM NORTH LOCATED AT APT 1D, 1st STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17821399 · Class A · issued 4/14/2025 · status: NOV SENT OUT.', 'en', 'other', 'low', 'new',
       'HPD import', false, '17821399'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17821399');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym2-created', 'wo-mungpym2', 'Reported: HPD A · Apt 1D · properly repair with similar material the broken or defective ceram…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym2'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym2-created');

-- WO-MUNGPYM3 · Building 2 · common area · Class A · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym3', b.id, null, b.org_id, 'WO-MUNGPYM3', 'HPD A · common area · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT CEILING AT BASEMENT

— From HPD violation 18639719 · Class A · issued 2/13/2026 · status: NOV SENT OUT.',
       'HPD A · common area · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT CEILING AT BASEMENT

— From HPD violation 18639719 · Class A · issued 2/13/2026 · status: NOV SENT OUT.', 'en', 'other', 'low', 'new',
       'HPD import', false, '18639719'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18639719');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym3-created', 'wo-mungpym3', 'Reported: HPD A · common area · paint with light colored paint to the satisfaction of this departme…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym3'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym3-created');

-- WO-MUNGPYM4 · Building 2 · common area · Class A · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym4', b.id, null, b.org_id, 'WO-MUNGPYM4', 'HPD A · common area · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 18789055 · Class A · issued 4/16/2026 · status: NOV SENT OUT.',
       'HPD A · common area · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 18789055 · Class A · issued 4/16/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'low', 'new',
       'HPD import', false, '18789055'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18789055');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym4-created', 'wo-mungpym4', 'Reported: HPD A · common area · paint with light colored paint to the satisfaction of this departme…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym4'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym4-created');

-- WO-MUNGPYM5 · Building 2 · common area · Class A · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym5', b.id, null, b.org_id, 'WO-MUNGPYM5', 'HPD A · common area · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 19030085 · Class A · issued 6/26/2026 · status: NOV SENT OUT.',
       'HPD A · common area · paint with light colored paint to the satisfaction of this departme…', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT AT CEILING AT PUBLIC HALL, 1st STORY

— From HPD violation 19030085 · Class A · issued 6/26/2026 · status: NOV SENT OUT.', 'en', 'common-area', 'low', 'new',
       'HPD import', false, '19030085'
  from public.buildings b
 where b.name = 'Building 2'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '19030085');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym5-created', 'wo-mungpym5', 'Reported: HPD A · common area · paint with light colored paint to the satisfaction of this departme…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym5'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym5-created');

-- WO-MUNGPYM6 · Building 3 · Apt 3A · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym6', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3A') limit 1), b.org_id, 'WO-MUNGPYM6', 'HPD C · Apt 3A · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 15281513 · Class C · issued 7/29/2022 · status: DEFECT LETTER ISSUED.',
       'HPD C · Apt 3A · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 15281513 · Class C · issued 7/29/2022 · status: DEFECT LETTER ISSUED.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '15281513'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15281513');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym6-created', 'wo-mungpym6', 'Reported: HPD C · Apt 3A · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym6'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym6-created');

-- WO-MUNGPYM7 · Building 3 · Apt 10C · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym7', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('10C') limit 1), b.org_id, 'WO-MUNGPYM7', 'HPD C · Apt 10C · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 10C, 9th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15922111 · Class C · issued 4/14/2023 · status: NOT COMPLIED WITH.',
       'HPD C · Apt 10C · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 10C, 9th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15922111 · Class C · issued 4/14/2023 · status: NOT COMPLIED WITH.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '15922111'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15922111');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym7-created', 'wo-mungpym7', 'Reported: HPD C · Apt 10C · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym7'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym7-created');

-- WO-MUNGPYM8 · Building 3 · Apt 3A · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym8', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3A') limit 1), b.org_id, 'WO-MUNGPYM8', 'HPD C · Apt 3A · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3A, 3rd STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 16001022 · Class C · issued 5/26/2023 · status: DEFECT LETTER ISSUED.',
       'HPD C · Apt 3A · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3A, 3rd STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 16001022 · Class C · issued 5/26/2023 · status: DEFECT LETTER ISSUED.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16001022'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16001022');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym8-created', 'wo-mungpym8', 'Reported: HPD C · Apt 3A · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym8'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym8-created');

-- WO-MUNGPYM9 · Building 3 · Apt 2K · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpym9', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('2K') limit 1), b.org_id, 'WO-MUNGPYM9', 'HPD C · Apt 2K · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 2K, 2nd STORY, 1st APARTMENT FROM WEST AT NORTH , SECTION AT WEST

— From HPD violation 16034035 · Class C · issued 6/13/2023 · status: DEFECT LETTER ISSUED.',
       'HPD C · Apt 2K · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 2K, 2nd STORY, 1st APARTMENT FROM WEST AT NORTH , SECTION AT WEST

— From HPD violation 16034035 · Class C · issued 6/13/2023 · status: DEFECT LETTER ISSUED.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16034035'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16034035');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpym9-created', 'wo-mungpym9', 'Reported: HPD C · Apt 2K · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpym9'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpym9-created');

-- WO-MUNGPYMA · Building 3 · Apt 2K · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyma', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('2K') limit 1), b.org_id, 'WO-MUNGPYMA', 'HPD C · Apt 2K · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 2K, 2nd STORY, 1st APARTMENT FROM WEST AT NORTH , SECTION AT WEST

— From HPD violation 16034036 · Class C · issued 6/13/2023 · status: NOT COMPLIED WITH.',
       'HPD C · Apt 2K · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 2K, 2nd STORY, 1st APARTMENT FROM WEST AT NORTH , SECTION AT WEST

— From HPD violation 16034036 · Class C · issued 6/13/2023 · status: NOT COMPLIED WITH.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16034036'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16034036');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyma-created', 'wo-mungpyma', 'Reported: HPD C · Apt 2K · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyma'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyma-created');

-- WO-MUNGPYMB · Building 3 · Apt 3J · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymb', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3J') limit 1), b.org_id, 'WO-MUNGPYMB', 'HPD C · Apt 3J · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3J, 3rd STORY, 7th APARTMENT FROM SOUTH AT WEST

— From HPD violation 16080799 · Class C · issued 7/7/2023 · status: DEFECT LETTER ISSUED.',
       'HPD C · Apt 3J · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3J, 3rd STORY, 7th APARTMENT FROM SOUTH AT WEST

— From HPD violation 16080799 · Class C · issued 7/7/2023 · status: DEFECT LETTER ISSUED.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16080799'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16080799');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymb-created', 'wo-mungpymb', 'Reported: HPD C · Apt 3J · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymb'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymb-created');

-- WO-MUNGPYMC · Building 3 · Apt 3J · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymc', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3J') limit 1), b.org_id, 'WO-MUNGPYMC', 'HPD C · Apt 3J · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 3J, 3rd STORY, 7th APARTMENT FROM SOUTH AT WEST

— From HPD violation 16080800 · Class C · issued 7/7/2023 · status: NOT COMPLIED WITH.',
       'HPD C · Apt 3J · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 3J, 3rd STORY, 7th APARTMENT FROM SOUTH AT WEST

— From HPD violation 16080800 · Class C · issued 7/7/2023 · status: NOT COMPLIED WITH.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16080800'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16080800');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymc-created', 'wo-mungpymc', 'Reported: HPD C · Apt 3J · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymc'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymc-created');

-- WO-MUNGPYMD · Building 3 · Apt 11L · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymd', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('11L') limit 1), b.org_id, 'WO-MUNGPYMD', 'HPD C · Apt 11L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 11L, 11th STORY, 2nd APARTMENT FROM WEST AT NORTH

— From HPD violation 16674710 · Class C · issued 2/20/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD C · Apt 11L · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 11L, 11th STORY, 2nd APARTMENT FROM WEST AT NORTH

— From HPD violation 16674710 · Class C · issued 2/20/2024 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '16674710'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '16674710');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymd-created', 'wo-mungpymd', 'Reported: HPD C · Apt 11L · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymd'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymd-created');

-- WO-MUNGPYME · Building 3 · Apt 3B · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyme', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3B') limit 1), b.org_id, 'WO-MUNGPYME', 'HPD C · Apt 3B · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022386 · Class C · issued 6/5/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 3B · abate the infestation consisting of roaches in the entire apartment…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022386 · Class C · issued 6/5/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17022386'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022386');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyme-created', 'wo-mungpyme', 'Reported: HPD C · Apt 3B · abate the infestation consisting of roaches in the entire apartment…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyme'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyme-created');

-- WO-MUNGPYMF · Building 3 · Apt 3B · Class C · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymf', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3B') limit 1), b.org_id, 'WO-MUNGPYMF', 'HPD C · Apt 3B · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE LATCH IN THE ENTRANCE LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022387 · Class C · issued 6/5/2024 · status: NOV SENT OUT.',
       'HPD C · Apt 3B · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE LATCH IN THE ENTRANCE LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022387 · Class C · issued 6/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'high', 'new',
       'HPD import', false, '17022387'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022387');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymf-created', 'wo-mungpymf', 'Reported: HPD C · Apt 3B · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymf'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymf-created');

-- WO-MUNGPYMG · Building 3 · Apt 7K · Class C · pest
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymg', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('7K') limit 1), b.org_id, 'WO-MUNGPYMG', 'HPD C · Apt 7K · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 7K, 7th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17038939 · Class C · issued 6/11/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 7K · abate the infestation consisting of mice in the entire apartment lo…', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 7K, 7th STORY, 1st APARTMENT FROM NORTH AT EAST

— From HPD violation 17038939 · Class C · issued 6/11/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'pest', 'high', 'new',
       'HPD import', false, '17038939'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17038939');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymg-created', 'wo-mungpymg', 'Reported: HPD C · Apt 7K · abate the infestation consisting of mice in the entire apartment lo…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymg'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymg-created');

-- WO-MUNGPYMH · Building 3 · Apt 2K · Class C · mold
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymh', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('2K') limit 1), b.org_id, 'WO-MUNGPYMH', 'HPD C · Apt 2K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROX 25 SQ FT CEILING NORTH AND EAST WALL IN THE BATHROOM LOCATED AT APT 2K, 2nd STORY, 1st APARTMENT FROM WEST AT NORTH , SECTION AT WEST ORIGINAL VIOLATION 16034034 ISSUED 12-JUN-23 HAS BEEN UPGRADED TO CLASS C PER ADMINISTRATIVE CODE §27-2017.3a(5)(a) or (b).

— From HPD violation 17046551 · Class C · issued 6/11/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.',
       'HPD C · Apt 2K · trace and repair the source and abate the visible mold condition...…', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPROX 25 SQ FT CEILING NORTH AND EAST WALL IN THE BATHROOM LOCATED AT APT 2K, 2nd STORY, 1st APARTMENT FROM WEST AT NORTH , SECTION AT WEST ORIGINAL VIOLATION 16034034 ISSUED 12-JUN-23 HAS BEEN UPGRADED TO CLASS C PER ADMINISTRATIVE CODE §27-2017.3a(5)(a) or (b).

— From HPD violation 17046551 · Class C · issued 6/11/2024 · status: NOTICE OF ISSUANCE SENT TO TENANT.', 'en', 'mold', 'high', 'new',
       'HPD import', true, '17046551'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17046551');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymh-created', 'wo-mungpymh', 'Reported: HPD C · Apt 2K · trace and repair the source and abate the visible mold condition...…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymh'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymh-created');

-- WO-MUNGPYMI · Building 3 · common area · Class C · electrical
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymi', b.id, null, b.org_id, 'WO-MUNGPYMI', 'HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE CLOSER ARM AT FIRE DOOR LEADING TO ELECTRIC ROOM AND STORE ROOM AT PUBLIC HALL AT CELLAR

— From HPD violation 18235005 · Class C · issued 9/19/2025 · status: NOV SENT OUT.',
       'HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE CLOSER ARM AT FIRE DOOR LEADING TO ELECTRIC ROOM AND STORE ROOM AT PUBLIC HALL AT CELLAR

— From HPD violation 18235005 · Class C · issued 9/19/2025 · status: NOV SENT OUT.', 'en', 'electrical', 'high', 'new',
       'HPD import', false, '18235005'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18235005');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymi-created', 'wo-mungpymi', 'Reported: HPD C · common area · replace or repair the self-closing doors that is missing or defecti…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymi'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymi-created');

-- WO-MUNGPYMJ · Building 3 · Apt 3B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymj', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3B') limit 1), b.org_id, 'WO-MUNGPYMJ', 'HPD B · Apt 3B · properly repair with similar material the broken or defective wood …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE WOOD BASED CABINET COUNTER TOP AT SOUTH WALL IN THE KITCHEN LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022384 · Class B · issued 6/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 3B · properly repair with similar material the broken or defective wood …', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE WOOD BASED CABINET COUNTER TOP AT SOUTH WALL IN THE KITCHEN LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022384 · Class B · issued 6/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17022384'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022384');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymj-created', 'wo-mungpymj', 'Reported: HPD B · Apt 3B · properly repair with similar material the broken or defective wood …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymj'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymj-created');

-- WO-MUNGPYMK · Building 3 · Apt 3B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymk', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3B') limit 1), b.org_id, 'WO-MUNGPYMK', 'HPD B · Apt 3B · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022385 · Class B · issued 6/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 3B · repair or replace the carbon monoxide detecting device(s). defectiv…', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022385 · Class B · issued 6/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17022385'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022385');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymk-created', 'wo-mungpymk', 'Reported: HPD B · Apt 3B · repair or replace the carbon monoxide detecting device(s). defectiv…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymk'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymk-created');

-- WO-MUNGPYML · Building 3 · Apt 3B · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyml', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3B') limit 1), b.org_id, 'WO-MUNGPYML', 'HPD B · Apt 3B · properly repair or replace the broken or defective latch at door in…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH AT DOOR IN THE ENTRANCE LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022388 · Class B · issued 6/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 3B · properly repair or replace the broken or defective latch at door in…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH AT DOOR IN THE ENTRANCE LOCATED AT APT 3B, 3rd STORY, 5th APARTMENT FROM NORTH AT EAST

— From HPD violation 17022388 · Class B · issued 6/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17022388'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022388');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyml-created', 'wo-mungpyml', 'Reported: HPD B · Apt 3B · properly repair or replace the broken or defective latch at door in…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyml'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyml-created');

-- WO-MUNGPYMM · Building 3 · Apt 5L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymm', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('5L') limit 1), b.org_id, 'WO-MUNGPYMM', 'HPD B · Apt 5L · refit window at north wall in the 3rd room from north at east loca…', '§ 27-2005 HMC: REFIT WINDOW AT NORTH WALL IN THE 3rd ROOM FROM NORTH AT EAST LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022390 · Class B · issued 6/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 5L · refit window at north wall in the 3rd room from north at east loca…', '§ 27-2005 HMC: REFIT WINDOW AT NORTH WALL IN THE 3rd ROOM FROM NORTH AT EAST LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022390 · Class B · issued 6/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17022390'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022390');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymm-created', 'wo-mungpymm', 'Reported: HPD B · Apt 5L · refit window at north wall in the 3rd room from north at east loca…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymm'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymm-created');

-- WO-MUNGPYMN · Building 3 · Apt 5L · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymn', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('5L') limit 1), b.org_id, 'WO-MUNGPYMN', 'HPD B · Apt 5L · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022391 · Class B · issued 6/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 5L · repair or replace the smoke detector defective in the entire apartm…', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022391 · Class B · issued 6/5/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17022391'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022391');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymn-created', 'wo-mungpymn', 'Reported: HPD B · Apt 5L · repair or replace the smoke detector defective in the entire apartm…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymn'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymn-created');

-- WO-MUNGPYMO · Building 3 · Apt 5L · Class B · electrical
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymo', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('5L') limit 1), b.org_id, 'WO-MUNGPYMO', 'HPD B · Apt 5L · provide a safe and adequate supply of electric service to the fixtu…', '§ 27-2037, 2038 HMC: PROVIDE A SAFE AND ADEQUATE SUPPLY OF ELECTRIC SERVICE TO THE FIXTURES . IN THE BATHROOM LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022392 · Class B · issued 6/5/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 5L · provide a safe and adequate supply of electric service to the fixtu…', '§ 27-2037, 2038 HMC: PROVIDE A SAFE AND ADEQUATE SUPPLY OF ELECTRIC SERVICE TO THE FIXTURES . IN THE BATHROOM LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022392 · Class B · issued 6/5/2024 · status: NOV SENT OUT.', 'en', 'electrical', 'normal', 'new',
       'HPD import', false, '17022392'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022392');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymo-created', 'wo-mungpymo', 'Reported: HPD B · Apt 5L · provide a safe and adequate supply of electric service to the fixtu…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymo'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymo-created');

-- WO-MUNGPYMP · Building 3 · Apt 5L · Class B · electrical
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymp', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('5L') limit 1), b.org_id, 'WO-MUNGPYMP', 'HPD B · Apt 5L · provide a safe and adequate supply of electric service to the fixtu…', '§ 27-2037, 2038 HMC: PROVIDE A SAFE AND ADEQUATE SUPPLY OF ELECTRIC SERVICE TO THE FIXTURES AT CEILING IN THE ENTIRE APARTMENT LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022389 · Class B · issued 6/7/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 5L · provide a safe and adequate supply of electric service to the fixtu…', '§ 27-2037, 2038 HMC: PROVIDE A SAFE AND ADEQUATE SUPPLY OF ELECTRIC SERVICE TO THE FIXTURES AT CEILING IN THE ENTIRE APARTMENT LOCATED AT APT 5L, 5th STORY, 2nd APARTMENT FROM NORTH AT EAST

— From HPD violation 17022389 · Class B · issued 6/7/2024 · status: NOV SENT OUT.', 'en', 'electrical', 'normal', 'new',
       'HPD import', false, '17022389'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17022389');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymp-created', 'wo-mungpymp', 'Reported: HPD B · Apt 5L · provide a safe and adequate supply of electric service to the fixtu…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymp'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymp-created');

-- WO-MUNGPYMQ · Building 3 · common area · Class B · common-area
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymq', b.id, null, b.org_id, 'WO-MUNGPYMQ', 'HPD B · common area · properly repair or replace the broken or defective latch assembly o…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH ASSEMBLY ON BULKHEAD DOOR TO ROOF STAIRWAY A AT PUBLIC HALL, 12th STORY

— From HPD violation 17038982 · Class B · issued 6/11/2024 · status: NOV SENT OUT.',
       'HPD B · common area · properly repair or replace the broken or defective latch assembly o…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH ASSEMBLY ON BULKHEAD DOOR TO ROOF STAIRWAY A AT PUBLIC HALL, 12th STORY

— From HPD violation 17038982 · Class B · issued 6/11/2024 · status: NOV SENT OUT.', 'en', 'common-area', 'normal', 'new',
       'HPD import', false, '17038982'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17038982');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymq-created', 'wo-mungpymq', 'Reported: HPD B · common area · properly repair or replace the broken or defective latch assembly o…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymq'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymq-created');

-- WO-MUNGPYMR · Building 3 · Apt 3J · Class B · other
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymr', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3J') limit 1), b.org_id, 'WO-MUNGPYMR', 'HPD B · Apt 3J · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT CEILING IN THE BATHROOM LOCATED AT APT 3J, 3rd STORY, 6th APARTMENT FROM SOUTH AT WEST

— From HPD violation 17171202 · Class B · issued 8/8/2024 · status: NOV SENT OUT.',
       'HPD B · Apt 3J · repair the broken or defective plastered surfaces and paint in a un…', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT CEILING IN THE BATHROOM LOCATED AT APT 3J, 3rd STORY, 6th APARTMENT FROM SOUTH AT WEST

— From HPD violation 17171202 · Class B · issued 8/8/2024 · status: NOV SENT OUT.', 'en', 'other', 'normal', 'new',
       'HPD import', false, '17171202'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '17171202');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymr-created', 'wo-mungpymr', 'Reported: HPD B · Apt 3J · repair the broken or defective plastered surfaces and paint in a un…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymr'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymr-created');

-- WO-MUNGPYMS · Building 3 · Apt 3A · Class B · appliance
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpyms', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3A') limit 1), b.org_id, 'WO-MUNGPYMS', 'HPD B · Apt 3A · properly repair or replace the broken or defective gasket at refrig…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE GASKET AT REFRIGERATOR LOWER DOOR IN THE KITCHEN LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18235003 · Class B · issued 9/19/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 3A · properly repair or replace the broken or defective gasket at refrig…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE GASKET AT REFRIGERATOR LOWER DOOR IN THE KITCHEN LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18235003 · Class B · issued 9/19/2025 · status: NOV SENT OUT.', 'en', 'appliance', 'normal', 'new',
       'HPD import', false, '18235003'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18235003');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpyms-created', 'wo-mungpyms', 'Reported: HPD B · Apt 3A · properly repair or replace the broken or defective gasket at refrig…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpyms'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpyms-created');

-- WO-MUNGPYMT · Building 3 · Apt 3A · Class B · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymt', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('3A') limit 1), b.org_id, 'WO-MUNGPYMT', 'HPD B · Apt 3A · properly repair or replace the broken or defective water supply lin…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE WATER SUPPLY LINE SHUT OFF VALVE AT WASH BASIN IN THE BATHROOM LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18235004 · Class B · issued 9/19/2025 · status: NOV SENT OUT.',
       'HPD B · Apt 3A · properly repair or replace the broken or defective water supply lin…', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE WATER SUPPLY LINE SHUT OFF VALVE AT WASH BASIN IN THE BATHROOM LOCATED AT APT 3A, 3rd STORY, 4th APARTMENT FROM NORTH AT EAST

— From HPD violation 18235004 · Class B · issued 9/19/2025 · status: NOV SENT OUT.', 'en', 'leak', 'normal', 'new',
       'HPD import', true, '18235004'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18235004');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymt-created', 'wo-mungpymt', 'Reported: HPD B · Apt 3A · properly repair or replace the broken or defective water supply lin…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymt'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymt-created');

-- WO-MUNGPYMU · Building 3 · common area · Class B · electrical
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymu', b.id, null, b.org_id, 'WO-MUNGPYMU', 'HPD B · common area · refit fire door leading to electric room and store room at public …', '§ 27-2005 HMC: REFIT FIRE DOOR LEADING TO ELECTRIC ROOM AND STORE ROOM AT PUBLIC HALL AT CELLAR

— From HPD violation 18235006 · Class B · issued 9/19/2025 · status: NOV SENT OUT.',
       'HPD B · common area · refit fire door leading to electric room and store room at public …', '§ 27-2005 HMC: REFIT FIRE DOOR LEADING TO ELECTRIC ROOM AND STORE ROOM AT PUBLIC HALL AT CELLAR

— From HPD violation 18235006 · Class B · issued 9/19/2025 · status: NOV SENT OUT.', 'en', 'electrical', 'normal', 'new',
       'HPD import', false, '18235006'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '18235006');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymu-created', 'wo-mungpymu', 'Reported: HPD B · common area · refit fire door leading to electric room and store room at public …', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymu'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymu-created');

-- WO-MUNGPYMV · Building 3 · Apt 9C · Class A · leak
insert into public.work_orders
  (id, building_id, unit_id, org_id, ticket_number, title, description,
   title_en, description_en, source_language, category, priority, status,
   reporter_name, hpd_risk, source_violation_id)
select 'wo-mungpymv', b.id, (select u.id from public.units u where u.building_id = b.id and lower(u.label) = lower('9C') limit 1), b.org_id, 'WO-MUNGPYMV', 'HPD A · Apt 9C · properly secure the loose faucet at wash basin in the bathroom loca…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE FAUCET AT WASH BASIN IN THE BATHROOM LOCATED AT APT 9C, 9th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15281515 · Class A · issued 7/29/2022 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.',
       'HPD A · Apt 9C · properly secure the loose faucet at wash basin in the bathroom loca…', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE FAUCET AT WASH BASIN IN THE BATHROOM LOCATED AT APT 9C, 9th STORY, 1st APARTMENT FROM SOUTH AT WEST

— From HPD violation 15281515 · Class A · issued 7/29/2022 · status: FIRST NO ACCESS TO RE- INSPECT VIOLATION.', 'en', 'leak', 'low', 'new',
       'HPD import', true, '15281515'
  from public.buildings b
 where b.name = 'Building 3'
   and not exists (select 1 from public.work_orders w
                    where w.source_violation_id = '15281515');
insert into public.work_order_updates (id, work_order_id, message, author)
select 'wou-wo-mungpymv-created', 'wo-mungpymv', 'Reported: HPD A · Apt 9C · properly secure the loose faucet at wash basin in the bathroom loca…', 'HPD import'
  from public.work_orders w
 where w.id = 'wo-mungpymv'
   and not exists (select 1 from public.work_order_updates x
                    where x.id = 'wou-wo-mungpymv-created');

-- ------------------------------- verify --------------------------------------
--   select count(*) from public.work_orders where reporter_name = 'HPD import';
--     -- expect 178 (fewer only if some violations already had a ticket)
-- Then open /violations — every HPD row should show its ticket chip.
