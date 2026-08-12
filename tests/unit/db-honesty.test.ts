import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// =============================================================================
//  db.ts honesty + scale guards (2026-08-09)
// =============================================================================
//  F4: on a DATABASE ERROR, six read functions returned SAMPLE_* demo rows —
//      fabricated buildings/units/work orders/vendors/certifications/heat logs
//      rendered as real records. Same false-assurance class as the HPD bug.
//  F2: unbounded `select *` pulled 12 MB into Node on every page load at
//      100k units (SCALE-FINDINGS.md).
//
//  These are structural: the failure modes need a live Supabase client to
//  reproduce at runtime, but the *shape* of the code is what guarantees them.
// =============================================================================

const SRC = resolve(__dirname, "../../src/lib/db.ts");
const src = () => readFileSync(SRC, "utf8");

describe("db.ts never shows demo data for a real database error", () => {
  it("has no `if (error) … return SAMPLE_*` fallback", () => {
    const lines = src().split("\n");
    const offenders: string[] = [];

    // Inspect only what FOLLOWS each `if (error)`. An earlier version split on
    // blank lines, which lumped the legitimate `if (!s) return SAMPLE_*` demo
    // branch into the same block and reported a false positive on correct code.
    lines.forEach((line, i) => {
      if (!/if \(error\)/.test(line)) return;
      // The handler is either on this line or in the following few.
      const handler = lines.slice(i, i + 4).join("\n");
      // Stop at the next `if (!s)` so a subsequent function can't bleed in.
      const bounded = handler.split(/if \(!s\)/)[0];
      if (/return SAMPLE_/.test(bounded)) offenders.push(`line ${i + 1}: ${line.trim()}`);
    });

    expect(
      offenders,
      `A database error must surface, not render sample data:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("routes database errors through dbFail(), which throws", () => {
    expect(src()).toMatch(/function dbFail\([^)]*\):\s*never/);
    expect(src()).toMatch(/if \(error\) dbFail\(/);
  });

  it("still returns SAMPLE_* when Supabase is simply unconfigured (real demo mode)", () => {
    // Demo mode is not a lie — it must survive.
    expect(src()).toMatch(/if \(!s\) return SAMPLE_/);
  });
});

describe("db.ts bounds its unbounded list reads", () => {
  it("declares a default limit", () => {
    expect(src()).toMatch(/export const DEFAULT_LIMIT = \d+/);
  });

  it("caps the units listing", () => {
    expect(src()).toMatch(/from\("units"\)\.select\("\*"\)\.order\("label"\)\.limit\(DEFAULT_LIMIT\)/);
  });

  it("caps the work-orders listing", () => {
    const text = src();
    const stmt = text.slice(text.indexOf('.from("work_orders")'));
    expect(stmt.slice(0, 300)).toMatch(/\.limit\(DEFAULT_LIMIT\)/);
  });
});
