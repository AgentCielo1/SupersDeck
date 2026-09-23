import { beforeEach, describe, it, expect, vi } from "vitest";
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

// =============================================================================
//  The BEHAVIOURAL half (2026-09-22)
// =============================================================================
//  Everything above is source-text inspection. It proves the SHAPE of db.ts,
//  which is why it caught the original `return SAMPLE_` recurrence — but a
//  grep can only forbid the spellings it was told about. BUG-224: the same
//  false-assurance shape survives any rewrite that doesn't use those exact
//  characters (`return SAMPLE_` → `return seed.BUILDINGS`, a ternary, a helper).
//
//  These tests execute the real read functions against a Supabase client that
//  ERRORS and assert the observable outcome: the call REJECTS. They are paired
//  with positive controls, so they cannot pass by everything throwing, and
//  with a demo-mode control, so honesty can't be bought by killing demo mode.
// =============================================================================

const clientRef: { value: unknown } = { value: null };

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: () => clientRef.value,
}));
vi.mock("@/lib/supabase", () => ({
  getServerSupabase: () => null,
  isSupabaseConfigured: () => true,
}));

type QueryResult = { data: unknown; error: { message: string } | null };

/**
 * A chainable PostgREST stand-in: every builder method returns itself, and
 * awaiting it yields `result`. This lets the REAL fetch* bodies run —
 * `.select().order().limit()` and all — so what we assert is behaviour, not text.
 */
function stubSupabase(result: QueryResult) {
  const builder: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop === "symbol") return undefined;
        if (prop === "then") {
          return (onOk: any, onErr: any) =>
            Promise.resolve(result).then(onOk, onErr);
        }
        return () => builder;
      },
    },
  );
  return { from: () => builder };
}

// The six reads BUG-002 named. `db` key → the table the seed would have faked.
const READS: Array<keyof typeof import("@/lib/db")["db"]> = [
  "buildings",
  "units",
  "workOrders",
  "myVendors",
  "certifications",
  "heatLogs",
];

describe("db.ts read functions BEHAVE honestly on a database error", () => {
  beforeEach(() => {
    vi.resetModules();
    clientRef.value = null;
  });

  for (const name of READS) {
    it(`db.${String(name)}() rejects on a database error instead of resolving to rows`, async () => {
      clientRef.value = stubSupabase({
        data: null,
        error: { message: "permission denied for relation" },
      });
      const { db } = await import("@/lib/db");

      // The whole point: a CONFIGURED database that errors must not resolve.
      // Any resolved value here — [] or fabricated seed rows — is the bug.
      await expect(
        (db[name] as () => Promise<unknown>)(),
      ).rejects.toThrow(/A database error must surface|database/i);
    });

    it(`db.${String(name)}() still returns real rows when the query succeeds`, async () => {
      // Positive control. Without it, "rejects" would also pass against a
      // db.ts that throws unconditionally — i.e. a broken app scored as honest.
      clientRef.value = stubSupabase({
        data: [{ id: "row-1" }],
        error: null,
      });
      const { db } = await import("@/lib/db");
      const rows = (await (db[name] as () => Promise<unknown[]>)()) as unknown[];
      expect(Array.isArray(rows)).toBe(true);
      expect(rows).toHaveLength(1);
    });
  }

  it("still serves demo data when Supabase is UNCONFIGURED (not an error)", async () => {
    // Demo mode is not a lie and must survive the honesty fix. If this goes
    // red, someone bought honesty by breaking the demo/first-run experience.
    clientRef.value = null;
    const { db } = await import("@/lib/db");
    const buildings = await db.buildings();
    expect(buildings.length).toBeGreaterThan(0);
  });
});
