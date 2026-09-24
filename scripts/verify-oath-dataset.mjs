#!/usr/bin/env node
// =============================================================================
//  verify-oath-dataset.mjs — prove the OATH integration against the LIVE API
// =============================================================================
//  The dev environment this feature was built in could not reach NYC Open
//  Data, so the dataset's field names and block/lot spellings come from its
//  published schema, not a live probe. This script is the live probe: run it
//  from any machine with internet (no auth needed):
//
//      node scripts/verify-oath-dataset.mjs
//
//  It (1) fetches one row of jz4z-kudi and diffs its fields against what
//  src/lib/oath.ts expects, (2) runs the exact campus-BBL query the refresh
//  endpoint uses and reports how many summonses each building gets. Exits
//  non-zero if an expected field is missing or the campus query errors, so it
//  can gate CI once network is available there.
// =============================================================================

const DATASET = "https://data.cityofnewyork.us/resource/jz4z-kudi.json";

// Fields the QUERY itself depends on ($where/$order/attribution/row id) —
// one of these missing breaks the integration, so it fails the script.
const CRITICAL_FIELDS = [
  "ticket_number",
  "issuing_agency",
  "violation_date",
  "violation_location_borough",
  "violation_location_block_no",
  "violation_location_lot_no",
  "violation_location_house",
];

// Fields the app merely reads if present (every one is optional in
// src/lib/oath.ts, and the open/closed heuristic degrades conservatively) —
// absence is reported, not fatal. The dataset's schema has shed columns
// before (respondent fields removed 2026-05).
const OPTIONAL_FIELDS = [
  "violation_location_street_name",
  "hearing_status",
  "hearing_result",
  "hearing_date",
  "compliance_status",
  "charge_1_code_description",
  "penalty_imposed",
  "paid_amount",
  "balance_due",
];

// Same variants bblWhereClause() generates for BBL 4021590002.
const CAMPUS_WHERE =
  "upper(violation_location_borough) in ('QUEENS','4')" +
  " AND violation_location_block_no in ('02159','2159')" +
  " AND violation_location_lot_no in ('0002','2')";

const HOUSES = { "6227": "Building 1", "10853": "Building 2", "11001": "Building 3" };

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

let failed = false;

// --- 1. Field existence, probed definitively per field ----------------------
//  Sampling one row is WRONG here (learned 2026-09-24): Socrata omits keys
//  whose value is empty on that row, so real columns looked "missing" while
//  a $where on the same column returned 118 rows. A $select probe answers
//  for the schema itself: 200 = column exists, 400 = it does not.
console.log("1) Probing dataset columns against src/lib/oath.ts expectations…");
async function columnExists(field) {
  const res = await fetch(
    `${DATASET}?$select=${encodeURIComponent(field)}&$limit=1`,
    { headers: { Accept: "application/json" } },
  );
  if (res.ok) return true;
  if (res.status === 400) return false;
  throw new Error(`HTTP ${res.status}`);
}
for (const f of CRITICAL_FIELDS) {
  if (await columnExists(f)) {
    console.log(`   ✓ ${f}`);
  } else {
    console.error(`   ✗ MISSING (query-critical): ${f} — update src/lib/oath.ts`);
    failed = true;
  }
}
for (const f of OPTIONAL_FIELDS) {
  if (await columnExists(f)) {
    console.log(`   ✓ ${f}`);
  } else {
    console.warn(`   ⚠ absent from schema: ${f} — app degrades gracefully, but review src/lib/oath.ts`);
  }
}

// --- 2. The exact campus query the refresh endpoint runs --------------------
console.log("\n2) Running the campus-BBL query (Queens block 2159 lot 2)…");
const rows = await getJson(
  `${DATASET}?$where=${encodeURIComponent(CAMPUS_WHERE)}&$limit=1000&$order=violation_date DESC`,
);
console.log(`   ${rows.length} summonses on the lot`);

const perBuilding = { "Building 1": 0, "Building 2": 0, "Building 3": 0, "campus/unmatched": 0 };
const agencies = {};
for (const r of rows) {
  const house = String(r.violation_location_house ?? "").replace(/[^0-9]/g, "");
  const b = HOUSES[house] ?? "campus/unmatched";
  perBuilding[b]++;
  const a = r.issuing_agency ?? "(none)";
  agencies[a] = (agencies[a] ?? 0) + 1;
}
console.log("   attribution:", perBuilding);
console.log("   by issuing agency:", agencies);

if (rows.length === 0) {
  console.warn(
    "\n   ⚠ 0 rows. Either the campus genuinely has no OATH summonses, or the",
    "\n     block/lot spelling differs — check with:",
    `\n     ${DATASET}?$select=violation_location_block_no,violation_location_lot_no&$where=violation_location_house='62-27'&$limit=5`,
  );
}

console.log(failed ? "\nRESULT: FAILED — field mismatch above." : "\nRESULT: OK");
process.exit(failed ? 1 : 0);
