// =============================================================================
//  Policy manifest — every RLS policy the app depends on, by name
// =============================================================================
//  ORIGIN. Four production incidents were "a policy quietly missing":
//    2026-09-08  units UPDATE            → tenant saves failed as "not found"
//    2026-09-24  (cron read, RLS-shaped) → scheduled syncs no-oped for weeks
//    2026-09-28  storage work-orders     → paper-photo uploads refused
//    2026-09-29  work_orders UPDATE      → close-out failed as "not found"
//  Each was invisible until a person hit it. This manifest is the standing
//  answer: /api/health compares it against the live database (via the
//  list_app_policies() function, supabase/migration-policy-health.sql) and
//  turns degraded the moment anything here is missing.
//
//  KEEP IN STEP with supabase/fix-write-policies.sql (write policies),
//  migration-storage-buckets.sql (storage), migration-ecb-violations.sql
//  (ECB) and the org-isolation migration (restrictive belts). Adding a
//  policy the app depends on without listing it here recreates the original
//  blind spot.
// =============================================================================

export type PolicyRow = {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string; // 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  permissive?: string; // 'PERMISSIVE' | 'RESTRICTIVE'
};

export type ExpectedPolicy = {
  schema: string;
  table: string;
  policy: string;
  cmd: string;
};

const P = (table: string, policy: string, cmd: string): ExpectedPolicy => ({
  schema: "public",
  table,
  policy,
  cmd,
});
const S = (policy: string, cmd: string): ExpectedPolicy => ({
  schema: "storage",
  table: "objects",
  policy,
  cmd,
});

export const EXPECTED_POLICIES: ExpectedPolicy[] = [
  // ---- write policies (supabase/fix-write-policies.sql) --------------------
  P("buildings", "buildings: write (asm)", "INSERT"),
  P("buildings", "buildings: update (asm)", "UPDATE"),
  P("buildings", "buildings: delete (admin)", "DELETE"),
  P("units", "units: write (asm)", "INSERT"),
  P("units", "units: update (asm)", "UPDATE"),
  P("units", "units: delete (admin)", "DELETE"),
  P("compliance_items", "compliance_items: write (asm)", "INSERT"),
  P("compliance_items", "compliance_items: update (asm)", "UPDATE"),
  P("compliance_items", "compliance_items: delete (admin)", "DELETE"),
  P("compliance_templates", "compliance_templates: write (admin)", "INSERT"),
  P("compliance_templates", "compliance_templates: update (admin)", "UPDATE"),
  P("compliance_templates", "compliance_templates: delete (admin)", "DELETE"),
  P("vendors", "vendors: write (asm)", "INSERT"),
  P("vendors", "vendors: update (asm)", "UPDATE"),
  P("vendors", "vendors: delete (asm)", "DELETE"),
  P("vendor_categories", "vendor_categories: write (admin)", "ALL"),
  P("vendor_discovery_sources", "vendor_discovery_sources: write (admin)", "ALL"),
  P("work_orders", "work_orders: insert (asmp)", "INSERT"),
  P("work_orders", "work_orders: update (asmp)", "UPDATE"),
  P("work_orders", "work_orders: delete (admin)", "DELETE"),
  P("work_order_updates", "work_order_updates: write (asmp)", "ALL"),
  P("heat_logs", "heat_logs: write (asmp)", "INSERT"),
  P("heat_logs", "heat_logs: update (asm)", "UPDATE"),
  P("heat_logs", "heat_logs: delete (admin)", "DELETE"),
  P("certifications", "certifications: write (asm)", "INSERT"),
  P("certifications", "certifications: update (asm)", "UPDATE"),
  P("certifications", "certifications: delete (admin)", "DELETE"),
  P("profiles", "profiles: admin changes any", "UPDATE"),
  P("profiles", "profiles: user edits own name", "UPDATE"),
  // ---- restrictive org belts (org-isolation migration §5) ------------------
  P("buildings", "org isolation", "ALL"),
  P("units", "org isolation", "ALL"),
  P("work_orders", "org isolation", "ALL"),
  P("violations", "org isolation", "ALL"),
  // ---- ECB (migration-ecb-violations.sql) ----------------------------------
  P("ecb_violations", "ecb: org select", "SELECT"),
  P("ecb_violations", "ecb: org isolation", "ALL"),
  P("ecb_sync", "ecb_sync: auth select", "SELECT"),
  // ---- storage, work-orders bucket (migration-storage-buckets.sql) ---------
  S("work-orders: org read", "SELECT"),
  S("work-orders: org upload", "INSERT"),
  S("work-orders: org update", "UPDATE"),
  S("work-orders: org delete", "DELETE"),
];

/** App tables that must each have at least one permissive read policy —
 *  asserted by existence rather than name, because the read policies' names
 *  have drifted across migrations while their presence is what matters. */
export const TABLES_REQUIRING_READ: string[] = [
  "buildings",
  "units",
  "work_orders",
  "work_order_updates",
  "compliance_items",
  "vendors",
  "heat_logs",
  "certifications",
  "violations",
  "ecb_violations",
  "profiles",
];

const key = (s: string, t: string, p: string, c: string) => `${s}.${t}.${p}.${c}`;

/** Expected policies absent from the live list, as human-readable names. */
export function missingPolicies(live: PolicyRow[]): string[] {
  const have = new Set(
    live.map((r) => key(r.schemaname, r.tablename, r.policyname, r.cmd)),
  );
  return EXPECTED_POLICIES.filter(
    (e) => !have.has(key(e.schema, e.table, e.policy, e.cmd)),
  ).map((e) => `${e.schema}.${e.table} · "${e.policy}" (${e.cmd})`);
}

/** Tables with no permissive SELECT/ALL policy at all — nobody can read them. */
export function tablesWithoutRead(live: PolicyRow[]): string[] {
  const readable = new Set(
    live
      .filter(
        (r) =>
          r.schemaname === "public" &&
          (r.permissive ?? "PERMISSIVE") === "PERMISSIVE" &&
          (r.cmd === "SELECT" || r.cmd === "ALL"),
      )
      .map((r) => r.tablename),
  );
  return TABLES_REQUIRING_READ.filter((t) => !readable.has(t));
}
