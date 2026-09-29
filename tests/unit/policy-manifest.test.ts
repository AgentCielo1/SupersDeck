import { describe, expect, it } from "vitest";
import {
  EXPECTED_POLICIES,
  TABLES_REQUIRING_READ,
  missingPolicies,
  tablesWithoutRead,
  type PolicyRow,
} from "@/lib/policy-manifest";

// A checker for missing policies is itself a guard, so the discipline from
// production-env.test.ts applies: every "fires" assertion is paired with a
// "stands down" one, so neither an always-true nor always-false comparison
// can pass this file.

/** The live list a healthy database would return: everything the manifest
 *  expects, plus one read policy per read-required table. */
function healthyLive(): PolicyRow[] {
  const rows: PolicyRow[] = EXPECTED_POLICIES.map((e) => ({
    schemaname: e.schema,
    tablename: e.table,
    policyname: e.policy,
    cmd: e.cmd,
    permissive: e.policy === "org isolation" || e.policy === "ecb: org isolation"
      ? "RESTRICTIVE"
      : "PERMISSIVE",
  }));
  for (const t of TABLES_REQUIRING_READ) {
    rows.push({
      schemaname: "public",
      tablename: t,
      policyname: `${t}: some read policy`,
      cmd: "SELECT",
      permissive: "PERMISSIVE",
    });
  }
  return rows;
}

describe("missingPolicies", () => {
  it("stands down on a healthy database", () => {
    expect(missingPolicies(healthyLive())).toEqual([]);
  });

  it("FIRES on exactly the policy that is dropped, naming it", () => {
    const live = healthyLive().filter(
      (r) => r.policyname !== "work_orders: update (asmp)",
    );
    const missing = missingPolicies(live);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("work_orders");
    expect(missing[0]).toContain("update (asmp)");
    expect(missing[0]).toContain("UPDATE");
  });

  it("catches a dropped STORAGE policy the same way", () => {
    const live = healthyLive().filter(
      (r) => r.policyname !== "work-orders: org upload",
    );
    const missing = missingPolicies(live);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("storage.objects");
  });

  it("a same-named policy with the wrong cmd does not count as present", () => {
    const live = healthyLive().map((r) =>
      r.policyname === "units: update (asm)" ? { ...r, cmd: "SELECT" } : r,
    );
    expect(missingPolicies(live).some((m) => m.includes("units"))).toBe(true);
  });

  it("an empty database reports the whole manifest", () => {
    expect(missingPolicies([])).toHaveLength(EXPECTED_POLICIES.length);
  });
});

describe("tablesWithoutRead", () => {
  it("stands down when every table has some permissive read", () => {
    expect(tablesWithoutRead(healthyLive())).toEqual([]);
  });

  it("FIRES for a table whose only read policy vanished", () => {
    const live = healthyLive().filter(
      (r) => !(r.tablename === "work_orders" && r.cmd === "SELECT"),
    );
    expect(tablesWithoutRead(live)).toEqual(["work_orders"]);
  });

  it("a RESTRICTIVE select does not count as readable", () => {
    const live = healthyLive().map((r) =>
      r.tablename === "units" && r.cmd === "SELECT"
        ? { ...r, permissive: "RESTRICTIVE" }
        : r,
    );
    expect(tablesWithoutRead(live)).toContain("units");
  });

  it("a FOR ALL permissive policy counts as readable", () => {
    // work_order_updates' only expected policy is "write (asmp)" FOR ALL —
    // that alone must satisfy the read requirement.
    const live = healthyLive().filter(
      (r) => !(r.tablename === "work_order_updates" && r.cmd === "SELECT"),
    );
    expect(tablesWithoutRead(live)).not.toContain("work_order_updates");
  });
});

describe("manifest sanity", () => {
  it("covers the four incidents' policies by name", () => {
    const names = EXPECTED_POLICIES.map((e) => e.policy);
    expect(names).toContain("units: update (asm)");
    expect(names).toContain("work_orders: update (asmp)");
    expect(names).toContain("work-orders: org upload");
  });

  it("has no duplicate entries", () => {
    const keys = EXPECTED_POLICIES.map(
      (e) => `${e.schema}.${e.table}.${e.policy}.${e.cmd}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
