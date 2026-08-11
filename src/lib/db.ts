// Demo mode (NEXT_PUBLIC_DEMO=1) serves a fully fictional "Maple Property
// Management" seed instead of the real bundled sample data, so portfolio
// recordings never show real building/tenant info. Paired with running on
// empty Supabase env (the `supersdeck-demo` launch config), nothing can reach
// the real database. When the flag is off, behavior is unchanged.
import * as realSeed from "@/data/sample-data";
import * as demoSeed from "@/data/sample-data-demo";
const seed = process.env.NEXT_PUBLIC_DEMO === "1" ? demoSeed : realSeed;
const {
  SAMPLE_BUILDINGS,
  SAMPLE_UNITS,
  SAMPLE_WORK_ORDERS,
  SAMPLE_MY_VENDORS,
  SAMPLE_CERTIFICATIONS,
  SAMPLE_HEAT_LOGS,
} = seed;
import { COMPLIANCE_TEMPLATES } from "@/data/compliance-templates";
import {
  VENDOR_CATEGORIES,
  VENDOR_DISCOVERY_SOURCES,
} from "@/data/vendor-categories";
import { generateComplianceItems } from "@/lib/compliance";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Task } from "@/types/tasks";
import type { Document } from "@/types/documents";

// Reads go through the session-aware server client so per-role RLS sees the
// signed-in user as `authenticated` (not anon, which would return []).
const getSupabase = createSupabaseServerClient;
import type {
  Building,
  Unit,
  Vendor,
  WorkOrder,
  ComplianceItem,
  ComplianceTemplate,
  VendorCategory,
  VendorDiscoverySource,
  Certification,
  HeatLog,
} from "@/types";

// Sensitive — only ever fetched for admins (see fetchUnitRents).
export type UnitRent = {
  base: number | null;
  repeat: number | null;
  total: number | null;
};

// =============================================================================
//  Unified data layer
// =============================================================================
//  Every page/component reads through `db.*`. If Supabase is configured, we
//  hit the live database. Otherwise we serve the bundled seed so the app
//  still works for demos and first-time contributors.
//
//  Each method has the SAME return type in both modes, so callers don't care.
// =============================================================================

// Static reference data is identical for every install, so we keep it in
// code (no round-trip needed): compliance templates, vendor categories,
// licensee discovery sources.
const STATIC = {
  complianceTemplates: COMPLIANCE_TEMPLATES,
  vendorCategories: VENDOR_CATEGORIES,
  vendorDiscoverySources: VENDOR_DISCOVERY_SOURCES,
};


// ---------------------------------------------------------------------------
//  Query limits + honest error handling
// ---------------------------------------------------------------------------
//  TWO defects found on 2026-08-09 by seeding 100,000 units (SCALE-FINDINGS.md):
//
//  F2  Unbounded `select *` pulled 12 MB of work orders and 7 MB of units into
//      the Node process on EVERY page load. At Forest Hills' 432 units the same
//      code moves ~60 KB, which is why it was never noticed. DEFAULT_LIMIT caps it.
//
//  F4  On a database ERROR these functions returned SAMPLE_* demo rows — fabricated
//      buildings, units, work orders, vendors, certifications and heat logs
//      rendered as if they were real records. That is the same false-assurance
//      class as the HPD "couldn't check" bug: silent, confident, wrong.
//      Returning demo data when Supabase IS configured is never correct; the app
//      has error.tsx / global-error.tsx to render an honest failure instead.
//
//  The `!s` (Supabase unconfigured) path still returns SAMPLE_* — that is real
//  demo mode, and it is not a lie.
// ---------------------------------------------------------------------------

/** Cap on unbounded list reads. Pages that need more must paginate explicitly. */
export const DEFAULT_LIMIT = 500;

/** A configured database that errors must surface, never silently show demo data. */
function dbFail(op: string, error: { message: string }): never {
  console.error(`[db] ${op}:`, error.message);
  throw new Error(
    `Could not load ${op} from the database (${error.message}). ` +
      `Showing no data rather than sample data — refresh, or check the connection.`,
  );
}

// ---------- Read methods ----------
async function fetchBuildings(): Promise<Building[]> {
  const s = getSupabase();
  if (!s) return SAMPLE_BUILDINGS;
  const { data, error } = await s.from("buildings").select("*").order("name");
  if (error) dbFail("fetchBuildings", error);
  return (data ?? []) as Building[];
}

async function fetchBuilding(id: string): Promise<Building | undefined> {
  const s = getSupabase();
  if (!s) return SAMPLE_BUILDINGS.find((b) => b.id === id);
  const { data, error } = await s
    .from("buildings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return data as Building;
}

async function fetchUnits(): Promise<Unit[]> {
  const s = getSupabase();
  if (!s) return SAMPLE_UNITS;
  const { data, error } = await s.from("units").select("*").order("label").limit(DEFAULT_LIMIT);
  if (error) dbFail("fetchUnits", error);
  return (data ?? []) as Unit[];
}

async function fetchUnitsForBuilding(buildingId: string): Promise<Unit[]> {
  const s = getSupabase();
  if (!s) return SAMPLE_UNITS.filter((u) => u.building_id === buildingId);
  const { data, error } = await s
    .from("units")
    .select("*")
    .eq("building_id", buildingId)
    .order("floor")
    .order("label");
  if (error) return [];
  return (data ?? []) as Unit[];
}

async function fetchWorkOrders(): Promise<WorkOrder[]> {
  const s = getSupabase();
  if (!s) return SAMPLE_WORK_ORDERS;
  const { data, error } = await s
    .from("work_orders")
    .select("*")
    .order("reported_at", { ascending: false })
    .limit(DEFAULT_LIMIT);
  if (error) dbFail("fetchWorkOrders", error);
  return (data ?? []) as WorkOrder[];
}

async function fetchWorkOrder(id: string): Promise<WorkOrder | undefined> {
  const s = getSupabase();
  if (!s) {
    return SAMPLE_WORK_ORDERS.find(
      (w) => w.id === id || w.ticket_number === id
    );
  }
  // Match by primary key OR ticket number, mirroring the seed lookup above.
  // Both branches use parameterized `.eq` filters — user input is NEVER
  // interpolated into a PostgREST `.or()` string — so this stays
  // injection-safe. We must not assume the primary key is UUID-shaped:
  // links pass `wo.id` verbatim (e.g. /work-orders/wo-1024/print), and a
  // UUID-only gate would misroute non-UUID ids to a ticket-number lookup
  // that can't match, 404-ing every work-order page.
  const byId = await s
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (byId.data) return byId.data as WorkOrder;
  const byTicket = await s
    .from("work_orders")
    .select("*")
    .eq("ticket_number", id)
    .maybeSingle();
  if (byTicket.error || !byTicket.data) return undefined;
  return byTicket.data as WorkOrder;
}

async function fetchMyVendors(): Promise<Vendor[]> {
  const s = getSupabase();
  if (!s) return SAMPLE_MY_VENDORS;
  const { data, error } = await s
    .from("vendors")
    .select("*")
    .eq("in_my_vendors", true)
    .order("name");
  if (error) dbFail("query", error);
  return (data ?? []) as Vendor[];
}

async function fetchCertifications(): Promise<Certification[]> {
  const s = getSupabase();
  if (!s) return SAMPLE_CERTIFICATIONS;
  const { data, error } = await s
    .from("certifications")
    .select("*")
    .order("expires_at");
  if (error) dbFail("query", error);
  return (data ?? []) as Certification[];
}

async function fetchHeatLogs(): Promise<HeatLog[]> {
  const s = getSupabase();
  if (!s) return SAMPLE_HEAT_LOGS;
  const { data, error } = await s
    .from("heat_logs")
    .select("*")
    .order("recorded_at", { ascending: false })
    .limit(500);
  if (error) dbFail("query", error);
  return (data ?? []) as HeatLog[];
}

async function fetchComplianceItems(): Promise<ComplianceItem[]> {
  // The compliance generator produces a baseline item per (building × template).
  // The compliance_items table holds rows for items the user has marked as
  // completed — those rows' last_completed dates flow back into the generator
  // so anniversary/cyclical items show a real next_due instead of
  // "needs-scheduling".
  const s = getSupabase();
  if (!s) return generateComplianceItems(SAMPLE_BUILDINGS);

  const [buildings, rowsResult] = await Promise.all([
    fetchBuildings(),
    s
      .from("compliance_items")
      .select("building_id, template_id, last_completed, vendor_id, notes"),
  ]);
  const rows = (rowsResult.data ?? []) as Array<{
    building_id: string;
    template_id: string;
    last_completed: string | null;
    vendor_id: string | null;
    notes: string | null;
  }>;
  const completed = rows
    .filter((r) => r.last_completed)
    .map((r) => ({
      building_id: r.building_id,
      template_id: r.template_id,
      last_completed: r.last_completed!,
      vendor_id: r.vendor_id,
      notes: r.notes,
    }));
  return generateComplianceItems(buildings, completed);
}

// Sensitive rent figures live in their own RLS-locked table (admin-only).
// Reads go through the session client, so RLS already returns zero rows to
// non-admins; a missing table or denied read is non-fatal (we just show none).
async function fetchUnitRents(): Promise<Record<string, UnitRent>> {
  const s = getSupabase();
  if (!s) return {};
  const { data, error } = await s
    .from("unit_rents")
    .select("unit_id, base_charge, repeat_charges, total_charge");
  if (error) return {}; // table not created yet, or RLS denied (non-admin)
  const map: Record<string, UnitRent> = {};
  for (const r of (data ?? []) as Array<{
    unit_id: string;
    base_charge: number | null;
    repeat_charges: number | null;
    total_charge: number | null;
  }>) {
    map[r.unit_id] = {
      base: r.base_charge,
      repeat: r.repeat_charges,
      total: r.total_charge,
    };
  }
  return map;
}

async function fetchTasks(): Promise<Task[]> {
  const s = getSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[db] fetchTasks:", error.message);
    return []; // table may not exist yet (pre-migration) — non-fatal
  }
  return (data ?? []) as Task[];
}

async function fetchDocuments(): Promise<Document[]> {
  const s = getSupabase();
  if (!s) return [];
  // Page through all rows — PostgREST caps a single select at 1,000, and we
  // have several thousand imported work-order docs. Without this the Files tab
  // would silently show only the newest 1,000 (most apartments look empty).
  const PAGE = 1000;
  const all: Document[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await s
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[db] fetchDocuments:", error.message);
      return all; // table may not exist yet (pre-migration) — non-fatal
    }
    if (!data?.length) break;
    all.push(...(data as Document[]));
    if (data.length < PAGE) break;
  }
  return all;
}

// =============================================================================
//  Public surface
// =============================================================================

export const db = {
  isLive: isSupabaseConfigured,

  // DB-backed (or seed fallback) — all async
  buildings: fetchBuildings,
  building: fetchBuilding,
  units: fetchUnits,
  unitsForBuilding: fetchUnitsForBuilding,
  unitRents: fetchUnitRents,
  tasks: fetchTasks,
  documents: fetchDocuments,
  workOrders: fetchWorkOrders,
  workOrder: fetchWorkOrder,
  myVendors: fetchMyVendors,
  certifications: fetchCertifications,
  heatLogs: fetchHeatLogs,
  complianceItems: fetchComplianceItems,

  // Static reference data — sync
  complianceTemplates: (): ComplianceTemplate[] => STATIC.complianceTemplates,
  vendorCategories: (): VendorCategory[] => STATIC.vendorCategories,
  vendorDiscoverySources: (): VendorDiscoverySource[] =>
    STATIC.vendorDiscoverySources,
};
