import { describe, expect, it } from "vitest";
import type { Building } from "@/types";
import {
  attributeSummons,
  bblWhereClause,
  buildingHouse,
  hearingClock,
  isDefaulted,
  isOpenSummons,
  normalizeAgency,
  normalizeHouse,
  numberVariants,
  parseBbl,
  parseMoney,
  type OathSummons,
} from "@/lib/oath";
import { SAMPLE_BUILDINGS } from "@/data/sample-data";

const DAY = 86400000;

describe("parseBbl / bblWhereClause", () => {
  it("parses the campus BBL into Queens block 2159 lot 2", () => {
    expect(parseBbl("4021590002")).toEqual({ borough: 4, block: 2159, lot: 2 });
  });

  it("rejects garbage so we never query with a bad lot", () => {
    expect(parseBbl("")).toBeNull();
    expect(parseBbl("12345")).toBeNull();
    expect(parseBbl("9021590002")).toBeNull(); // borough 9 doesn't exist
  });

  it("builds a where-clause tolerant of padding and borough naming", () => {
    const w = bblWhereClause("4021590002")!;
    expect(w).toContain("'QUEENS'");
    expect(w).toContain("'02159'");
    expect(w).toContain("'2159'");
    expect(w).toContain("'0002'");
    expect(w).toContain("'2'");
    expect(bblWhereClause("nope")).toBeNull();
  });

  it("numberVariants dedupes when padding changes nothing", () => {
    expect(numberVariants(12345, [5])).toEqual(["12345"]);
    expect(new Set(numberVariants(2, [4]))).toEqual(new Set(["0002", "2"]));
  });
});

describe("attribution on the shared lot", () => {
  const campus = SAMPLE_BUILDINGS as Building[];

  it("derives each building's normalized house number", () => {
    expect(campus.map(buildingHouse)).toEqual(["6227", "10853", "11001"]);
  });

  it("matches OATH house spellings with and without the hyphen", () => {
    for (const spelling of ["62-27", "6227", "62 27"]) {
      const hit = attributeSummons(
        { violation_location_house: spelling },
        campus,
      );
      expect(hit?.id).toBe("bldg-1");
    }
    expect(
      attributeSummons({ violation_location_house: "110-01" }, campus)?.id,
    ).toBe("bldg-3");
  });

  it("keeps unknown locations as campus-wide (null), never mis-assigns", () => {
    expect(attributeSummons({ violation_location_house: "999-99" }, campus)).toBeNull();
    expect(attributeSummons({}, campus)).toBeNull();
    expect(normalizeHouse(undefined)).toBe("");
  });
});

describe("status heuristics (calibrated 2026-09-24 against the real docket)", () => {
  it("open when money is still owed, whatever the status says", () => {
    expect(
      isOpenSummons({ balance_due: "350.00", hearing_status: "PAID IN FULL" }),
    ).toBe(true);
  });

  it("a published $0 balance closes it — 'HEARING COMPLETED · $0.00' is resolved", () => {
    expect(
      isOpenSummons({ balance_due: "0.00", hearing_status: "HEARING COMPLETED" }),
    ).toBe(false);
    expect(isOpenSummons({ balance_due: "0", hearing_result: "DISMISSED" })).toBe(false);
  });

  it("closed on closed-sounding statuses when no balance is on record", () => {
    expect(isOpenSummons({ compliance_status: "WRITTEN OFF" })).toBe(false);
    expect(isOpenSummons({ hearing_status: "PAID IN FULL" })).toBe(false);
  });

  it("no balance + hearing over a year ago = resolved history, not open", () => {
    const now = Date.parse("2026-09-24T12:00:00Z");
    expect(
      isOpenSummons(
        { hearing_status: "NEW ISSUANCE", hearing_date: "2000-12-20T00:00:00.000" },
        now,
      ),
    ).toBe(false);
    expect(
      isOpenSummons(
        { hearing_status: "HEARING COMPLETED", hearing_date: "2015-03-23T00:00:00.000" },
        now,
      ),
    ).toBe(false);
    // …but a recent or upcoming hearing with no balance stays open.
    expect(
      isOpenSummons(
        { hearing_status: "DOCKETED", hearing_date: "2026-08-01T00:00:00.000" },
        now,
      ),
    ).toBe(true);
  });

  it("an unrecognized status with no clock and no money counts as OPEN", () => {
    expect(isOpenSummons({ hearing_status: "SOME NEW STATUS" })).toBe(true);
    expect(isOpenSummons({})).toBe(true);
  });

  it("DEFAULTED is open until vacated, even with a stale hearing or $0 balance", () => {
    const now = Date.parse("2026-09-24T12:00:00Z");
    expect(
      isOpenSummons(
        { hearing_status: "DEFAULTED", hearing_date: "2022-02-24T00:00:00.000", balance_due: "0" },
        now,
      ),
    ).toBe(true);
    expect(isDefaulted({ hearing_status: "DEFAULTED" })).toBe(true);
    expect(isDefaulted({ hearing_result: "DEFAULT" })).toBe(true);
    expect(isDefaulted({ hearing_status: "HEARD" })).toBe(false);
  });
});

describe("money + hearing clock", () => {
  it("parses currency strings and rejects junk", () => {
    expect(parseMoney("$1,250.00")).toBe(1250);
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney("n/a")).toBeNull();
  });

  it("counts down to the hearing and reports past hearings", () => {
    const now = Date.parse("2026-09-24T12:00:00Z");
    const s = (d: string): OathSummons => ({ hearing_date: d });
    expect(hearingClock(s("2026-10-04T12:00:00Z"), now)).toEqual({
      label: "Hearing in 10d",
      days: 10,
    });
    expect(hearingClock(s("2026-09-24T12:00:00Z"), now).days).toBe(0);
    expect(hearingClock(s("2026-09-14T12:00:00Z"), now)).toEqual({
      label: "Heard 10d ago",
      days: -10,
    });
    expect(hearingClock({}, now)).toEqual({ label: "—", days: null });
  });

  it("hearing clock never NaNs on a malformed date", () => {
    expect(hearingClock({ hearing_date: "not a date" })).toEqual({
      label: "—",
      days: null,
    });
  });
});

describe("agency normalization", () => {
  it("maps the free-text agency names to the badges the UI shows", () => {
    expect(normalizeAgency("DEPT. OF ENVIRONMENTAL PROTECTION")).toBe("DEP");
    expect(normalizeAgency("DEPT OF BUILDINGS")).toBe("DOB");
    expect(normalizeAgency("FIRE DEPARTMENT")).toBe("FDNY");
    expect(normalizeAgency("DEPARTMENT OF SANITATION")).toBe("DSNY");
    expect(normalizeAgency("DEPT OF HEALTH AND MENTAL HYGIENE")).toBe("DOHMH");
    expect(normalizeAgency(undefined)).toBe("OTHER");
    expect(normalizeAgency("TAXI & LIMOUSINE COMMISSION")).toBe(
      "TAXI & LIMOUSINE COMMISSION",
    );
  });
});

describe("campus data sanity", () => {
  it("all three buildings carry the researched shared BBL and distinct BINs", () => {
    const bbls = new Set(SAMPLE_BUILDINGS.map((b) => b.bbl));
    expect(bbls).toEqual(new Set(["4021590002"]));
    const bins = SAMPLE_BUILDINGS.map((b) => b.bin);
    expect(new Set(bins).size).toBe(3);
    expect(bins.every((b) => /^4\d{6}$/.test(b ?? ""))).toBe(true);
  });
});
