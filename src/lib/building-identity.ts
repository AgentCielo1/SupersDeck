import type { HpdViolation } from "@/lib/hpd";

// =============================================================================
//  Building identity verification — BIN/BBL can never silently be wrong
// =============================================================================
//  ORIGIN (2026-09-24): the portfolio's BINs were backfilled from research
//  with only ONE corroborating source. Nothing in the app would ever have
//  noticed a wrong one. This module closes that: every HPD violation row we
//  already download for a building carries the CITY'S bin/bbl for that
//  address, so each sync doubles as a free cross-check of our stored
//  identifiers against the authoritative record.
//
//  Two consumers:
//    • /violations renders a warning on any building whose stored BIN/BBL
//      disagrees with what the city publishes for its address.
//    • /api/violations/refresh reports mismatches in its summary (207), so
//      cron monitoring sees them too.
//  A third, independent layer lives in scripts/verify-building-identifiers.mjs
//  (CI): it queries HPD *and* DOB and fails the build on a positive mismatch.
// =============================================================================

export interface IdentityFinding {
  field: "bin" | "bbl";
  status: "confirmed" | "mismatch" | "unverified";
  stored: string;
  /** Majority value observed in the city's rows ("" when none carried one). */
  observed: string;
  /** How many rows carried the observed value. */
  observations: number;
}

/** Compose a 10-digit BBL from a row's boro/block/lot when bbl is absent. */
export function composeBbl(row: HpdViolation): string | null {
  if (row.bbl && /^\d{10}$/.test(row.bbl)) return row.bbl;
  const boro = row.boroid ?? "";
  const block = row.block ?? "";
  const lot = row.lot ?? "";
  if (!/^\d$/.test(boro) || !/^\d+$/.test(block) || !/^\d+$/.test(lot)) return null;
  return `${boro}${block.padStart(5, "0")}${lot.padStart(4, "0")}`;
}

function majority(values: (string | null)[]): { value: string; count: number } {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = { value: "", count: 0 };
  for (const [value, count] of counts) {
    if (count > best.count) best = { value, count };
  }
  return best;
}

/**
 * Compare a building's stored bin/bbl against the identifiers the city's own
 * rows carry for its address. Majority vote across rows guards against the
 * occasional mistyped row in the dataset itself.
 *
 * Verdicts:
 *   confirmed  — stored value matches the city's majority value
 *   mismatch   — city rows disagree with what we store (act on this!)
 *   unverified — nothing to compare (no stored value, or no rows carried one)
 */
export function checkBuildingIdentity(
  building: { bin?: string; bbl?: string },
  rows: HpdViolation[],
): IdentityFinding[] {
  const observedBin = majority(rows.map((r) => r.bin ?? null));
  const observedBbl = majority(rows.map((r) => composeBbl(r)));

  const judge = (
    field: "bin" | "bbl",
    stored: string,
    observed: { value: string; count: number },
  ): IdentityFinding => {
    const base = {
      field,
      stored,
      observed: observed.value,
      observations: observed.count,
    };
    if (!stored || !observed.value) return { ...base, status: "unverified" };
    return {
      ...base,
      status: stored === observed.value ? "confirmed" : "mismatch",
    };
  };

  return [
    judge("bin", (building.bin ?? "").trim(), observedBin),
    judge("bbl", (building.bbl ?? "").trim(), observedBbl),
  ];
}

export function identityMismatches(findings: IdentityFinding[]): IdentityFinding[] {
  return findings.filter((f) => f.status === "mismatch");
}
