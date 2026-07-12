import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  daysUntil,
  formatDueLabel,
  generateComplianceItems,
  type LastCompletedRow,
} from "../../src/lib/compliance";
import type { Building } from "@/types";

function building(overrides: Partial<Building> = {}): Building {
  return {
    id: "b1",
    name: "Test Building",
    address: "62-27 108th Street, Queens, NY 11375",
    borough: "Queens",
    year_built: 1985,
    num_units: 100,
    num_floors: 6,
    has_section8: false,
    is_pact_rad: false,
    has_oil_heat: false,
    has_cooling_tower: false,
    has_sprinkler: false,
    square_footage: 20000,
    has_known_lead: false,
    ...overrides,
  };
}

function itemFor(templateId: string, b: Building, rows: LastCompletedRow[] = []) {
  return generateComplianceItems([b], rows).find((i) => i.template_id === templateId);
}

describe("generateComplianceItems", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fixed-date rules resolve to the next calendar occurrence with a real status", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const item = itemFor("hpd-property-registration", building()); // fixed-date:09-01
    expect(item).toBeDefined();
    expect(item!.next_due).toBe("2026-09-01T00:00:00.000Z");
    expect(item!.status).toBe("ok");
  });

  it("fixed-date within 30 days of the deadline is due-soon", () => {
    vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));
    const item = itemFor("hpd-property-registration", building())!;
    expect(item.next_due).toBe("2026-09-01T00:00:00.000Z");
    expect(item.status).toBe("due-soon");
  });

  it("fixed-date rolls to next year once this year's date is well past", () => {
    vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
    const item = itemFor("hpd-property-registration", building())!;
    expect(item.next_due).toBe("2027-09-01T00:00:00.000Z");
    expect(item.status).toBe("ok");
  });

  it("anniversary rules need a real last_completed, else needs-scheduling with no date", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const bare = itemFor("boiler-annual-inspection", building())!; // anniversary:1y
    expect(bare.status).toBe("needs-scheduling");
    expect(bare.next_due).toBeUndefined();
  });

  it("anniversary rules add N years to last_completed and derive status from the clock", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const row: LastCompletedRow = {
      building_id: "b1",
      template_id: "boiler-annual-inspection",
      last_completed: "2025-06-10T00:00:00.000Z",
    };
    const ok = itemFor("boiler-annual-inspection", building(), [row])!;
    expect(ok.next_due).toBe("2026-06-10T00:00:00.000Z");
    expect(ok.status).toBe("ok");
    expect(ok.last_completed).toBe("2025-06-10T00:00:00.000Z");

    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));
    expect(itemFor("boiler-annual-inspection", building(), [row])!.status).toBe("overdue");
  });

  it("multi-year anniversaries (LL11 FISP, 5y) apply only above 6 floors", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    expect(itemFor("ll11-fisp", building({ num_floors: 6 }))).toBeUndefined();

    const tall = building({ num_floors: 7 });
    const row: LastCompletedRow = {
      building_id: "b1",
      template_id: "ll11-fisp",
      last_completed: "2023-01-15T00:00:00.000Z",
    };
    const item = itemFor("ll11-fisp", tall, [row])!;
    expect(item.next_due).toBe("2028-01-15T00:00:00.000Z");
    expect(item.status).toBe("ok");
  });

  it("heat-season log is in-progress until May 31 during the season, ok until Oct 1 outside it", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z")); // in season (Oct 1 - May 31)
    const inSeason = itemFor("heat-season-log", building())!;
    expect(inSeason.status).toBe("in-progress");
    expect(inSeason.next_due).toBe("2026-05-31T00:00:00.000Z");

    vi.setSystemTime(new Date("2026-07-15T12:00:00Z")); // off season
    const offSeason = itemFor("heat-season-log", building())!;
    expect(offSeason.status).toBe("ok");
    expect(offSeason.next_due).toBe("2026-10-01T00:00:00.000Z");
  });

  it("never generates trigger-based items (no fake overdue HPD cures)", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const items = generateComplianceItems([building()]);
    expect(items.some((i) => i.template_id === "hpd-violation-cure")).toBe(false);
    expect(items.some((i) => i.template_id === "ll64-mold-remediation")).toBe(false);
  });

  it("gates conditional templates on real building attributes", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const plain = building();
    expect(itemFor("cooling-tower-annual-cert", plain)).toBeUndefined();
    expect(itemFor("lead-paint-annual-notice", plain)).toBeUndefined(); // 1985, no known lead
    expect(itemFor("ll84-benchmarking", plain)).toBeUndefined(); // 20k sqft <= 25k

    expect(itemFor("cooling-tower-annual-cert", building({ has_cooling_tower: true }))).toBeDefined();
    expect(itemFor("lead-paint-annual-notice", building({ year_built: 1950 }))).toBeDefined();
    expect(itemFor("lead-paint-annual-notice", building({ has_known_lead: true }))).toBeDefined();
    expect(itemFor("ll84-benchmarking", building({ square_footage: 30000 }))).toBeDefined();
  });
});

describe("daysUntil / formatDueLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const days = (n: number) =>
    new Date(Date.parse("2026-03-15T00:00:00Z") + n * 86_400_000).toISOString();

  it("counts whole days from now", () => {
    expect(daysUntil(days(5))).toBe(5);
    expect(daysUntil(days(-3))).toBe(-3);
    expect(daysUntil(days(0))).toBe(0);
  });

  it("labels each time bucket, with singular/plural handled", () => {
    expect(formatDueLabel(undefined)).toBe("Not scheduled");
    expect(formatDueLabel(days(-3))).toBe("3 days overdue");
    expect(formatDueLabel(days(-1))).toBe("1 day overdue");
    expect(formatDueLabel(days(0))).toBe("Due today");
    expect(formatDueLabel(days(1))).toBe("Due tomorrow");
    expect(formatDueLabel(days(5))).toBe("Due in 5 days");
    expect(formatDueLabel(days(60))).toBe("Due in 2 months");
    expect(formatDueLabel(days(400))).toBe("Due in 1 year");
    expect(formatDueLabel(days(800))).toBe("Due in 2 years");
  });
});
