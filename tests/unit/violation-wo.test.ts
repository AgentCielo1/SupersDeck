import { describe, expect, it } from "vitest";
import type { Building } from "@/types";
import type { HpdViolation } from "@/lib/hpd";
import {
  categoryFromViolation,
  descriptionFromViolation,
  priorityFromViolation,
  titleFromViolation,
  workOrderUrlFromViolation,
} from "@/lib/violation-wo";

// =============================================================================
//  Violation → work order mapping (src/lib/violation-wo.ts)
// =============================================================================
//  Real HPD NOV phrasings from this portfolio's own rows — the mapping is
//  keyword-based, so the tests pin exactly the wordings it must recognize.
// =============================================================================

function v(over: Partial<HpdViolation>): HpdViolation {
  return { violationid: "19163379", violationclass: "C", ...over };
}

const building: Building = {
  id: "bldg-1",
  name: "Building 1",
  address: "62-27 108th Street, Queens, NY 11375",
} as Building;

describe("categoryFromViolation", () => {
  const cases: Array<[string, string]> = [
    ["PROVIDE AN ADEQUATE SUPPLY OF HOT WATER FOR THE FIXTURES", "no-hot-water"],
    ["PROVIDE HEAT DURING THE HEATING SEASON", "no-heat"],
    ["ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT", "pest"],
    ["ABATE THE INFESTATION CONSISTING OF ROACHES", "pest"],
    ["ABATE THE NUISANCE CONSISTING OF MOLD ON THE CEILING", "mold"],
    ["VIOLATION OF LEAD-BASED PAINT HAZARD, XRF READING", "lead-concern"],
    ["REPAIR THE LEAK AT THE WATER CLOSET IN THE BATHROOM", "leak"],
    ["REPLACE THE BROKEN LIGHTING FIXTURE IN THE PUBLIC HALL", "electrical"],
    ["RESTORE THE ELEVATOR TO GOOD WORKING ORDER", "elevator"],
    ["REPAIR THE BELL-BUZZER INTERCOM SYSTEM", "intercom"],
    ["PROPERLY REPAIR THE REFRIGERATOR IN THE KITCHEN", "appliance"],
    ["PROVIDE A KEY FOR THE LOCK AT THE ENTRANCE DOOR", "lock-key"],
    ["REPAIR THE BROKEN TREAD AT THE STAIR FROM 1st TO 2nd STORY", "common-area"],
    ["FILE ANNUAL BEDBUG REPORT", "pest"],
    ["SOMETHING THE RULES DON'T KNOW", "other"],
  ];
  for (const [text, expected] of cases) {
    it(`maps "${text.slice(0, 40)}…" → ${expected}`, () => {
      expect(categoryFromViolation(v({ novdescription: text }))).toBe(expected);
    });
  }

  it("prefers HOT WATER over the generic water/leak keywords", () => {
    expect(
      categoryFromViolation(
        v({ novdescription: "PROVIDE HOT WATER AT THE SHOWER AND BASIN" }),
      ),
    ).toBe("no-hot-water");
  });

  it("returns 'other' when the NOV text is missing", () => {
    expect(categoryFromViolation(v({ novdescription: undefined }))).toBe("other");
  });
});

describe("priorityFromViolation", () => {
  it("Class C → high, B → normal, A/I/unknown → low", () => {
    expect(priorityFromViolation(v({ violationclass: "C" }))).toBe("high");
    expect(priorityFromViolation(v({ violationclass: "B" }))).toBe("normal");
    expect(priorityFromViolation(v({ violationclass: "A" }))).toBe("low");
    expect(priorityFromViolation(v({ violationclass: "I" }))).toBe("low");
    expect(
      priorityFromViolation(v({ violationclass: undefined })),
    ).toBe("low");
  });

  it("reads the dataset's raw `class` field too (normalized)", () => {
    expect(
      priorityFromViolation(v({ violationclass: undefined, class: "C" })),
    ).toBe("high");
  });
});

describe("titleFromViolation", () => {
  it("is scannable: class, location, lowercased gist", () => {
    const t = titleFromViolation(
      v({
        apartment: "10K",
        novdescription:
          "HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE",
      }),
    );
    expect(t.startsWith("HPD C · Apt 10K · ")).toBe(true);
    expect(t).toContain("abate the infestation");
    // The statute prefix is noise in a work-order list — stripped.
    expect(t).not.toContain("27-2017.4");
  });

  it("strips the no-colon statute form too (§ 27-2005 ADM CODE …)", () => {
    const t = titleFromViolation(
      v({
        apartment: "8B",
        novdescription:
          "§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOCK",
      }),
    );
    expect(t).toContain("properly repair the broken");
    expect(t).not.toContain("27-2005");
    expect(t).not.toContain("adm code");
  });

  it("says 'common area' when there is no apartment", () => {
    expect(
      titleFromViolation(v({ apartment: undefined, novdescription: "X" })),
    ).toContain("common area");
  });

  it("never exceeds 200 chars even for a run-on NOV", () => {
    const t = titleFromViolation(v({ novdescription: "A".repeat(500) }));
    expect(t.length).toBeLessThanOrEqual(200);
  });
});

describe("descriptionFromViolation", () => {
  it("keeps the FULL legal text and appends provenance", () => {
    const d = descriptionFromViolation(
      v({
        violationid: "19163379",
        violationclass: "C",
        novissueddate: "2026-08-26T00:00:00.000",
        novdescription: "ABATE THE INFESTATION CONSISTING OF MICE",
      }),
    );
    expect(d).toContain("ABATE THE INFESTATION CONSISTING OF MICE");
    expect(d).toContain("From HPD violation 19163379");
    expect(d).toContain("Class C");
  });
});

describe("workOrderUrlFromViolation", () => {
  it("round-trips every prefill field through the URL", () => {
    const url = workOrderUrlFromViolation(
      building,
      v({
        violationid: "19163379",
        apartment: "10K",
        violationclass: "C",
        novdescription: "ABATE THE INFESTATION CONSISTING OF MICE",
      }),
    );
    expect(url.startsWith("/work-orders/new?")).toBe(true);
    const q = new URLSearchParams(url.split("?")[1]);
    expect(q.get("building_id")).toBe("bldg-1");
    expect(q.get("source_violation_id")).toBe("19163379");
    expect(q.get("category")).toBe("pest");
    expect(q.get("priority")).toBe("high");
    expect(q.get("unit_label")).toBe("10K");
    expect(q.get("title")).toContain("Apt 10K");
    expect(q.get("description")).toContain("From HPD violation 19163379");
  });

  it("omits unit_label for common-area violations", () => {
    const url = workOrderUrlFromViolation(building, v({ apartment: undefined }));
    const q = new URLSearchParams(url.split("?")[1]);
    expect(q.get("unit_label")).toBeNull();
  });
});
