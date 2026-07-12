import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cureDeadline,
  parseAddressForHpd,
  violationClass,
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

  it("Class I (paperwork) and missing issue dates have no cure clock", () => {
    vi.setSystemTime(new Date("2026-03-03T00:00:00Z"));
    expect(cureDeadline(v("I", "2026-02-01T00:00:00.000Z"))).toEqual({
      label: "—",
      days: null,
    });
    expect(cureDeadline(v("A"))).toEqual({ label: "Unknown", days: null });
  });
});
