// =============================================================================
//  SupersDeck — shared types
// =============================================================================
//  These mirror the SQL schema in `supabase/schema.sql`. Keep the two in sync.
//  In phase 1 the app reads from seed arrays typed against these interfaces.
//  In phase 2 the same types come back from Supabase queries.
// =============================================================================

export type ID = string;

// ---------- Buildings & units ----------
export interface Building {
  id: ID;
  name: string;
  address: string;
  borough: "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";
  year_built: number;
  num_units: number;
  num_floors: number;
  bin?: string;           // NYC Building Identification Number
  bbl?: string;           // Borough-Block-Lot
  hpd_id?: string;
  community_district?: string; // for Local Law 152 cycle
  has_section8: boolean;
  is_pact_rad: boolean;
  has_oil_heat: boolean;       // true if CURRENTLY running oil (includes temporary setups)
  has_cooling_tower: boolean;
  has_sprinkler: boolean;
  square_footage?: number;
  // Lead trigger for LL1 / LL31: pre-1960 buildings get it automatically;
  // 1960-1978 buildings only when lead is documented (NYCHA testing,
  // prior HPD violation, XRF result, etc.). Flip to true once confirmed.
  has_known_lead: boolean;
  // Free-text context for the heat system — e.g. "Temporary oil during
  // steam-leak repair, expected gas-back by Apr 15". Shows in building card.
  heat_notes?: string;
  // Management-company contact for the monthly owner report. If null, the
  // owner-report cron skips this building.
  manager_name?: string;
  manager_email?: string;
  // Certificate of Occupancy (DOB). co_expires_at is null for permanent
  // COs and set only when operating on a Temporary CO that needs renewal.
  co_number?: string;
  co_issued_at?: string;
  co_expires_at?: string;
  // Legal entity that prints on the work-order form header (e.g.
  // "FOREST HILLS MHA HDFC" / "FOREST HILLS MHA HSG DEV").
  legal_entity?: string;
}

export interface Unit {
  id: ID;
  building_id: ID;
  label: string;          // "7C"
  line: string;           // "C"
  floor: number;
  bedrooms: number;
  bathrooms: number;
  occupied: boolean;
  tenant_name?: string;
  tenant_phone?: string;
  is_section8: boolean;
  has_children_under_6: boolean;     // triggers LL1 lead paint
  has_children_under_11: boolean;    // triggers window guards
  lead_xrf_completed?: string;       // ISO date for LL31
  lease_start?: string;              // ISO date
  lease_end?: string;                // ISO date — renewal trigger
  rent_status?: "stabilized" | "controlled" | "market" | "section8" | "pact";
  notes?: string;
}

// ---------- Compliance ----------
export type ComplianceFrequency =
  | "daily"
  | "monthly"
  | "annual"
  | "triennial"
  | "every-4-years"
  | "every-5-years"
  | "every-10-years"
  | "one-time"
  | "trigger-based"
  | "seasonal";

export type ComplianceAgency =
  | "HPD"
  | "DOB"
  | "FDNY"
  | "DEP"
  | "DOHMH"
  | "HUD"
  | "DSNY"
  | "DCWP"
  | "Federal/EPA";

export interface ComplianceTemplate {
  id: ID;
  name: string;
  category: string;                 // "Heat", "Lead", "Fire safety", ...
  description: string;
  statute: string;                  // "NYC Admin Code 27-2056", "Local Law 152"
  agency: ComplianceAgency;
  frequency: ComplianceFrequency;
  due_window?: string;              // "by May 1", "Oct 1 – May 31", ...
  vendor_type_required?: string;    // "FDNY S-13 holder", "DOB Licensed Master Plumber"
  portal_url?: string;
  applies_when?: string;            // plain-language scope ("Buildings with cooling towers")
  consequence?: string;             // what happens if missed
  // Tells the compliance generator how to compute next_due:
  //   "fixed-date:MM-DD"     — annual recurrence on this calendar date (e.g. Window Guard Notice "fixed-date:01-15")
  //   "anniversary:Ny"       — N years after last_completed; if no last_completed, status="needs-scheduling"
  //   "seasonal:MM-DD:MM-DD" — active during this window (e.g. heat log "seasonal:10-01:05-31")
  //   "one-time:YYYY-MM-DD"  — single deadline on this exact date (e.g. LL31 XRF "one-time:2025-08-09")
  //   "one-time"             — lifetime credential / no recurring deadline (e.g. OSHA-30)
  //   "trigger"              — only created when triggered by an event; not pre-generated
  due_rule?: string;
}

export type ComplianceStatus =
  | "ok"
  | "due-soon"
  | "overdue"
  | "in-progress"
  | "not-applicable"
  | "needs-scheduling";

export interface ComplianceItem {
  id: ID;
  building_id: ID;
  template_id: ID;
  status: ComplianceStatus;
  last_completed?: string;          // ISO date
  next_due?: string;                // ISO date — optional now: "needs-scheduling" items have no date yet
  vendor_id?: ID;
  notes?: string;
  attachments?: string[];
}

// ---------- Vendors ----------
export interface VendorCategory {
  id: ID;
  parent_id?: ID;
  name: string;
  icon: string;                     // tabler icon name (no "ti-" prefix)
  description?: string;
}

export interface VendorDiscoverySource {
  id: ID;
  name: string;
  url: string;
  agency: string;
  description: string;
  covers: string[];                 // category ids this source helps find
}

export interface Vendor {
  id: ID;
  name: string;
  category_id: ID;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  license_type?: string;
  license_number?: string;
  license_expires?: string;
  in_my_vendors: boolean;           // true = "I use this vendor"
  last_used_at?: string;
  notes?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

// ---------- Work orders ----------
export type WorkOrderStatus =
  | "new"
  | "triaged"
  | "assigned"
  | "in-progress"
  | "waiting-on-vendor"
  | "waiting-on-parts"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "emergency" | "high" | "normal" | "low";

export type WorkOrderCategory =
  | "no-heat"
  | "no-hot-water"
  | "leak"
  | "electrical"
  | "appliance"
  | "lock-key"
  | "pest"
  | "mold"
  | "elevator"
  | "intercom"
  | "common-area"
  | "lead-concern"
  | "other";

export interface WorkOrder {
  id: ID;
  building_id: ID;
  unit_id?: ID;                     // null if common-area
  ticket_number: string;            // "WO-1024"
  title: string;
  description: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  reporter_name: string;
  reporter_phone?: string;
  reporter_email?: string;
  reported_at: string;
  due_at?: string;
  assigned_to?: string;             // "Hector (porter)", free-text internal staff
  assigned_vendor_id?: ID;          // FK to vendors.id when assigned to a vendor on file
  resolved_at?: string;
  photos: string[];
  internal_notes?: string;
  hpd_risk: boolean;                // category in {no-heat,no-hot-water,lead-concern,mold} or HPD-reportable
  completion_signature?: string;    // base64 PNG data URL from tenant signature
  signed_by_name?: string;
  signed_at?: string;
  // Auto-translation: if a tenant submits in a non-English language, the
  // server stores the English versions here and the ISO 639-1 code in
  // source_language. Admin/super views render *_en, the tenant track page
  // renders the original.
  title_en?: string;
  description_en?: string;
  source_language?: string;
}

export interface WorkOrderUpdate {
  id: ID;
  work_order_id: ID;
  message: string;
  author: string;
  photos: string[];
  created_at: string;
}

// ---------- Heat & hot water log ----------
export interface HeatLog {
  id: ID;
  building_id: ID;
  unit_id?: ID;
  recorded_at: string;
  indoor_temp_f: number;
  outdoor_temp_f?: number;
  hot_water_temp_f?: number;
  source: "manual" | "sensor";
  notes?: string;
}

// ---------- Staff certifications ----------
export interface Certification {
  id: ID;
  holder_name: string;
  type: string;                     // "FDNY S-13", "EPA RRP", "OSHA 30", "P-99"
  number: string;
  issued_at: string;
  expires_at: string;
  agency: string;
  notes?: string;
}
