import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cureDeadline,
  describeHpdFailure,
  lookupHpdViolationsForBuilding,
  lookupHpdViolationsForBuildings,
  parseAddressForHpd,
  violationClass,
  violationsOrEmpty,
  type HpdViolation,
} from "../../src/lib/hpd";

describe("parseAddressForHpd", () => {
  it("normalizes Queens hyphenated house numbers and ordinal street names", () => {
    expect(parseAddressForHpd("62-27 108th Street, Queens, NY 11375")).toEqual({
      house: "62-27",
      street: "108 STREET",
    });
    expect(parseAddressForHpd("108-53 62nd Drive, Queens, NY 11375")).toEqual({
      house: "108-53",
      street: "62 DRIVE",
    });
  });

  it("expands common street-type abbreviations to HPD's uppercase form", () => {
    expect(parseAddressForHpd("123 Main St, Brooklyn, NY")).toEqual({
      house: "123",
      street: "MAIN STREET",
    });
    expect(parseAddressForHpd("45 Ocean Pkwy., Brooklyn, NY")).toEqual({
      house: "45",
      street: "OCEAN PARKWAY",
    });
  });

  it("returns null for addresses it cannot split into house + street", () => {
    expect(parseAddressForHpd("")).toBeNull();
    expect(parseAddressForHpd("Broadway, Manhattan")).toBeNull();
  });
});

describe("violationClass", () => {
  it("reads violationclass first, then the raw dataset `class` field", () => {
    expect(violationClass({ violationid: "1", violationclass: "B" })).toBe("B");
    expect(violationClass({ violationid: "2", class: "C" })).toBe("C");
    expect(
      violationClass({ violationid: "3", class: "A", violationclass: "B" }),
    ).toBe("B");
    expect(violationClass({ violationid: "4" })).toBeUndefined();
  });
});

// =============================================================================
//  The false-assurance regression suite
// =============================================================================
//  The original defect: a failed lookup and a genuinely clean building both
//  returned []. A super reading "0 open violations" would stop looking at a
//  building nobody had actually checked. These tests exist to make that
//  ambiguity impossible to reintroduce.
// =============================================================================

describe("HPD lookup — 'could not check' is never 'clean'", () => {
  const building = (address: string) =>
    ({ id: "b1", name: "Test", address }) as never;

  afterEach(() => vi.unstubAllGlobals());

  it("reports unparsable_address instead of an empty (clean-looking) list", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const r = await lookupHpdViolationsForBuilding(building("Broadway"));

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.kind).toBe("unparsable_address");
    // It must not have silently "checked" anything.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports http_error when NYC Open Data rejects the lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => "service unavailable",
      }),
    );

    const r = await lookupHpdViolationsForBuilding(building("123 Main St, Brooklyn, NY"));

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failure.kind).toBe("http_error");
      expect(r.failure.detail).toContain("503");
    }
  });

  it("converts a thrown network/timeout error into a failure result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timed out")));

    const r = await lookupHpdViolationsForBuilding(building("123 Main St, Brooklyn, NY"));

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failure.kind).toBe("network_error");
      expect(r.failure.detail).toBe("timed out");
    }
  });

  it("a genuinely clean building is ok:true with an empty list — distinguishable from failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }),
    );

    const r = await lookupHpdViolationsForBuilding(building("123 Main St, Brooklyn, NY"));

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.violations).toEqual([]);
    // The whole point: same emptiness, different meaning.
    expect(violationsOrEmpty(r)).toEqual([]);
  });

  it("normalizes the raw `class` field onto violationclass", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { violationid: "1", class: "C", currentstatus: "NOV SENT OUT" },
        ],
      }),
    );

    const r = await lookupHpdViolationsForBuilding(building("123 Main St, Brooklyn, NY"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.violations[0].violationclass).toBe("C");
  });

  it("filters closed violations when openOnly (the default)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { violationid: "1", class: "B", currentstatus: "NOV SENT OUT" },
          { violationid: "2", class: "B", currentstatus: "VIOLATION CLOSED" },
        ],
      }),
    );

    const r = await lookupHpdViolationsForBuilding(building("123 Main St, Brooklyn, NY"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.violations.map((v) => v.violationid)).toEqual(["1"]);
  });

  it("isolates failures per building — one bad address does not blank the batch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { violationid: "9", class: "A", currentstatus: "NOV SENT OUT" },
        ],
      }),
    );

    const results = await lookupHpdViolationsForBuildings([
      { id: "good", name: "Good", address: "123 Main St, Brooklyn, NY" } as never,
      { id: "bad", name: "Bad", address: "Broadway" } as never,
    ]);

    expect(results.good.ok).toBe(true);
    expect(results.bad.ok).toBe(false);
    // The healthy building still reports real data.
    expect(violationsOrEmpty(results.good)).toHaveLength(1);
  });

  it("every failure kind has a human-readable explanation", () => {
    for (const kind of ["unparsable_address", "http_error", "network_error"] as const) {
      const msg = describeHpdFailure({ kind, detail: "x" });
      expect(msg.length).toBeGreaterThan(10);
      // Must never imply a clean result.
      expect(msg.toLowerCase()).not.toContain("no violations");
    }
  });
});

describe("cureDeadline (§27-2115)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const v = (violationclass: HpdViolation["violationclass"], novissueddate?: string): HpdViolation => ({
    violationid: "x",
    violationclass,
    novissueddate,
  });

  it("Class A gets 90 days to cure", () => {
    vi.setSystemTime(new Date("2026-01-20T00:00:00Z"));
    expect(cureDeadline(v("A", "2026-01-10T00:00:00.000Z"))).toEqual({
      label: "80d left",
      days: 80,
    });
  });

  it("Class C gets 24 hours — two days after issuance it is already overdue", () => {
    vi.setSystemTime(new Date("2026-03-03T00:00:00Z"));
    expect(cureDeadline(v("C", "2026-03-01T00:00:00.000Z"))).toEqual({
      label: "1d overdue",
      days: -1,
    });
  });

  it("Class B gets 30 days and reads 'Due today' on the deadline", () => {
    vi.setSystemTime(new Date("2026-03-03T00:00:00Z"));
    expect(cureDeadline(v("B", "2026-02-01T00:00:00.000Z"))).toEqual({
      label: "Due today",
      days: 0,
    });
  });

  it("reads the raw dataset `class` field, not just violationclass", () => {
    // NYC Open Data publishes the field as `class`. A row that reaches
    // cureDeadline() un-normalized (e.g. straight from a cached payload) must
    // still get its clock — reading v.violationclass directly returns "—" and
    // silently drops the deadline on a hazardous violation.
    vi.setSystemTime(new Date("2026-03-03T00:00:00Z"));
    expect(
      cureDeadline({ violationid: "raw", class: "B", novissueddate: "2026-02-01T00:00:00.000Z" }),
    ).toEqual({ label: "Due today", days: 0 });
  });

  it("Class I (paperwork) and missing issue dates have no cure clock", () => {
    vi.setSystemTime(new Date("2026-03-03T00:00:00Z"));
    expect(cureDeadline(v("I", "2026-02-01T00:00:00.000Z"))).toEqual({
      label: "—",
      days: null,
    });
    expect(cureDeadline(v("A"))).toEqual({ label: "Unknown", days: null });
  });
});
