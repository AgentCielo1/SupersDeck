import type { ComplianceTemplate } from "@/types";

// =============================================================================
//  NYC residential multifamily compliance — master template list
// =============================================================================
//  Sources: NYC Admin Code, HPD/DOB/FDNY/DEP/DOHMH rules, applicable Local Laws.
//  All items below apply to a typical HPD-regulated multiple dwelling. Per-
//  building applicability is decided when items are spun up against a building
//  (e.g. cooling tower items only apply if Building.has_cooling_tower).
//
//  This file is the "what every super needs to track" reference. It is meant to
//  be exhaustive for the common multifamily case — annual / cyclical / heat-
//  season / trigger-based / certifications.
// =============================================================================

export const COMPLIANCE_TEMPLATES: ComplianceTemplate[] = [
  // ============================================================
  // ANNUAL
  // ============================================================
  {
    id: "hpd-property-registration",
    due_rule: "fixed-date:09-01",
    name: "HPD Property Registration",
    category: "Registration",
    description:
      "Owners of buildings with 3+ units (or 1–2 unit non-owner-occupied) must register annually with HPD.",
    statute: "NYC Admin Code §27-2097",
    agency: "HPD",
    frequency: "annual",
    due_window: "by September 1",
    portal_url: "https://hpdonline.hpdnyc.org/HPDonline/",
    consequence: "Owner cannot collect rent or cure violations until registered.",
  },
  {
    id: "annual-bedbug-filing",
    due_rule: "fixed-date:12-31",
    name: "Annual Bedbug Report",
    category: "Pest control",
    description:
      "Owners of multiple dwellings must file an annual bedbug infestation report and provide it to tenants at lease signing.",
    statute: "NYC Admin Code §27-2018.1 / Local Law 69",
    agency: "HPD",
    frequency: "annual",
    due_window: "by December 31",
    portal_url: "https://hpdonline.hpdnyc.org/HPDonline/",
  },
  {
    id: "lead-paint-annual-notice",
    due_rule: "fixed-date:01-16",
    name: "Lead Paint Annual Notice (LL1)",
    category: "Lead",
    description:
      "Owners of pre-1960 multiple dwellings (or 1960-1978 with known lead) must deliver an annual notice to tenants asking if a child under 6 lives in the unit.",
    statute: "Local Law 1 of 2004",
    agency: "HPD",
    frequency: "annual",
    due_window: "January 1 – 16",
    applies_when: "Pre-1960 multiple dwelling (or 1960-1978 with known lead)",
    consequence: "Class C HPD violation if not delivered and returned.",
  },
  {
    id: "lead-paint-annual-inspection",
    due_rule: "fixed-date:12-31",
    name: "Lead Paint Annual Inspection (LL1)",
    category: "Lead",
    description:
      "Visual inspection of all units where a child under 6 resides, by December 31 each year.",
    statute: "Local Law 1 of 2004",
    agency: "HPD",
    frequency: "annual",
    due_window: "by December 31",
    vendor_type_required: "EPA RRP Certified Renovator",
    applies_when: "Units with children under 6 in pre-1960 buildings",
  },
  {
    id: "window-guard-annual-notice",
    due_rule: "fixed-date:01-15",
    name: "Window Guard Annual Notice",
    category: "Health & safety",
    description:
      "Owners of buildings with 3+ units must deliver an annual notice to every tenant asking if a child under 11 resides or if guards are wanted. Install within 30 days of any yes.",
    statute: "NYC Health Code §131.15",
    agency: "DOHMH",
    frequency: "annual",
    due_window: "January 1 – 15",
    portal_url:
      "https://www.nyc.gov/site/doh/health/health-topics/window-falls.page",
  },
  {
    id: "stove-knob-cover-notice",
    due_rule: "fixed-date:01-15",
    name: "Stove Knob Cover Annual Notice",
    category: "Health & safety",
    description:
      "Annual notice to tenants offering stove knob covers for units with a child under 6. Install within 30 days of request.",
    statute: "Local Law 117 of 2019",
    agency: "HPD",
    frequency: "annual",
    due_window: "January 1 – 15",
  },
  {
    id: "smoke-co-detector-cert",
    due_rule: "anniversary:1y",
    name: "Smoke & CO Detector Certification",
    category: "Fire safety",
    description:
      "Owners must certify each unit's smoke and carbon-monoxide alarms are installed and operable; tenants sign at lease signing and reinstalls.",
    statute: "NYC Admin Code §28-315",
    agency: "DOB",
    frequency: "annual",
    portal_url: "https://www.nyc.gov/site/buildings/index.page",
  },
  {
    id: "cooling-tower-annual-cert",
    due_rule: "fixed-date:11-01",
    name: "Cooling Tower Annual Certification (LL77)",
    category: "Mechanical",
    description:
      "Annual certification of cooling tower inspection, testing, cleaning, disinfection.",
    statute: "Local Law 77 of 2015",
    agency: "DOHMH",
    frequency: "annual",
    due_window: "by November 1",
    vendor_type_required: "Qualified cooling tower inspector",
    applies_when: "Buildings with cooling towers",
    portal_url:
      "https://nyc-business.nyc.gov/nycbusiness/description/cooling-tower-registration-and-annual-certification",
  },
  {
    id: "boiler-annual-inspection",
    due_rule: "anniversary:1y",
    name: "Boiler Annual Inspection",
    category: "Mechanical",
    description:
      "Annual inspection of low-pressure boiler by a DOB-licensed inspector; report filed within 14 days; defects cured within 90.",
    statute: "NYC Admin Code §28-303",
    agency: "DOB",
    frequency: "annual",
    vendor_type_required: "DOB Licensed Boiler Inspector",
    portal_url: "https://www1.nyc.gov/site/buildings/safety/boilers.page",
  },
  {
    id: "backflow-annual-test",
    due_rule: "anniversary:1y",
    name: "Backflow Prevention Annual Test",
    category: "Plumbing",
    description:
      "Annual test of each backflow prevention device, report filed with DEP.",
    statute: "NYC DEP Cross-Connection Rules / 15 RCNY §20",
    agency: "DEP",
    frequency: "annual",
    vendor_type_required: "Certified Backflow Tester (DEP)",
    portal_url:
      "https://www.nyc.gov/site/dep/water/cross-connection-control.page",
  },
  {
    id: "fdny-fire-alarm-test",
    due_rule: "anniversary:1y",
    name: "FDNY Fire Alarm System Test",
    category: "Fire safety",
    description:
      "Annual test/inspection of fire alarm system by FDNY-approved company; record kept on premises.",
    statute: "NYC Fire Code §901",
    agency: "FDNY",
    frequency: "annual",
    vendor_type_required: "FDNY-approved fire alarm contractor",
  },
  {
    id: "sprinkler-standpipe-annual",
    due_rule: "anniversary:1y",
    name: "Sprinkler / Standpipe Annual Inspection",
    category: "Fire safety",
    description:
      "Annual inspection of sprinkler and standpipe systems per NFPA 25 by FDNY-licensed contractor.",
    statute: "NYC Fire Code §901, NFPA 25",
    agency: "FDNY",
    frequency: "annual",
    vendor_type_required: "FDNY S-12 / S-13 / S-14 holder",
    applies_when: "Buildings with sprinkler or standpipe systems",
  },
  {
    id: "elevator-annual-inspection",
    due_rule: "anniversary:1y",
    name: "Elevator Annual Inspection",
    category: "Elevator",
    description:
      "Annual safety inspection and test by a DOB-approved elevator inspector; ANSI-17 compliance.",
    statute: "NYC Admin Code §28-304",
    agency: "DOB",
    frequency: "annual",
    vendor_type_required: "DOB-approved elevator inspector",
    portal_url: "https://www1.nyc.gov/site/buildings/safety/elevators.page",
  },
  {
    id: "ll84-benchmarking",
    due_rule: "fixed-date:05-01",
    name: "Energy Benchmarking (LL84)",
    category: "Energy",
    description:
      "Annual energy/water benchmarking report submitted to DOB via Portfolio Manager.",
    statute: "Local Law 84 of 2009",
    agency: "DOB",
    frequency: "annual",
    due_window: "by May 1",
    applies_when: "Buildings >25,000 sq ft (or 2 buildings on a lot >50k)",
    portal_url:
      "https://www.nyc.gov/site/buildings/codes/benchmarking.page",
    consequence: "$500/quarter penalty, accruing.",
  },
  {
    id: "ll97-emissions-report",
    due_rule: "fixed-date:05-01",
    name: "LL97 Emissions Report",
    category: "Energy",
    description:
      "Annual greenhouse-gas emissions report; emissions limits effective for buildings >25k sq ft.",
    statute: "Local Law 97 of 2019",
    agency: "DOB",
    frequency: "annual",
    due_window: "by May 1 (starting 2025)",
    applies_when: "Buildings >25,000 sq ft",
    portal_url:
      "https://www.nyc.gov/site/sustainability/codes/local-law-97.page",
  },
  {
    id: "section-8-nspire",
    due_rule: "anniversary:1y",
    name: "Section 8 / NSPIRE Inspection",
    category: "HUD",
    description:
      "Annual inspection of each Section-8 / PBV unit under HUD's new NSPIRE standard (replaced HQS in 2023).",
    statute: "24 CFR Part 5 Subpart G (NSPIRE)",
    agency: "HUD",
    frequency: "annual",
    vendor_type_required: "PHA NSPIRE inspector",
    applies_when: "Units occupied with Section 8 vouchers or PBV/PBRA contract",
    portal_url:
      "https://www.hud.gov/program_offices/public_indian_housing/reac/nspire",
  },
  {
    id: "rpie-filing",
    due_rule: "fixed-date:06-01",
    name: "Real Property Income & Expense (RPIE)",
    category: "Tax",
    description:
      "Annual filing of income and expense info with NYC Department of Finance for income-producing properties.",
    statute: "NYC Admin Code §11-208.1",
    agency: "DOB",
    frequency: "annual",
    due_window: "by June 1",
    portal_url: "https://www.nyc.gov/site/finance/property/rpie.page",
  },
  {
    id: "lead-water-annual",
    due_rule: "anniversary:1y",
    name: "Lead in Drinking Water Annual Test",
    category: "Lead",
    description:
      "Annual sampling and report on lead in drinking water at the tap.",
    statute: "Local Law 31 of 2020 (lead/water provisions)",
    agency: "HPD",
    frequency: "annual",
  },

  // ============================================================
  // TRIENNIAL / 4-YEAR
  // ============================================================
  {
    id: "boiler-triennial",
    due_rule: "anniversary:3y",
    name: "Boiler Triennial DOB Inspection",
    category: "Mechanical",
    description:
      "Every-3-year DOB inspection of boilers (different from annual insurance/owner inspection).",
    statute: "NYC Admin Code §28-303",
    agency: "DOB",
    frequency: "triennial",
    vendor_type_required: "DOB Licensed Boiler Inspector",
  },
  {
    id: "ll152-gas-inspection",
    due_rule: "anniversary:4y",
    name: "Gas Piping Inspection (LL152)",
    category: "Gas",
    description:
      "Every-4-year inspection of building's exposed gas piping by a Licensed Master Plumber. Cycle by Community District.",
    statute: "Local Law 152 of 2016",
    agency: "DOB",
    frequency: "every-4-years",
    vendor_type_required: "DOB Licensed Master Plumber (LMP)",
    portal_url:
      "https://www.nyc.gov/site/buildings/codes/local-law-152.page",
    consequence:
      "Failure to file timely GPS1/GPS2 forms = penalties + reinspection required.",
  },

  // ============================================================
  // 5-YEAR
  // ============================================================
  {
    id: "ll11-fisp",
    due_rule: "anniversary:5y",
    name: "Facade Inspection (LL11/FISP)",
    category: "Facade",
    description:
      "5-year cycle critical examination of exterior walls and appurtenances on buildings >6 stories. Filed as TR-6 with DOB.",
    statute: "Local Law 11 / Local Law 126; 1 RCNY §103-04",
    agency: "DOB",
    frequency: "every-5-years",
    vendor_type_required: "DOB Qualified Exterior Wall Inspector (QEWI)",
    applies_when: "Buildings more than 6 stories",
    portal_url:
      "https://www.nyc.gov/site/buildings/codes/facade-inspection-safety-program.page",
    consequence: "$5,000+ penalties; 'Unsafe' rating requires sidewalk shed.",
  },
  {
    id: "elevator-cat-5",
    due_rule: "anniversary:5y",
    name: "Elevator Category 5 (5-Year) Test",
    category: "Elevator",
    description:
      "5-year full-load and full-speed safety test of elevators (Category 5 / ASME A17.2).",
    statute: "NYC Admin Code §28-304",
    agency: "DOB",
    frequency: "every-5-years",
    vendor_type_required: "DOB-approved elevator inspector",
  },
  {
    id: "sprinkler-standpipe-5yr",
    due_rule: "anniversary:5y",
    name: "Sprinkler / Standpipe 5-Year Hydrostatic Test",
    category: "Fire safety",
    description:
      "5-year hydrostatic and main drain test per NFPA 25.",
    statute: "NFPA 25; NYC Fire Code §901",
    agency: "FDNY",
    frequency: "every-5-years",
    vendor_type_required: "FDNY S-13 / S-14 holder",
    applies_when: "Buildings with sprinkler or standpipe systems",
  },
  {
    id: "pbs-oil-tank-renew",
    due_rule: "anniversary:5y",
    name: "PBS Oil Tank Registration Renewal",
    category: "Mechanical",
    description:
      "Petroleum Bulk Storage tank registration renewal with NYC DEP / NYS DEC.",
    statute: "6 NYCRR Part 613",
    agency: "DEP",
    frequency: "every-5-years",
    applies_when: "Buildings with oil heat / PBS-registered tanks",
  },

  // ============================================================
  // 10-YEAR
  // ============================================================
  {
    id: "ll87-energy-audit",
    due_rule: "anniversary:10y",
    name: "Energy Audit & Retrocommissioning (LL87)",
    category: "Energy",
    description:
      "Every-10-year ASHRAE Level II energy audit + retrocommissioning report filed as EER with DOB.",
    statute: "Local Law 87 of 2009",
    agency: "DOB",
    frequency: "every-10-years",
    applies_when: "Buildings >25,000 sq ft",
    portal_url: "https://www.nyc.gov/site/buildings/codes/energy-audits.page",
  },

  // ============================================================
  // ONE-TIME / TRIGGER-BASED
  // ============================================================
  {
    id: "ll31-lead-xrf",
    due_rule: "one-time:2025-08-09",
    name: "Lead Paint XRF Inspection (LL31)",
    category: "Lead",
    description:
      "Every unit in a pre-1960 multifamily must have an XRF lead inspection by an EPA-certified inspector by 8/9/2025, then per turnover.",
    statute: "Local Law 31 of 2020",
    agency: "HPD",
    frequency: "one-time",
    due_window: "by August 9, 2025 (then turnover-triggered)",
    vendor_type_required: "EPA-certified lead inspector/risk assessor",
    applies_when: "Pre-1960 multiple dwellings, every unit",
    consequence: "Class C HPD violation per unit if missed.",
  },
  {
    id: "ll55-ipm-disclosure",
    due_rule: "trigger",
    name: "Integrated Pest Management Disclosure (LL55)",
    category: "Pest control",
    description:
      "IPM disclosure at lease signing and on renewal; pest log to be kept and made available.",
    statute: "Local Law 55 of 2018 (Asthma-Free Housing Act)",
    agency: "HPD",
    frequency: "trigger-based",
  },
  {
    id: "ll64-mold-remediation",
    due_rule: "trigger",
    name: "Mold Remediation (LL64)",
    category: "Health & safety",
    description:
      "Mold assessment and remediation by NYS DOL-licensed contractor when mold >10 sqft is found.",
    statute: "Local Law 64 of 2018",
    agency: "DOHMH",
    frequency: "trigger-based",
    vendor_type_required: "NYS Licensed Mold Remediator (>10 sqft)",
  },
  {
    id: "hpd-violation-cure",
    due_rule: "trigger",
    name: "HPD Violation Cure",
    category: "Violations",
    description:
      "Cure deadlines: Class A = 90 days, Class B = 30 days, Class C = 24 hrs (or immediately for hazardous like IPM/lead).",
    statute: "NYC Admin Code §27-2115",
    agency: "HPD",
    frequency: "trigger-based",
    portal_url: "https://hpdonline.hpdnyc.org/HPDonline/",
    consequence:
      "Civil penalties $25–$1,500/day per violation; AEP enrollment risk.",
  },
  {
    id: "ecb-oath-violation",
    due_rule: "trigger",
    name: "DOB / ECB / OATH Violation Response",
    category: "Violations",
    description:
      "Respond to ECB/OATH summonses by hearing date; certify correction; pay penalty or contest.",
    statute: "NYC Admin Code §28-204",
    agency: "DOB",
    frequency: "trigger-based",
    portal_url: "https://nyc-oath.govt.us/",
  },
  {
    id: "ll196-sst",
    due_rule: "trigger",
    name: "Site Safety Training (LL196)",
    category: "Construction",
    description:
      "Workers on permitted construction sites must hold an SST card; supervisors require additional training.",
    statute: "Local Law 196 of 2017",
    agency: "DOB",
    frequency: "trigger-based",
    applies_when: "Any permitted construction work",
  },

  // ============================================================
  // SEASONAL — HEAT
  // ============================================================
  {
    id: "heat-season-log",
    due_rule: "seasonal:10-01:05-31",
    name: "Heat & Hot Water Daily Log",
    category: "Heat",
    description:
      "During heat season (Oct 1 – May 31) minimum 68°F day / 62°F night when outdoor <55°F. Hot water ≥120°F year-round. Daily log required.",
    statute:
      "NYC Admin Code §27-2029 (heat) & §27-2031 (hot water); HPD Heat Rules",
    agency: "HPD",
    frequency: "seasonal",
    due_window: "October 1 – May 31",
    consequence:
      "Class C HPD violation per tenant complaint; $250–$500/day penalties.",
  },

  // ============================================================
  // FDNY CERTIFICATES OF FITNESS (super-held)
  // ============================================================
  {
    id: "fdny-s12",
    due_rule: "anniversary:5y",
    name: "FDNY S-12 (Citywide Standpipe)",
    category: "Certifications",
    description: "Standpipe system supervision certificate.",
    statute: "NYC Fire Code §405",
    agency: "FDNY",
    frequency: "every-5-years",
    portal_url:
      "https://www.nyc.gov/site/fdny/business/all-certifications/certificate-of-fitness.page",
  },
  {
    id: "fdny-s13",
    due_rule: "anniversary:5y",
    name: "FDNY S-13 (Citywide Sprinkler)",
    category: "Certifications",
    description: "Sprinkler system supervision certificate.",
    statute: "NYC Fire Code §405",
    agency: "FDNY",
    frequency: "every-5-years",
  },
  {
    id: "fdny-s95",
    due_rule: "anniversary:5y",
    name: "FDNY S-95 (Supervision of Fire Alarm)",
    category: "Certifications",
    description:
      "Supervision of fire alarm systems and other related systems.",
    statute: "NYC Fire Code §901",
    agency: "FDNY",
    frequency: "every-5-years",
  },
  {
    id: "fdny-p99",
    due_rule: "anniversary:5y",
    name: "FDNY P-99 (Low-Pressure Boiler)",
    category: "Certifications",
    description:
      "Operate low-pressure boiler; required for on-site building operator.",
    statute: "NYC Fire Code §606",
    agency: "FDNY",
    frequency: "every-5-years",
  },
  {
    id: "fdny-q99",
    due_rule: "anniversary:5y",
    name: "FDNY Q-99 (Oil Burning Equipment)",
    category: "Certifications",
    description:
      "Operate oil-burning equipment; required for buildings with oil heat.",
    statute: "NYC Fire Code §606",
    agency: "FDNY",
    frequency: "every-5-years",
    applies_when: "Buildings with oil heat",
  },
  {
    id: "fdny-f80",
    due_rule: "anniversary:5y",
    name: "FDNY F-80 (Fire & Emergency Drill Conductor)",
    category: "Certifications",
    description:
      "Authorized to conduct fire & non-fire emergency drills in occupancies that require them.",
    statute: "NYC Fire Code §404",
    agency: "FDNY",
    frequency: "every-5-years",
  },
  {
    id: "epa-rrp",
    due_rule: "anniversary:5y",
    name: "EPA RRP Lead Renovator Certification",
    category: "Certifications",
    description:
      "Required for anyone disturbing >6 sqft interior / >20 sqft exterior of paint in pre-1978 buildings.",
    statute: "40 CFR Part 745 Subpart E",
    agency: "Federal/EPA",
    frequency: "every-5-years",
    portal_url: "https://www.epa.gov/lead/renovation-repair-and-painting-program",
  },
  {
    id: "osha-30",
    due_rule: "one-time",
    name: "OSHA 30 (Construction)",
    category: "Certifications",
    description: "30-hour construction safety training; one-time card.",
    statute: "29 CFR 1926",
    agency: "Federal/EPA",
    frequency: "one-time",
  },
];

// Quick lookup helpers
export const complianceTemplateById = (id: string) =>
  COMPLIANCE_TEMPLATES.find((t) => t.id === id);

export const complianceCategories = Array.from(
  new Set(COMPLIANCE_TEMPLATES.map((t) => t.category))
).sort();
