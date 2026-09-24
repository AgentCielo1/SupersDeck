import type { Building } from "@/types";

// =============================================================================
//  NYC OATH/ECB summons pull (data.cityofnewyork.us · jz4z-kudi)
// =============================================================================
//  "OATH Hearings Division Case Status" is the docket of every summons
//  adjudicated at the Office of Administrative Trials and Hearings — the
//  tribunal formerly called ECB. It covers summonses from EVERY issuing
//  agency (DEP, DOB, FDNY, Sanitation, DOHMH, …), so this one dataset is the
//  "everything besides HPD" enforcement feed: charge, hearing date + status,
//  penalty imposed, balance due.
//
//  LOCATION MODEL — this portfolio is one co-op campus on ONE tax lot
//  (BBL 4021590002: Queens block 2159, lot 2; verified 2026-09-24 via
//  openigloo + NYCHA Real Talk + Forest Hills MHA building info). OATH
//  locates summonses by lot, so we query once per distinct BBL and then
//  attribute each row to a building by its house number. Rows that match the
//  lot but no known house number are kept as campus-wide (building_id null)
//  — dropped rows would be false assurance, the cardinal sin of this module's
//  HPD sibling too.
//
//  The dataset's block/lot/borough columns are strings with inconsistent
//  zero-padding across years, so the query ORs the plausible spellings.
//  scripts/verify-oath-dataset.mjs proves the real spellings against the live
//  API (this repo's dev environment cannot reach NYC Open Data).
// =============================================================================

export interface OathSummons {
  ticket_number?: string;
  issuing_agency?: string;
  respondent_first_name?: string;
  respondent_last_name?: string;
  violation_date?: string;
  violation_location_borough?: string;
  violation_location_block_no?: string;
  violation_location_lot_no?: string;
  violation_location_house?: string;
  violation_location_street_name?: string;
  violation_location_zip_code?: string;
  hearing_status?: string;
  hearing_result?: string;
  hearing_date?: string;
  compliance_status?: string;
  charge_1_code?: string;
  charge_1_code_section?: string;
  charge_1_code_description?: string;
  penalty_imposed?: string;
  paid_amount?: string;
  balance_due?: string;
  total_violation_amount?: string;
}

const DATASET = "https://data.cityofnewyork.us/resource/jz4z-kudi.json";

// ---------------------------------------------------------------------------
//  BBL helpers
// ---------------------------------------------------------------------------

/** Split a 10-digit BBL into its parts, or null if it isn't one. */
export function parseBbl(
  bbl: string,
): { borough: number; block: number; lot: number } | null {
  const digits = bbl.replace(/\D/g, "");
  if (digits.length !== 10) return null;
  const borough = Number(digits[0]);
  const block = Number(digits.slice(1, 6));
  const lot = Number(digits.slice(6));
  if (borough < 1 || borough > 5 || block === 0) return null;
  return { borough, block, lot };
}

const BOROUGH_NAMES: Record<number, string[]> = {
  1: ["MANHATTAN", "NEW YORK", "MN", "1"],
  2: ["BRONX", "BX", "2"],
  3: ["BROOKLYN", "KINGS", "BK", "3"],
  4: ["QUEENS", "QN", "QNS", "4"],
  5: ["STATEN ISLAND", "RICHMOND", "SI", "5"],
};

/** Padding variants the dataset has used for block/lot over the years. */
export function numberVariants(n: number, widths: number[]): string[] {
  const out = new Set<string>();
  for (const w of widths) out.add(String(n).padStart(w, "0"));
  out.add(String(n));
  return [...out];
}

/** SoQL $where clause matching one BBL, tolerant of padding + borough naming. */
export function bblWhereClause(bbl: string): string | null {
  const parsed = parseBbl(bbl);
  if (!parsed) return null;
  const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const boros = (BOROUGH_NAMES[parsed.borough] ?? [])
    .map(quote)
    .join(",");
  const blocks = numberVariants(parsed.block, [5]).map(quote).join(",");
  const lots = numberVariants(parsed.lot, [4]).map(quote).join(",");
  return (
    `upper(violation_location_borough) in (${boros})` +
    ` AND violation_location_block_no in (${blocks})` +
    ` AND violation_location_lot_no in (${lots})`
  );
}

// ---------------------------------------------------------------------------
//  Attribution — which building on the shared lot does a summons belong to?
// ---------------------------------------------------------------------------

/** "62-27" / "62 27" / "6227" all normalize to "6227". */
export function normalizeHouse(house: string | undefined): string {
  return (house ?? "").replace(/[^0-9]/g, "");
}

/** First house-number token of a building's street address. */
export function buildingHouse(b: Building): string {
  const [streetPart] = b.address.split(",");
  const token = (streetPart ?? "").trim().split(/\s+/)[0] ?? "";
  return normalizeHouse(token);
}

/**
 * Attribute a summons to one of the campus buildings by house number, or
 * null for a campus-wide / unmatched location (kept, never dropped).
 */
export function attributeSummons(
  s: OathSummons,
  buildings: Building[],
): Building | null {
  const house = normalizeHouse(s.violation_location_house);
  if (!house) return null;
  const hit = buildings.find((b) => buildingHouse(b) === house);
  return hit ?? null;
}

// ---------------------------------------------------------------------------
//  Status + money + hearing-clock helpers
// ---------------------------------------------------------------------------

const CLOSED_RE = /PAID IN FULL|DISMISS|WRITTEN OFF|CLOSED|COMPL(IED|IANCE) (DONE|OK)|CURED/i;
const DEFAULT_RE = /DEFAULT/i;

export function parseMoney(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Open = still owed or still in front of the tribunal. Conservative on
 * purpose: an unrecognized status counts as open — a summons wrongly shown
 * open costs a click; one wrongly shown closed costs a default judgment.
 */
export function isOpenSummons(s: OathSummons): boolean {
  const balance = parseMoney(s.balance_due);
  if (balance != null && balance > 0) return true;
  const status = `${s.hearing_status ?? ""} ${s.hearing_result ?? ""} ${s.compliance_status ?? ""}`;
  if (CLOSED_RE.test(status)) return false;
  return true;
}

/** Defaulted at OATH — the most expensive state a summons can be in. */
export function isDefaulted(s: OathSummons): boolean {
  return DEFAULT_RE.test(`${s.hearing_status ?? ""} ${s.hearing_result ?? ""}`);
}

/**
 * The actionable clock on an ECB summons is the hearing date (missing it
 * defaults the penalty) — the analog of the HPD cure deadline.
 */
export function hearingClock(
  s: OathSummons,
  now = Date.now(),
): { label: string; days: number | null } {
  if (!s.hearing_date) return { label: "—", days: null };
  const t = new Date(s.hearing_date).getTime();
  if (!Number.isFinite(t)) return { label: "—", days: null };
  const days = Math.round((t - now) / 86400000);
  if (days > 0) return { label: `Hearing in ${days}d`, days };
  if (days === 0) return { label: "Hearing today", days };
  return { label: `Heard ${Math.abs(days)}d ago`, days };
}

/** DEP / DOB / FDNY / DSNY / DOHMH / … from the dataset's free-text agency. */
export function normalizeAgency(agency: string | undefined): string {
  const a = (agency ?? "").toUpperCase();
  if (/ENVIRONMENTAL PROTECTION|\bDEP\b/.test(a)) return "DEP";
  if (/BUILDINGS|\bDOB\b/.test(a)) return "DOB";
  if (/FIRE|\bFDNY\b/.test(a)) return "FDNY";
  if (/SANITATION|\bDSNY\b/.test(a)) return "DSNY";
  if (/HEALTH|\bDOHMH\b/.test(a)) return "DOHMH";
  if (/HOUSING PRESERVATION|\bHPD\b/.test(a)) return "HPD";
  if (/TRANSPORTATION|\bDOT\b/.test(a)) return "DOT";
  return a || "OTHER";
}

// ---------------------------------------------------------------------------
//  Lookup — the same honest discriminated result as lib/hpd.ts:
//  "we could not check" must NEVER look like "no summonses".
// ---------------------------------------------------------------------------

export type OathLookupFailureKind =
  | "unparsable_bbl" // building has no 10-digit BBL — we never asked
  | "http_error"
  | "network_error";

export interface OathLookupFailure {
  kind: OathLookupFailureKind;
  detail: string;
}

export type OathLookupResult =
  | { ok: true; summonses: OathSummons[] }
  | { ok: false; failure: OathLookupFailure };

export function describeOathFailure(f: OathLookupFailure): string {
  switch (f.kind) {
    case "unparsable_bbl":
      return "This building has no valid BBL on file, so no OATH/ECB lookup was performed. Add its BBL under Buildings → Edit.";
    case "http_error":
      return `NYC Open Data rejected the OATH lookup (${f.detail}).`;
    case "network_error":
      return `Couldn't reach NYC Open Data for the OATH lookup (${f.detail}).`;
  }
}

export interface OathFetchOpts {
  limit?: number; // default 1000 — a campus docket, not a single building's
}

/** All summonses on one tax lot (the whole campus for a shared-lot co-op). */
export async function lookupOathSummonsesForBbl(
  bbl: string,
  opts: OathFetchOpts = {},
): Promise<OathLookupResult> {
  const where = bblWhereClause(bbl);
  if (!where) {
    return { ok: false, failure: { kind: "unparsable_bbl", detail: bbl } };
  }
  const params = new URLSearchParams({
    $where: where,
    $limit: String(opts.limit ?? 1000),
    $order: "violation_date DESC",
  });
  const url = `${DATASET}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[oath] fetch failed:", res.status, body.slice(0, 300));
      return {
        ok: false,
        failure: { kind: "http_error", detail: `HTTP ${res.status}` },
      };
    }
    const rows = (await res.json()) as OathSummons[];
    return { ok: true, summonses: rows };
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : "unknown error";
    console.error("[oath] lookup threw for BBL", bbl, detail);
    return { ok: false, failure: { kind: "network_error", detail } };
  }
}
