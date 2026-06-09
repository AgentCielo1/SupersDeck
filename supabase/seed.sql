-- =============================================================================
-- SupersDeck — Phase 2 seed data
-- =============================================================================
-- Run this AFTER schema.sql, in Supabase → SQL Editor → New query (or psql).
-- Idempotent: ON CONFLICT DO NOTHING means re-running is safe.
--
-- Contents:
--   - 40 NYC compliance templates (HPD/DOB/FDNY/DEP/DOHMH/HUD/EPA/OSHA)
--   - 68 vendor categories (top-level + subcategories)
--   - 12 official city licensee-lookup sources
--   - 3 seeded buildings (replace addresses/IDs with your own portfolio)
--   - 432 generated units (12 floors × 12 lines × 3 buildings) with overlay
--     tenants on the demo units that drive the dashboard work orders
-- =============================================================================

-- ============================================================================
-- COMPLIANCE TEMPLATES
-- ============================================================================
insert into compliance_templates (id, name, category, description, statute, agency, frequency, due_window, vendor_type_required, portal_url, applies_when, consequence) values
('hpd-property-registration','HPD Property Registration','Registration','Owners of buildings with 3+ units (or 1-2 unit non-owner-occupied) must register annually with HPD.','NYC Admin Code §27-2097','HPD','annual','by September 1',null,'https://hpdonline.hpdnyc.org/HPDonline/',null,'Owner cannot collect rent or cure violations until registered.'),
('annual-bedbug-filing','Annual Bedbug Report','Pest control','Owners of multiple dwellings must file an annual bedbug infestation report and provide it to tenants at lease signing.','NYC Admin Code §27-2018.1 / Local Law 69','HPD','annual','by December 31',null,'https://hpdonline.hpdnyc.org/HPDonline/',null,null),
('lead-paint-annual-notice','Lead Paint Annual Notice (LL1)','Lead','Owners of pre-1960 multiple dwellings (or 1960-1978 with known lead) must deliver an annual notice to tenants asking if a child under 6 lives in the unit.','Local Law 1 of 2004','HPD','annual','January 1 – 16',null,null,'Pre-1960 multiple dwelling (or 1960-1978 with known lead)','Class C HPD violation if not delivered and returned.'),
('lead-paint-annual-inspection','Lead Paint Annual Inspection (LL1)','Lead','Visual inspection of all units where a child under 6 resides, by December 31 each year.','Local Law 1 of 2004','HPD','annual','by December 31','EPA RRP Certified Renovator',null,'Units with children under 6 in pre-1960 buildings',null),
('window-guard-annual-notice','Window Guard Annual Notice','Health & safety','Owners of buildings with 3+ units must deliver an annual notice to every tenant asking if a child under 11 resides or if guards are wanted. Install within 30 days of any yes.','NYC Health Code §131.15','DOHMH','annual','January 1 – 15',null,'https://www.nyc.gov/site/doh/health/health-topics/window-falls.page',null,null),
('stove-knob-cover-notice','Stove Knob Cover Annual Notice','Health & safety','Annual notice to tenants offering stove knob covers for units with a child under 6. Install within 30 days of request.','Local Law 117 of 2019','HPD','annual','January 1 – 15',null,null,null,null),
('smoke-co-detector-cert','Smoke & CO Detector Certification','Fire safety','Owners must certify each unit''s smoke and carbon-monoxide alarms are installed and operable; tenants sign at lease signing and reinstalls.','NYC Admin Code §28-315','DOB','annual',null,null,'https://www.nyc.gov/site/buildings/index.page',null,null),
('cooling-tower-annual-cert','Cooling Tower Annual Certification (LL77)','Mechanical','Annual certification of cooling tower inspection, testing, cleaning, disinfection.','Local Law 77 of 2015','DOHMH','annual','by November 1','Qualified cooling tower inspector','https://nyc-business.nyc.gov/nycbusiness/description/cooling-tower-registration-and-annual-certification','Buildings with cooling towers',null),
('boiler-annual-inspection','Boiler Annual Inspection','Mechanical','Annual inspection of low-pressure boiler by a DOB-licensed inspector; report filed within 14 days; defects cured within 90.','NYC Admin Code §28-303','DOB','annual',null,'DOB Licensed Boiler Inspector','https://www1.nyc.gov/site/buildings/safety/boilers.page',null,null),
('backflow-annual-test','Backflow Prevention Annual Test','Plumbing','Annual test of each backflow prevention device, report filed with DEP.','NYC DEP Cross-Connection Rules / 15 RCNY §20','DEP','annual',null,'Certified Backflow Tester (DEP)','https://www.nyc.gov/site/dep/water/cross-connection-control.page',null,null),
('fdny-fire-alarm-test','FDNY Fire Alarm System Test','Fire safety','Annual test/inspection of fire alarm system by FDNY-approved company; record kept on premises.','NYC Fire Code §901','FDNY','annual',null,'FDNY-approved fire alarm contractor',null,null,null),
('sprinkler-standpipe-annual','Sprinkler / Standpipe Annual Inspection','Fire safety','Annual inspection of sprinkler and standpipe systems per NFPA 25 by FDNY-licensed contractor.','NYC Fire Code §901, NFPA 25','FDNY','annual',null,'FDNY S-12 / S-13 / S-14 holder',null,'Buildings with sprinkler or standpipe systems',null),
('elevator-annual-inspection','Elevator Annual Inspection','Elevator','Annual safety inspection and test by a DOB-approved elevator inspector; ANSI-17 compliance.','NYC Admin Code §28-304','DOB','annual',null,'DOB-approved elevator inspector','https://www1.nyc.gov/site/buildings/safety/elevators.page',null,null),
('ll84-benchmarking','Energy Benchmarking (LL84)','Energy','Annual energy/water benchmarking report submitted to DOB via Portfolio Manager.','Local Law 84 of 2009','DOB','annual','by May 1',null,'https://www.nyc.gov/site/buildings/codes/benchmarking.page','Buildings >25,000 sq ft','$500/quarter penalty, accruing.'),
('ll97-emissions-report','LL97 Emissions Report','Energy','Annual greenhouse-gas emissions report; emissions limits effective for buildings >25k sq ft.','Local Law 97 of 2019','DOB','annual','by May 1 (starting 2025)',null,'https://www.nyc.gov/site/sustainability/codes/local-law-97.page','Buildings >25,000 sq ft',null),
('section-8-nspire','Section 8 / NSPIRE Inspection','HUD','Annual inspection of each Section-8 / PBV unit under HUD''s new NSPIRE standard (replaced HQS in 2023).','24 CFR Part 5 Subpart G (NSPIRE)','HUD','annual',null,'PHA NSPIRE inspector','https://www.hud.gov/program_offices/public_indian_housing/reac/nspire','Units occupied with Section 8 vouchers or PBV/PBRA contract',null),
('rpie-filing','Real Property Income & Expense (RPIE)','Tax','Annual filing of income and expense info with NYC Department of Finance for income-producing properties.','NYC Admin Code §11-208.1','DOB','annual','by June 1',null,'https://www.nyc.gov/site/finance/property/rpie.page',null,null),
('lead-water-annual','Lead in Drinking Water Annual Test','Lead','Annual sampling and report on lead in drinking water at the tap.','Local Law 31 of 2020 (lead/water provisions)','HPD','annual',null,null,null,null,null),
('boiler-triennial','Boiler Triennial DOB Inspection','Mechanical','Every-3-year DOB inspection of boilers (different from annual insurance/owner inspection).','NYC Admin Code §28-303','DOB','triennial',null,'DOB Licensed Boiler Inspector',null,null,null),
('ll152-gas-inspection','Gas Piping Inspection (LL152)','Gas','Every-4-year inspection of building''s exposed gas piping by a Licensed Master Plumber. Cycle by Community District.','Local Law 152 of 2016','DOB','every-4-years',null,'DOB Licensed Master Plumber (LMP)','https://www.nyc.gov/site/buildings/codes/local-law-152.page',null,'Failure to file timely GPS1/GPS2 forms = penalties + reinspection required.'),
('ll11-fisp','Facade Inspection (LL11/FISP)','Facade','5-year cycle critical examination of exterior walls and appurtenances on buildings >6 stories. Filed as TR-6 with DOB.','Local Law 11 / Local Law 126; 1 RCNY §103-04','DOB','every-5-years',null,'DOB Qualified Exterior Wall Inspector (QEWI)','https://www.nyc.gov/site/buildings/codes/facade-inspection-safety-program.page','Buildings more than 6 stories','$5,000+ penalties; Unsafe rating requires sidewalk shed.'),
('elevator-cat-5','Elevator Category 5 (5-Year) Test','Elevator','5-year full-load and full-speed safety test of elevators (Category 5 / ASME A17.2).','NYC Admin Code §28-304','DOB','every-5-years',null,'DOB-approved elevator inspector',null,null,null),
('sprinkler-standpipe-5yr','Sprinkler / Standpipe 5-Year Hydrostatic Test','Fire safety','5-year hydrostatic and main drain test per NFPA 25.','NFPA 25; NYC Fire Code §901','FDNY','every-5-years',null,'FDNY S-13 / S-14 holder',null,'Buildings with sprinkler or standpipe systems',null),
('pbs-oil-tank-renew','PBS Oil Tank Registration Renewal','Mechanical','Petroleum Bulk Storage tank registration renewal with NYC DEP / NYS DEC.','6 NYCRR Part 613','DEP','every-5-years',null,null,null,'Buildings with oil heat / PBS-registered tanks',null),
('ll87-energy-audit','Energy Audit & Retrocommissioning (LL87)','Energy','Every-10-year ASHRAE Level II energy audit + retrocommissioning report filed as EER with DOB.','Local Law 87 of 2009','DOB','every-10-years',null,null,'https://www.nyc.gov/site/buildings/codes/energy-audits.page','Buildings >25,000 sq ft',null),
('ll31-lead-xrf','Lead Paint XRF Inspection (LL31)','Lead','Every unit in a pre-1960 multifamily must have an XRF lead inspection by an EPA-certified inspector by 8/9/2025, then per turnover.','Local Law 31 of 2020','HPD','one-time','by August 9, 2025 (then turnover-triggered)','EPA-certified lead inspector/risk assessor',null,'Pre-1960 multiple dwellings, every unit','Class C HPD violation per unit if missed.'),
('ll55-ipm-disclosure','Integrated Pest Management Disclosure (LL55)','Pest control','IPM disclosure at lease signing and on renewal; pest log to be kept and made available.','Local Law 55 of 2018 (Asthma-Free Housing Act)','HPD','trigger-based',null,null,null,null,null),
('ll64-mold-remediation','Mold Remediation (LL64)','Health & safety','Mold assessment and remediation by NYS DOL-licensed contractor when mold >10 sqft is found.','Local Law 64 of 2018','DOHMH','trigger-based',null,'NYS Licensed Mold Remediator (>10 sqft)',null,null,null),
('hpd-violation-cure','HPD Violation Cure','Violations','Cure deadlines: Class A = 90 days, Class B = 30 days, Class C = 24 hrs (or immediately for hazardous like IPM/lead).','NYC Admin Code §27-2115','HPD','trigger-based',null,null,'https://hpdonline.hpdnyc.org/HPDonline/',null,'Civil penalties $25–$1,500/day per violation; AEP enrollment risk.'),
('ecb-oath-violation','DOB / ECB / OATH Violation Response','Violations','Respond to ECB/OATH summonses by hearing date; certify correction; pay penalty or contest.','NYC Admin Code §28-204','DOB','trigger-based',null,null,'https://nyc-oath.govt.us/',null,null),
('ll196-sst','Site Safety Training (LL196)','Construction','Workers on permitted construction sites must hold an SST card; supervisors require additional training.','Local Law 196 of 2017','DOB','trigger-based',null,null,null,'Any permitted construction work',null),
('heat-season-log','Heat & Hot Water Daily Log','Heat','During heat season (Oct 1 – May 31) minimum 68°F day / 62°F night when outdoor <55°F. Hot water ≥120°F year-round. Daily log required.','NYC Admin Code §27-2029 (heat) & §27-2031 (hot water); HPD Heat Rules','HPD','seasonal','October 1 – May 31',null,null,null,'Class C HPD violation per tenant complaint; $250–$500/day penalties.'),
('fdny-s12','FDNY S-12 (Citywide Standpipe)','Certifications','Standpipe system supervision certificate.','NYC Fire Code §405','FDNY','every-5-years',null,null,'https://www.nyc.gov/site/fdny/business/all-certifications/certificate-of-fitness.page',null,null),
('fdny-s13','FDNY S-13 (Citywide Sprinkler)','Certifications','Sprinkler system supervision certificate.','NYC Fire Code §405','FDNY','every-5-years',null,null,null,null,null),
('fdny-s95','FDNY S-95 (Supervision of Fire Alarm)','Certifications','Supervision of fire alarm systems and other related systems.','NYC Fire Code §901','FDNY','every-5-years',null,null,null,null,null),
('fdny-p99','FDNY P-99 (Low-Pressure Boiler)','Certifications','Operate low-pressure boiler; required for on-site building operator.','NYC Fire Code §606','FDNY','every-5-years',null,null,null,null,null),
('fdny-q99','FDNY Q-99 (Oil Burning Equipment)','Certifications','Operate oil-burning equipment; required for buildings with oil heat.','NYC Fire Code §606','FDNY','every-5-years',null,null,null,'Buildings with oil heat',null),
('fdny-f80','FDNY F-80 (Fire & Emergency Drill Conductor)','Certifications','Authorized to conduct fire & non-fire emergency drills in occupancies that require them.','NYC Fire Code §404','FDNY','every-5-years',null,null,null,null,null),
('epa-rrp','EPA RRP Lead Renovator Certification','Certifications','Required for anyone disturbing >6 sqft interior / >20 sqft exterior of paint in pre-1978 buildings.','40 CFR Part 745 Subpart E','Federal/EPA','every-5-years',null,null,'https://www.epa.gov/lead/renovation-repair-and-painting-program',null,null),
('osha-30','OSHA 30 (Construction)','Certifications','30-hour construction safety training; one-time card.','29 CFR 1926','Federal/EPA','one-time',null,null,null,null,null)
on conflict (id) do nothing;


-- ============================================================================
-- VENDOR CATEGORIES (top level)
-- ============================================================================
insert into vendor_categories (id, parent_id, name, icon) values
('plumbing',null,'Plumbing','droplet'),
('electrical',null,'Electrical','bolt'),
('hvac',null,'HVAC / Mechanical','wind'),
('fire-safety',null,'Fire safety','fire-extinguisher'),
('elevator',null,'Elevator','arrows-vertical'),
('facade',null,'Facade & masonry','building'),
('roofing',null,'Roofing','home'),
('pest',null,'Pest control / extermination','bug'),
('cleaning',null,'Cleaning & janitorial','spray'),
('supplies',null,'Maintenance supplies & hardware','tools'),
('locks',null,'Locks, keys, intercom','key'),
('glass',null,'Glass & windows','browser'),
('concrete',null,'Concrete & sidewalk','road'),
('outdoor',null,'Snow, salt & landscaping','snowflake'),
('waste',null,'Garbage / waste management','recycle'),
('painting',null,'Painting','brush'),
('carpentry',null,'Carpentry / doors / cabinetry','tool'),
('env',null,'Environmental abatement','biohazard'),
('consult',null,'Engineering & code consulting','compass'),
('security',null,'Security & CCTV','shield-lock'),
('fuel',null,'Oil / gas delivery','fuel'),
('metering',null,'Submetering / energy services','gauge'),
('legal',null,'Legal (housing court / code)','scale'),
('insurance',null,'Insurance broker','umbrella'),
('other',null,'Other / general contractor','tools')
on conflict (id) do nothing;

-- VENDOR CATEGORIES (sub-categories)
insert into vendor_categories (id, parent_id, name, icon) values
('plumbing-emergency','plumbing','Emergency plumber (24/7)','alert-triangle'),
('plumbing-drain','plumbing','Drain cleaning / sewer','tornado'),
('plumbing-gas','plumbing','Gas piping (LL152 / LMP)','flame'),
('plumbing-backflow','plumbing','Backflow testing (DEP)','arrows-shuffle'),
('plumbing-water-heater','plumbing','Boilers & hot water heaters','temperature-sun'),
('electrical-master','electrical','Master electrician','plug'),
('electrical-fire-alarm','electrical','Fire alarm contractor','bell-ringing'),
('electrical-low-voltage','electrical','Low voltage / intercom / CCTV','device-tv'),
('electrical-generator','electrical','Emergency generator service','battery-charging'),
('hvac-boiler','hvac','Boiler service & repair','flame'),
('hvac-cooling-tower','hvac','Cooling tower (LL77)','snowflake'),
('hvac-refrigeration','hvac','Refrigeration','fridge'),
('hvac-ductwork','hvac','Ductwork & ventilation','air-conditioning'),
('hvac-water-treatment','hvac','Boiler water treatment','test-pipe'),
('fire-sprinkler','fire-safety','Sprinkler / standpipe','drone'),
('fire-alarm-test','fire-safety','Annual fire alarm test','alarm'),
('fire-extinguisher','fire-safety','Fire extinguisher service','fire-extinguisher'),
('fire-fdny-inspection','fire-safety','FDNY inspection prep','clipboard-check'),
('elevator-service','elevator','Service contractor','settings'),
('elevator-inspector','elevator','Cat. 1 / Cat. 5 inspector','clipboard-check'),
('facade-qewi','facade','QEWI engineer (LL11/126)','rulers'),
('facade-masonry','facade','Masonry / parapet repair','wall'),
('facade-waterproofing','facade','Waterproofing / caulking','shield'),
('pest-ipm','pest','IPM licensed exterminator (LL55)','leaf'),
('pest-bedbug','pest','Bed bug specialist','ghost'),
('pest-rodent','pest','Rodent abatement','mouse'),
('cleaning-supplies','cleaning','Janitorial supplies','package'),
('cleaning-compactor','cleaning','Trash compactor service','trash'),
('supplies-plumbing','supplies','Plumbing parts','tools-kitchen-2'),
('supplies-electrical','supplies','Electrical parts','bolt'),
('supplies-lighting','supplies','Light bulbs / fixtures','bulb'),
('supplies-paint','supplies','Paint & coatings','brush'),
('supplies-hardware','supplies','General hardware','hammer'),
('locks-locksmith','locks','Locksmith (24/7)','lock'),
('locks-masterkey','locks','Master key system','key'),
('locks-intercom','locks','Intercom systems','phone-call'),
('env-asbestos','env','Asbestos abatement','biohazard'),
('env-lead','env','Lead abatement / XRF testing','vaccine'),
('env-mold','env','Mold remediation (LL64)','cloud'),
('env-water-damage','env','Water damage restoration','drop'),
('consult-pe-ra','consult','PE / RA (architect / engineer)','compass'),
('consult-energy','consult','LL87 energy auditor','chart-bar'),
('consult-expediter','consult','Filing / expediter','file-text')
on conflict (id) do nothing;


-- ============================================================================
-- VENDOR DISCOVERY SOURCES — official NYC / federal licensee lookups
-- ============================================================================
insert into vendor_discovery_sources (id, name, url, agency, description, covers) values
('dob-licensee-search','NYC DOB Licensee Search','https://a810-bisweb.nyc.gov/bisweb/LicenseQueryByLicenseTypeServlet','DOB','Search NYC DOB-licensed master plumbers, electricians, master fire suppression, sign hangers, riggers, hoist machine operators, oil burner installers, and more.',array['plumbing','electrical','hvac-boiler','fire-sprinkler']),
('dob-cof-search','FDNY Certificate of Fitness Holder Lookup','https://fires.fdnycloud.org/CitizenAccess/Cap/CapHome.aspx?module=Certification','FDNY','Look up active FDNY Certificates of Fitness (S-12, S-13, S-95, P-99, Q-99, F-80, etc.) by name or number.',array['fire-safety','hvac-boiler']),
('fdny-approved-companies','FDNY-Approved Fire Alarm / Sprinkler Companies','https://www.nyc.gov/site/fdny/business/all-certifications/fire-alarm.page','FDNY','Directory of FDNY-approved fire alarm and sprinkler installation companies.',array['fire-alarm-test','fire-sprinkler']),
('dep-backflow','DEP Approved Backflow Testers','https://www.nyc.gov/site/dep/water/cross-connection-control.page','DEP','List of DEP-certified backflow prevention device testers and installers.',array['plumbing-backflow']),
('doh-cooling-tower','NYC Cooling Tower Compliant Operators','https://nyc-business.nyc.gov/nycbusiness/description/cooling-tower-registration-and-annual-certification','DOHMH','Information on qualified inspectors for Local Law 77 cooling tower certification.',array['hvac-cooling-tower']),
('epa-rrp-firms','EPA RRP-Certified Firms','https://cfpub.epa.gov/flpp/pub/index.cfm?do=main.firmSearch','Federal/EPA','Federal EPA database of Renovation/Repair/Painting-certified firms (required for lead-impacted paint disturbance).',array['painting','env-lead']),
('nys-mold-licensees','NYS Mold Assessor / Remediator License Lookup','https://applications.labor.ny.gov/IBET/search.do?searchType=mold','DOHMH','NYS Department of Labor lookup for licensed mold assessors and remediators (required for jobs >10 sqft).',array['env-mold']),
('doh-asbestos','NYS Asbestos Handler Licensee Lookup','https://applications.labor.ny.gov/IBET/search.do?searchType=asbestos','DOHMH','Search NYS Department of Labor for asbestos handler licensees.',array['env-asbestos']),
('dob-elevator-agencies','DOB Elevator Inspection Agencies','https://www.nyc.gov/site/buildings/safety/elevators.page','DOB','Authorized elevator inspection agencies and resources, including Category 1 and Category 5 inspectors.',array['elevator-inspector']),
('ddc-pest-ipm','HPD IPM Pest Control Resources','https://www.nyc.gov/site/hpd/services-and-information/asthma-free-housing-act.page','HPD','Local Law 55 / Asthma-Free Housing Act resources and IPM guidance.',array['pest-ipm']),
('rebny-vendor-directory','REBNY Member Vendor Directory','https://www.rebny.com/','DOB','Real Estate Board of NY member directory — many vetted property service vendors are listed.',array['consult-pe-ra','consult-expediter','other']),
('32bj-trades','32BJ Maintenance / Trades Network','https://www.seiu32bj.org/','DOB','32BJ SEIU represents many NYC building service workers — useful for finding union-rate maintenance support and per-diem help.',array['cleaning','other'])
on conflict (id) do nothing;


-- ============================================================================
-- BUILDINGS — replace addresses with your own portfolio (you can use the
-- Buildings UI later to edit/add). These match the addresses provided by the
-- super for the dogfood deployment.
-- ============================================================================
-- year_built: 1975. square_footage: portfolio total 366,727 sqft / 3 ≈ 122,242 per building.
-- Building 1 is on temporary oil heat (main boiler offline; steam-leak repair in progress).
-- has_known_lead defaults to false; flip per building once lead records confirm.
insert into buildings (
  id, name, address, borough, year_built, num_units, num_floors,
  community_district, has_section8, is_pact_rad, has_sprinkler,
  has_oil_heat, has_known_lead, heat_notes, square_footage
) values
('bldg-1','Building 1','62-27 108th Street, Queens, NY 11375','Queens',1975,144,12,'QN-06',true,true,true,
  true, false,
  'Temporary oil — main gas boiler offline pending underground steam-leak repair. Q-99 cert + PBS tank reg apply while oil is on-site.',
  122242),
('bldg-2','Building 2','108-53 62nd Drive, Queens, NY 11375','Queens',1975,144,12,'QN-06',true,true,true,
  false, false, null, 122242),
('bldg-3','Building 3','110-01 62nd Drive, Queens, NY 11375','Queens',1975,144,12,'QN-06',true,true,true,
  false, false, null, 122242)
on conflict (id) do nothing;


-- ============================================================================
-- UNITS — generate 432 (12 floors × 12 lines × 3 buildings).
-- Lines A–H, J, K, L, M (NYC convention skips the letter I).
-- ============================================================================
-- Real bedroom layout per line, as confirmed by the super:
--   A, B, J, L, M → 2 BR
--   C, K          → 3 BR
--   D, E, G, H    → 1 BR
--   F             → studio (0 BR)
do $$
declare
  bid text;
  f int;
  ln text;
  br int;
  letters text[] := array['A','B','C','D','E','F','G','H','J','K','L','M'];
begin
  foreach bid in array array['bldg-1','bldg-2','bldg-3'] loop
    for f in 1..12 loop
      foreach ln in array letters loop
        br := case ln
                when 'A' then 2 when 'B' then 2 when 'C' then 3
                when 'D' then 1 when 'E' then 1 when 'F' then 0
                when 'G' then 1 when 'H' then 1 when 'J' then 2
                when 'K' then 3 when 'L' then 2 when 'M' then 2
              end;
        insert into units (id, building_id, label, line, floor, bedrooms, bathrooms, occupied)
        values (
          'u-' || replace(bid,'bldg-','') || '-' || f || lower(ln),
          bid,
          f::text || ln,
          ln,
          f,
          br,
          1,
          true
        )
        on conflict (building_id, label) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- Overlay a few demo tenants so the dashboard / work orders have realistic
-- names on first run. Edit / remove these once you've imported real tenant
-- info via the CSV importer at /buildings/[id]/units/import.
update units set tenant_name='Maria Gonzalez', tenant_phone='(347) 555-0101', is_section8=true, has_children_under_6=true, has_children_under_11=true where id='u-1-7c';
update units set tenant_name='James Wright' where id='u-1-3b';
update units set tenant_name='Patel family', is_section8=true, has_children_under_11=true where id='u-2-11d';
update units set tenant_name='Vacant — turnover in progress', occupied=false where id='u-3-2a';


-- ============================================================================
-- SAMPLE WORK ORDERS — start with a handful so the dashboard isn't empty.
-- Delete these once real tickets start coming in via tenant intake.
-- ============================================================================
insert into work_orders (id, building_id, unit_id, ticket_number, title, description, category, priority, status, reporter_name, reporter_phone, reported_at, hpd_risk) values
('wo-1024','bldg-1','u-1-7c','WO-1024','No heat in living room','Tenant reports radiator cold in living room since last night; bedroom radiator works.','no-heat','emergency','triaged','Maria Gonzalez','(347) 555-0101', now(), true),
('wo-1023','bldg-1','u-1-3b','WO-1023','Kitchen sink slow drain','Drains but slowly; tenant tried plunger.','leak','normal','assigned','James Wright', null, now() - interval '1 day', false),
('wo-1022','bldg-2','u-2-11d','WO-1022','Front door lock sticking','Tenant has to wiggle key; concerned about getting locked out.','lock-key','high','new','Patel family', null, now(), false)
on conflict (id) do nothing;
update work_orders set assigned_to='Hector (porter)' where id='wo-1023';

insert into work_orders (id, building_id, unit_id, ticket_number, title, description, category, priority, status, reporter_name, reported_at, resolved_at, assigned_to, hpd_risk) values
('wo-1021','bldg-3', null, 'WO-1021','Lobby light out (east entrance)','Lobby flicker then went out yesterday evening.','common-area','normal','completed','Building staff', now() - interval '2 days', now(), 'Hector (porter)', false)
on conflict (id) do nothing;

-- ============================================================================
-- Done.
-- ============================================================================
