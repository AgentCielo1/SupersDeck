import type { Building } from "@/types";

// =============================================================================
//  NYC HPD violation pull (data.cityofnewyork.us)
// =============================================================================
//  Hits the wvxf-dwi5 dataset — "Housing Maintenance Code Violations" — which
//  is the canonical public list of every HPD violation on every building.
//  Free, no auth required. Per-building lookup by housenumber + streetname.
//
//  Cure deadlines (NYC Admin Code §27-2115):
//    Class A   non-hazardous                  90 days
//    Class B   hazardous                      30 days
//    Class C   immediately hazardous          24 hours (or immediate)
//    Class I   information / paperwork        none
// =============================================================================

export interface HpdViolation {
  violationid: string;
  buildingid?: string;
  registrationid?: string;
  housenumber?: string;
  streetname?: string;
  apartment?: string;
  story?: string;
  // NYC Open Data publishes the class as `class` (a reserved-ish field name).
  // We accept both forms because some downstream callers use violationclass.
  class?: "A" | "B" | "C" | "I";
  violationclass?: "A" | "B" | "C" | "I";
  currentstatus?: string;
  currentstatusdate?: string;
  novdescription?: string;
  novissueddate?: string;
  novtype?: string;
  approveddate?: string;
}

/** Returns the class regardless of which field name the API used. */
export function violationClass(v: HpdViolation): "A" | "B" | "C" | "I" | undefined {
  return v.violationclass ?? v.class;
}

/**
 * Convert a building's street address into the housenumber + streetname
 * the HPD dataset uses (NYC's standardized format — uppercase, no ordinal
 * suffixes, no "St"/"Ave" abbreviations).
 *
 *   "62-27 108th Street, Queens, NY 11375"  -> { house: "62-27", street: "108 STREET" }
 *   "108-53 62nd Drive, Queens, NY 11375"   -> { house: "108-53", street: "62 DRIVE" }
 */
export function parseAddressForHpd(address: string):
  | { house: string; street: string }
  | null {
  const [streetPart] = address.split(",");
  if (!streetPart) return null;

  const tokens = streetPart.trim().split(/\s+/);
  if (tokens.length < 2) return null;

  const house = tokens.shift()!;
  let street = tokens.join(" ");

  // Strip ordinal suffixes: "108th" -> "108", "62nd" -> "62", "1st" -> "1"
  street = street.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");

  // Expand / normalize common type abbreviations
  const types: Record<string, string> = {
    St: "STREET",
    "St.": "STREET",
    Street: "STREET",
    Ave: "AVENUE",
    "Ave.": "AVENUE",
    Avenue: "AVENUE",
    Blvd: "BOULEVARD",
    Boulevard: "BOULEVARD",
    Dr: "DRIVE",
    "Dr.": "DRIVE",
    Drive: "DRIVE",
    Rd: "ROAD",
    Road: "ROAD",
    Pl: "PLACE",
    Place: "PLACE",
    Ct: "COURT",
    Court: "COURT",
    Ln: "LANE",
    Lane: "LANE",
    Pkwy: "PARKWAY",
    Parkway: "PARKWAY",
    Ter: "TERRACE",
    Terrace: "TERRACE",
  };
  street = street
    .split(/\s+/)
    .map((w) => types[w] ?? types[w.replace(/\.$/, "")] ?? w.toUpperCase())
    .join(" ");

  return { house, street };
}

const DATASET =
  "https://data.cityofnewyork.us/resource/wvxf-dwi5.json";

export interface FetchOpts {
  openOnly?: boolean;   // default true — filter out closed violations
  limit?: number;       // default 200 per building
}

// -----------------------------------------------------------------------------
//  Lookup results — "we could not check" must NEVER look like "it is clean"
// -----------------------------------------------------------------------------
//  An empty array is a legitimate, meaningful answer: the building has no open
//  violations. A failed lookup is NOT that answer. Returning [] for both is
//  false assurance on a habitability check — the worst failure this product
//  can have, because a super reads "0 open violations" and stops looking.
//
//  So a lookup returns a discriminated result and every caller is forced by
//  the type system to handle the failure case explicitly.
// -----------------------------------------------------------------------------

export type HpdLookupFailureKind =
  | "unparsable_address"  // we never even asked NYC — the address didn't normalize
  | "http_error"          // NYC Open Data answered, but not with data
  | "network_error";      // timeout / DNS / connection reset / malformed JSON

export interface HpdLookupFailure {
  kind: HpdLookupFailureKind;
  detail: string;
}

export type HpdLookupResult =
  | { ok: true; violations: HpdViolation[] }
  | { ok: false; failure: HpdLookupFailure };

/** Human-readable, non-alarming explanation for the UI. */
export function describeHpdFailure(f: HpdLookupFailure): string {
  switch (f.kind) {
    case "unparsable_address":
      return "We couldn't convert this building's address into the format HPD uses, so no lookup was performed.";
    case "http_error":
      return `NYC Open Data rejected the lookup (${f.detail}).`;
    case "network_error":
      return `Couldn't reach NYC Open Data (${f.detail}).`;
  }
}

export async function lookupHpdViolationsForBuilding(
  b: Building,
  opts: FetchOpts = {}
): Promise<HpdLookupResult> {
  const parsed = parseAddressForHpd(b.address);
  if (!parsed) {
    return {
      ok: false,
      failure: { kind: "unparsable_address", detail: b.address },
    };
  }

  const params = new URLSearchParams({
    housenumber: parsed.house,
    streetname: parsed.street,
    $limit: String(opts.limit ?? 200),
    $order: "novissueddate DESC",
  });

  // openOnly default true: only rows whose currentstatus contains OPEN-ish
  // strings. The dataset uses values like "NOV SENT OUT", "VIOLATION OPEN",
  // "VIOLATION CLOSED", "VIOLATION DISMISSED", etc.
  // We filter open-ish ones client-side after fetch (simpler than SoQL).
  const url = `${DATASET}?${params.toString()}`;

  let rawRows: HpdViolation[];
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),  // never hang the cron/refresh on NYC Open Data
      next: { revalidate: 3600 },           // cache for 1 hour
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[hpd] fetch failed:", res.status, body);
      return {
        ok: false,
        failure: { kind: "http_error", detail: `HTTP ${res.status}` },
      };
    }
    rawRows = (await res.json()) as HpdViolation[];
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : "unknown error";
    console.error("[hpd] lookup threw for", b.address, detail);
    return { ok: false, failure: { kind: "network_error", detail } };
  }

  // Normalize: NYC Open Data uses `class`, our existing code uses
  // `violationclass`. Copy whichever side has a value into both.
  const rows = rawRows.map((r) => {
    const cls = r.violationclass ?? r.class;
    return { ...r, class: cls, violationclass: cls };
  });

  const openOnly = opts.openOnly !== false;
  return {
    ok: true,
    violations: openOnly
      ? rows.filter((r) => !/CLOSE|DISMISS|RESOLVED|CERTIFIED/i.test(r.currentstatus ?? ""))
      : rows,
  };
}

/**
 * Look up every building. Failures are isolated per building — one building's
 * bad address or a transient HTTP error must not blank out the others (the old
 * Promise.all would reject the whole batch and the page showed "—" everywhere).
 */
export async function lookupHpdViolationsForBuildings(
  bs: Building[],
  opts: FetchOpts = {}
): Promise<Record<string, HpdLookupResult>> {
  const entries = await Promise.all(
    bs.map(async (b) => {
      // lookupHpdViolationsForBuilding already converts throws into a failure
      // result; this catch is belt-and-braces so a bug in it can't take the
      // whole batch down.
      try {
        return [b.id, await lookupHpdViolationsForBuilding(b, opts)] as const;
      } catch (e: unknown) {
        const detail = e instanceof Error ? e.message : "unknown error";
        return [
          b.id,
          { ok: false as const, failure: { kind: "network_error" as const, detail } },
        ] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

/** Convenience for callers that only need the rows and have handled failure. */
export function violationsOrEmpty(r: HpdLookupResult | undefined): HpdViolation[] {
  return r?.ok ? r.violations : [];
}

export function cureDeadline(v: HpdViolation): { label: string; days: number | null } {
  // Use the normalizer, not v.violationclass directly — a raw dataset row that
  // only carries `class` would otherwise silently fall through to "no clock".
  const cls = violationClass(v);
  const issued = v.novissueddate ? new Date(v.novissueddate) : null;
  if (!issued) return { label: "Unknown", days: null };

  let allowedDays: number;
  switch (cls) {
    case "A": allowedDays = 90; break;
    case "B": allowedDays = 30; break;
    case "C": allowedDays = 1; break;        // 24 hours
    default: return { label: "—", days: null };
  }
  const due = new Date(issued);
  due.setDate(due.getDate() + allowedDays);
  const remaining = Math.round((due.getTime() - Date.now()) / 86400000);
  if (remaining < 0) return { label: `${Math.abs(remaining)}d overdue`, days: remaining };
  if (remaining === 0) return { label: "Due today", days: 0 };
  return { label: `${remaining}d left`, days: remaining };
}
