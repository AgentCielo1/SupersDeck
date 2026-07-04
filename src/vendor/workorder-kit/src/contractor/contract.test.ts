import { afterEach, describe, expect, it, vi } from "vitest";
import {
  coiStatus,
  daysUntil,
  type ComplianceDocument,
} from "./contract";

// =============================================================================
//  COI compliance-gate unit tests
// =============================================================================
//  All coiStatus cases pass an explicit `now` so they're deterministic and
//  timezone-independent. daysUntil cases build `now` with the LOCAL Date
//  constructor, so "11:30pm on the expiry date" means 11:30pm wherever the
//  test runs — including America/New_York, the bug that motivated the fix.
// =============================================================================

const NOW = new Date(2026, 6, 4, 12, 0); // 2026-07-04 noon local

function gl(expiryDate: string): ComplianceDocument {
  return { docType: "gl_coi", expiryDate };
}

describe("coiStatus", () => {
  it("returns missing when no docs at all", () => {
    expect(coiStatus([], { now: NOW })).toBe("missing");
  });

  it("returns missing when the required type is absent", () => {
    const docs: ComplianceDocument[] = [{ docType: "w9" }];
    expect(coiStatus(docs, { now: NOW })).toBe("missing");
  });

  it("returns missing when the required doc has no expiry", () => {
    const docs: ComplianceDocument[] = [{ docType: "gl_coi" }];
    expect(coiStatus(docs, { now: NOW })).toBe("missing");
  });

  it("returns compliant for a single far-future COI", () => {
    expect(coiStatus([gl("2027-07-01")], { now: NOW })).toBe("compliant");
  });

  it("returns expiring inside the warn window", () => {
    expect(coiStatus([gl("2026-07-20")], { now: NOW })).toBe("expiring");
  });

  it("returns expired for a lapsed COI", () => {
    expect(coiStatus([gl("2026-06-01")], { now: NOW })).toBe("expired");
  });

  // The renewal scenario: COI uploads are pure inserts, so an old expired row
  // must NOT drag the company back to expired forever.
  it("latest doc wins — a renewal clears an expired COI", () => {
    const docs = [gl("2026-01-15"), gl("2027-01-15")]; // expired + renewal
    expect(coiStatus(docs, { now: NOW })).toBe("compliant");
  });

  it("latest doc wins regardless of array order", () => {
    const docs = [gl("2027-01-15"), gl("2026-01-15")];
    expect(coiStatus(docs, { now: NOW })).toBe("compliant");
  });

  it("latest doc can still be expiring after a short renewal", () => {
    const docs = [gl("2026-01-15"), gl("2026-07-25")]; // renewal inside warn window
    expect(coiStatus(docs, { now: NOW })).toBe("expiring");
  });

  // Multiple required types: each type takes its own latest doc, then the
  // WORST of those decides the company status.
  it("multiple required types — worst latest-doc wins", () => {
    const required = ["gl_coi", "workers_comp"] as const;
    const docs: ComplianceDocument[] = [
      gl("2027-07-01"), // compliant
      { docType: "workers_comp", expiryDate: "2026-07-10" }, // expiring
    ];
    expect(coiStatus(docs, { now: NOW, required: [...required] })).toBe("expiring");
  });

  it("multiple required types — an expired type blocks despite a healthy one", () => {
    const docs: ComplianceDocument[] = [
      gl("2027-07-01"),
      { docType: "workers_comp", expiryDate: "2026-06-01" },
    ];
    expect(
      coiStatus(docs, { now: NOW, required: ["gl_coi", "workers_comp"] })
    ).toBe("expired");
  });

  it("multiple required types — missing one type is missing overall", () => {
    expect(
      coiStatus([gl("2027-07-01")], { now: NOW, required: ["gl_coi", "workers_comp"] })
    ).toBe("missing");
  });
});

describe("daysUntil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a COI is valid through its printed expiry date (evening of)", () => {
    // 11:30pm local on the expiry date — the old UTC-midnight parse read this
    // as already expired in any negative-offset timezone (America/New_York).
    const now = new Date(2026, 6, 4, 23, 30);
    expect(daysUntil("2026-07-04", now)).toBe(0);
  });

  it("expired the next calendar day, even just after midnight", () => {
    const now = new Date(2026, 6, 5, 0, 5);
    expect(daysUntil("2026-07-04", now)).toBe(-1);
  });

  it("counts whole calendar days, ignoring time of day", () => {
    expect(daysUntil("2026-07-10", new Date(2026, 6, 4, 0, 1))).toBe(6);
    expect(daysUntil("2026-07-10", new Date(2026, 6, 4, 23, 59))).toBe(6);
  });

  it("uses the current time when `now` is omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 4, 23, 30));
    expect(daysUntil("2026-07-04")).toBe(0);
    vi.setSystemTime(new Date(2026, 6, 5, 0, 5));
    expect(daysUntil("2026-07-04")).toBe(-1);
  });
});
