import type {
  Building,
  Unit,
  Vendor,
  WorkOrder,
  ComplianceItem,
  Certification,
  HeatLog,
} from "@/types";

// =============================================================================
//  Sample data — represents a new super's "day 1" starting point
// =============================================================================
//  Three buildings, a few units per building shown for demo, a handful of
//  open work orders, an empty My Vendors list (because day-1 super hasn't
//  added any yet), a few starter certifications. Compliance items are
//  generated at runtime from the templates (see lib/compliance.ts).
// =============================================================================

// Real building addresses provided by the super. BIN/BBL/HPD ID and the
// Community District are intentionally blank — fill them in from
// hpdonline.hpdnyc.org once you confirm them for each property.
export const SAMPLE_BUILDINGS: Building[] = [
  {
    id: "bldg-1",
    name: "Building 1",
    address: "62-27 108th Street, Queens, NY 11375",
    borough: "Queens",
    year_built: 1975,
    num_units: 144,
    num_floors: 12,
    bin: "",
    bbl: "",
    hpd_id: "",
    community_district: "QN-06",
    has_section8: true,
    is_pact_rad: true,
    has_oil_heat: true, // TEMPORARY — main boiler gas, currently on portable oil
    has_cooling_tower: false,
    has_sprinkler: true,
    has_known_lead: false, // unconfirmed; flip once management records check
    heat_notes:
      "Temporary oil — main gas boiler offline pending underground steam-leak repair. Q-99 cert + PBS tank reg apply while oil is on-site.",
    square_footage: 122242, // portfolio total 366,727 sqft / 3 buildings
  },
  {
    id: "bldg-2",
    name: "Building 2",
    address: "108-53 62nd Drive, Queens, NY 11375",
    borough: "Queens",
    year_built: 1975,
    num_units: 144,
    num_floors: 12,
    bin: "",
    bbl: "",
    hpd_id: "",
    community_district: "QN-06",
    has_section8: true,
    is_pact_rad: true,
    has_oil_heat: false, // gas (in-building boiler)
    has_cooling_tower: false,
    has_sprinkler: true,
    has_known_lead: false, // unconfirmed; flip once management records check
    square_footage: 122242, // portfolio total 366,727 sqft / 3 buildings
  },
  {
    id: "bldg-3",
    name: "Building 3",
    address: "110-01 62nd Drive, Queens, NY 11375",
    borough: "Queens",
    year_built: 1975,
    num_units: 144,
    num_floors: 12,
    bin: "",
    bbl: "",
    hpd_id: "",
    community_district: "QN-06",
    has_section8: true,
    is_pact_rad: true,
    has_oil_heat: false, // gas (in-building boiler)
    has_cooling_tower: false,
    has_sprinkler: true,
    has_known_lead: false, // unconfirmed; flip once management records check
    square_footage: 122242, // portfolio total 366,727 sqft / 3 buildings
  },
];

// =============================================================================
//  Unit generator
// =============================================================================
//  All 3 buildings use the same unit layout: 12 floors × 12 lines
//  (A B C D E F G H J K L M — skipping I, NYC convention). That's 144 units
//  per building, 432 total.
//
//  Tenant info, Section-8 status, etc. start blank — the super fills them in
//  via the CSV importer in phase 2. We overlay a handful of demo tenants
//  here so the dashboard / work-order screens have realistic data on day 1.
// =============================================================================

const UNIT_LINES = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M"];
const FLOORS_PER_BUILDING = 12;

// Real bedroom layout per line as confirmed by the super.
// F lines are studios (0 BR). Keep this map as the single source of truth.
const LINE_BEDROOMS: Record<string, number> = {
  A: 2, B: 2, C: 3, D: 1, E: 1, F: 0,
  G: 1, H: 1, J: 2, K: 3, L: 2, M: 2,
};

interface DemoTenantOverlay {
  building_id: string;
  label: string;
  tenant_name: string;
  tenant_phone?: string;
  is_section8?: boolean;
  has_children_under_6?: boolean;
  has_children_under_11?: boolean;
}

const DEMO_TENANTS: DemoTenantOverlay[] = [
  { building_id: "bldg-1", label: "7C", tenant_name: "Maria Gonzalez", tenant_phone: "(347) 555-0101", is_section8: true, has_children_under_6: true, has_children_under_11: true },
  { building_id: "bldg-1", label: "3B", tenant_name: "James Wright" },
  { building_id: "bldg-2", label: "11D", tenant_name: "Patel family", is_section8: true, has_children_under_11: true },
  { building_id: "bldg-3", label: "2A", tenant_name: "Vacant — turnover in progress" },
];

function generateUnitsForBuilding(buildingId: string, floors: number): Unit[] {
  const out: Unit[] = [];
  for (let f = 1; f <= floors; f++) {
    UNIT_LINES.forEach((line, idx) => {
      const label = `${f}${line}`;
      const overlay = DEMO_TENANTS.find(
        (d) => d.building_id === buildingId && d.label === label
      );
      out.push({
        id: `u-${buildingId.replace("bldg-", "")}-${label.toLowerCase()}`,
        building_id: buildingId,
        label,
        line,
        floor: f,
        bedrooms: LINE_BEDROOMS[line] ?? 1,
        bathrooms: 1,
        occupied: overlay
          ? !/vacant/i.test(overlay.tenant_name)
          : true,
        tenant_name: overlay?.tenant_name,
        tenant_phone: overlay?.tenant_phone,
        is_section8: overlay?.is_section8 ?? false,
        has_children_under_6: overlay?.has_children_under_6 ?? false,
        has_children_under_11: overlay?.has_children_under_11 ?? false,
      });
    });
  }
  return out;
}

export const SAMPLE_UNITS: Unit[] = [
  ...generateUnitsForBuilding("bldg-1", FLOORS_PER_BUILDING),
  ...generateUnitsForBuilding("bldg-2", FLOORS_PER_BUILDING),
  ...generateUnitsForBuilding("bldg-3", FLOORS_PER_BUILDING),
];

// Public helpers other modules can use (CSV importer needs the line list).
export { UNIT_LINES, LINE_BEDROOMS, FLOORS_PER_BUILDING, generateUnitsForBuilding };

// Day 1: empty. Super adds as they go.
export const SAMPLE_MY_VENDORS: Vendor[] = [];

// A few sample open work orders so the dashboard isn't empty on first load.
const today = new Date();
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 24 * 3600 * 1000).toISOString();

export const SAMPLE_WORK_ORDERS: WorkOrder[] = [
  {
    id: "wo-1024",
    building_id: "bldg-1",
    unit_id: "u-1-7c",
    ticket_number: "WO-1024",
    title: "No heat in living room",
    description:
      "Tenant reports radiator cold in living room since last night; bedroom radiator works.",
    category: "no-heat",
    priority: "emergency",
    status: "triaged",
    reporter_name: "Maria Gonzalez",
    reporter_phone: "(347) 555-0101",
    reported_at: daysAgo(0),
    photos: [],
    hpd_risk: true,
  },
  {
    id: "wo-1023",
    building_id: "bldg-1",
    unit_id: "u-1-3b",
    ticket_number: "WO-1023",
    title: "Kitchen sink slow drain",
    description: "Drains but slowly; tenant tried plunger.",
    category: "leak",
    priority: "normal",
    status: "assigned",
    reporter_name: "James Wright",
    reported_at: daysAgo(1),
    assigned_to: "Hector (porter)",
    photos: [],
    hpd_risk: false,
  },
  {
    id: "wo-1022",
    building_id: "bldg-2",
    unit_id: "u-2-11d",
    ticket_number: "WO-1022",
    title: "Front door lock sticking",
    description: "Tenant has to wiggle key; concerned about getting locked out.",
    category: "lock-key",
    priority: "high",
    status: "new",
    reporter_name: "Patel family",
    reported_at: daysAgo(0),
    photos: [],
    hpd_risk: false,
  },
  {
    id: "wo-1021",
    building_id: "bldg-3",
    ticket_number: "WO-1021",
    title: "Lobby light out (east entrance)",
    description: "Lobby flicker then went out yesterday evening.",
    category: "common-area",
    priority: "normal",
    status: "completed",
    reporter_name: "Building staff",
    reported_at: daysAgo(2),
    resolved_at: daysAgo(0),
    assigned_to: "Hector (porter)",
    photos: [],
    hpd_risk: false,
  },
];

// Day 1: starter cert tracker is empty too — super adds their own.
export const SAMPLE_CERTIFICATIONS: Certification[] = [];

// Recent heat-season log readings (manual entry).
export const SAMPLE_HEAT_LOGS: HeatLog[] = [];

// Generated compliance items live in lib/compliance.ts so they react to
// per-building flags (has_cooling_tower, has_oil_heat, etc.).
export const SAMPLE_COMPLIANCE_ITEMS: ComplianceItem[] = [];
