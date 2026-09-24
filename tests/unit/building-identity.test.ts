import { describe, expect, it } from "vitest";
import {
  checkBuildingIdentity,
  composeBbl,
  identityMismatches,
} from "@/lib/building-identity";
import type { HpdViolation } from "@/lib/hpd";

const row = (over: Partial<HpdViolation>): HpdViolation => ({
  violationid: `v-${Math.random()}`,
  ...over,
});

describe("composeBbl", () => {
  it("prefers a well-formed bbl field", () => {
    expect(composeBbl(row({ bbl: "4021590002" }))).toBe("4021590002");
  });

  it("composes from boro/block/lot with padding when bbl is absent", () => {
    expect(composeBbl(row({ boroid: "4", block: "2159", lot: "2" }))).toBe(
      "4021590002",
    );
  });

  it("returns null rather than inventing digits from junk", () => {
    expect(composeBbl(row({}))).toBeNull();
    expect(composeBbl(row({ boroid: "44", block: "2159", lot: "2" }))).toBeNull();
    expect(composeBbl(row({ bbl: "123" }))).toBeNull();
  });
});

describe("checkBuildingIdentity", () => {
  const building = { bin: "4432109", bbl: "4021590002" };
  const cityRows = [
    row({ bin: "4432109", boroid: "4", block: "2159", lot: "2" }),
    row({ bin: "4432109", bbl: "4021590002" }),
    row({ bin: "4432109", bbl: "4021590002" }),
  ];

  it("confirms when stored values match the city's majority", () => {
    const findings = checkBuildingIdentity(building, cityRows);
    expect(findings.map((f) => f.status)).toEqual(["confirmed", "confirmed"]);
    expect(identityMismatches(findings)).toEqual([]);
  });

  it("flags a mismatch and reports what the city says", () => {
    const findings = checkBuildingIdentity({ ...building, bin: "9999999" }, cityRows);
    const bad = identityMismatches(findings);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({
      field: "bin",
      stored: "9999999",
      observed: "4432109",
      observations: 3,
    });
  });

  it("a single mistyped city row cannot outvote the majority", () => {
    const findings = checkBuildingIdentity(building, [
      ...cityRows,
      row({ bin: "1111111", bbl: "4021590002" }),
    ]);
    expect(identityMismatches(findings)).toEqual([]);
  });

  it("is unverified — never a mismatch — when either side is silent", () => {
    // No stored value.
    expect(
      checkBuildingIdentity({ bin: "", bbl: "" }, cityRows).map((f) => f.status),
    ).toEqual(["unverified", "unverified"]);
    // No city data on the rows.
    expect(
      checkBuildingIdentity(building, [row({}), row({})]).map((f) => f.status),
    ).toEqual(["unverified", "unverified"]);
    // No rows at all.
    expect(checkBuildingIdentity(building, []).map((f) => f.status)).toEqual([
      "unverified",
      "unverified",
    ]);
  });
});
