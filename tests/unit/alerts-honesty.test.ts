import { beforeEach, describe, it, expect, vi } from "vitest";

// =============================================================================
//  Alerts + owner-report honesty guards (2026-09-22)
// =============================================================================
//  Three live recurrences of the BUG-001 / BUG-002 false-assurance shape, all
//  of which rendered a FAILED READ as a reassuring zero:
//
//    1. src/lib/alerts-layer.ts — a failed alerts read returned `{banner: [],
//       overlay: []}`, double-swallowed in layout.tsx. A Tier-1 emergency was
//       live and the super saw a calm app. Every page load.
//    2. src/lib/alerts.ts — recipient queries bound `data` without `error`, so
//       `data ?? []` turned a failed lookup into "✓ Alert sent to 0 recipients"
//       for a no-heat broadcast nobody received.
//    3. src/lib/owner-report.ts — `data ?? []` made a failed violations query
//       read as "No new HPD violations posted in the last 30 days" in a report
//       emailed to the managing agent.
//
//  Every test here EXECUTES the real function against a client that errors and
//  asserts the observable outcome. Each is paired with a positive control so a
//  function that failed unconditionally could not pass, and with a
//  legitimate-zero control so a genuine "nothing active" stays distinguishable
//  from a failure. That distinction IS the invariant.
// =============================================================================

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

/**
 * Chainable PostgREST stand-in. Every builder method returns itself; awaiting
 * it (or a terminal like .maybeSingle()) yields the result registered for that
 * table. The real function bodies run untouched.
 */
function stubByTable(byTable: Record<string, QueryResult>) {
  const builderFor = (table: string) => {
    const result = byTable[table] ?? { data: [], error: null };
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
    return builder;
  };
  return { from: (table: string) => builderFor(table) };
}

const DB_DOWN = { message: "permission denied for relation" };

// ---------------------------------------------------------------------------
//  1. alerts-layer — a failed read must never look like all-clear
// ---------------------------------------------------------------------------
const layerClient: { value: unknown } = { value: null };
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: () => layerClient.value,
}));
vi.mock("@/lib/supabase", () => ({
  getServerSupabase: () => alertsClient.value,
  isSupabaseConfigured: () => true,
}));

const LIVE_EMERGENCY = {
  id: "a1",
  tier: "emergency",
  title: "No heat — Building 2",
  message: "Boiler down.",
  created_at: "2026-09-22T00:00:00Z",
};

describe("alerts-layer: a failed read is not 'no alerts'", () => {
  beforeEach(() => {
    vi.resetModules();
    layerClient.value = null;
  });

  it("returns ok:false when the active-alerts read errors — NOT an empty layer", async () => {
    layerClient.value = stubByTable({ alerts: { data: null, error: DB_DOWN } });
    const { getAlertsLayerData } = await import("@/lib/alerts-layer");

    const r = await getAlertsLayerData("u1", "org1");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.kind).toBe("alerts_read_failed");
    // The precise regression: the failure must not carry an empty banner /
    // overlay that the layout would render as silence.
    expect((r as any).banner).toBeUndefined();
    expect((r as any).overlay).toBeUndefined();
  });

  it("positive control — a live emergency still reaches the banner AND the overlay", async () => {
    layerClient.value = stubByTable({
      alerts: { data: [LIVE_EMERGENCY], error: null },
      alert_acknowledgments: { data: [], error: null },
      profiles: { count: 3, error: null },
    });
    const { getAlertsLayerData } = await import("@/lib/alerts-layer");

    const r = await getAlertsLayerData("u1", "org1");

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.banner).toHaveLength(1);
      expect(r.overlay).toHaveLength(1);
      expect(r.banner[0].expectedSuperCount).toBe(3);
      expect(r.banner[0].ackCount).toBe(0);
    }
  });

  it("legitimate-zero control — genuinely no active alerts stays ok:true and empty", async () => {
    // If this went red we would have bought honesty by crying wolf on a quiet
    // day, which trains the super to ignore the strip.
    layerClient.value = stubByTable({ alerts: { data: [], error: null } });
    const { getAlertsLayerData } = await import("@/lib/alerts-layer");

    const r = await getAlertsLayerData("u1", "org1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.banner).toEqual([]);
  });

  it("a failed acknowledgement read reports UNKNOWN counts, never '0 of 0'", async () => {
    layerClient.value = stubByTable({
      alerts: { data: [LIVE_EMERGENCY], error: null },
      alert_acknowledgments: { data: null, error: DB_DOWN },
      profiles: { count: null, error: DB_DOWN },
    });
    const { getAlertsLayerData } = await import("@/lib/alerts-layer");

    const r = await getAlertsLayerData("u1", "org1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.banner[0].ackCount).toBeNull();
      expect(r.banner[0].expectedSuperCount).toBeNull();
      // Still shown, still not acknowledged — loud beats silent.
      expect(r.overlay).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
//  2. alerts dispatch — a failed recipient query is not a send to nobody
// ---------------------------------------------------------------------------
const alertsClient: { value: unknown } = { value: null };
vi.mock("@/lib/push", () => ({
  pushToUsers: vi.fn(async () => ({ sent: 0, failed: 0 })),
}));
vi.mock("@/lib/sms", () => ({
  sendBulkSms: vi.fn(async () => []),
  isSmsConfigured: () => false,
}));

const EMERGENCY_ROW = {
  id: "a1",
  org_id: "org1",
  tier: "emergency",
  title: "No heat",
  message: "Boiler down.",
  building_ids: ["b1"],
  unit_ids: null,
  status: "active",
  created_at: "2026-09-22T00:00:00Z",
  escalated_at: null,
  owner_notified_at: null,
};

const OK_TABLES = {
  alerts: { data: EMERGENCY_ROW, error: null },
  buildings: { data: [{ id: "b1", name: "Building 2" }], error: null },
  profiles: { data: [{ id: "s1", email: "s@example.local", full_name: null, role: "super", phone_number: null, push_consent: true, sms_consent: false }], error: null, count: 1 },
  units: { data: [], error: null },
};

describe("alerts dispatch: a failed recipient query cannot report a send", () => {
  beforeEach(() => {
    vi.resetModules();
    alertsClient.value = null;
  });

  it("rejects when the STAFF query errors instead of reporting staffCount 0", async () => {
    alertsClient.value = stubByTable({
      ...OK_TABLES,
      profiles: { data: null, error: DB_DOWN },
    });
    const { dispatchAlert } = await import("@/lib/alerts");

    await expect(dispatchAlert("a1")).rejects.toThrow(/resolveStaff/);
  });

  it("rejects when the RESIDENT query errors instead of reporting residentCount 0", async () => {
    alertsClient.value = stubByTable({
      ...OK_TABLES,
      units: { data: null, error: DB_DOWN },
    });
    const { dispatchAlert } = await import("@/lib/alerts");

    await expect(dispatchAlert("a1")).rejects.toThrow(/resolveResidents/);
  });

  it("rejects when the alert row itself cannot be read", async () => {
    alertsClient.value = stubByTable({
      ...OK_TABLES,
      alerts: { data: null, error: DB_DOWN },
    });
    const { dispatchAlert } = await import("@/lib/alerts");

    await expect(dispatchAlert("a1")).rejects.toThrow(/alert row/);
  });

  it("countExpectedSupers rejects rather than answering 0 — 'nobody must ack'", async () => {
    const { countExpectedSupers } = await import("@/lib/alerts");
    const client = stubByTable({ profiles: { count: null, error: DB_DOWN } });

    await expect(
      countExpectedSupers(client as any, "org1"),
    ).rejects.toThrow(/countExpectedSupers/);
  });

  it("positive control — a healthy dispatch still returns a real summary", async () => {
    alertsClient.value = stubByTable(OK_TABLES);
    const { dispatchAlert } = await import("@/lib/alerts");

    const summary = await dispatchAlert("a1");
    expect(summary.staffCount).toBe(1);
    expect(summary.tier).toBe("emergency");
  });

  it("legitimate-zero control — a real org with no matching staff still reports 0", async () => {
    // A genuine empty recipient set is a valid answer and must stay reachable,
    // otherwise the guard above would just be "dispatch always throws".
    alertsClient.value = stubByTable({ ...OK_TABLES, profiles: { data: [], error: null } });
    const { dispatchAlert } = await import("@/lib/alerts");

    const summary = await dispatchAlert("a1");
    expect(summary.staffCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
//  3. owner-report — "0 violations" must mean zero, not unread
// ---------------------------------------------------------------------------
const REPORT_TABLES = {
  buildings: { data: [{ id: "b1", name: "Building 2", address: "1 Test St", year_built: 1950, num_units: null, manager_name: "M", manager_email: "m@example.local", has_known_lead: false }], error: null },
  work_orders: { data: [], error: null },
  violations: { data: [], error: null },
  certifications: { data: [], error: null },
  compliance_items: { data: [], error: null },
};

describe("owner-report: a failed query is never reported as zero", () => {
  it("rejects when the VIOLATIONS query errors instead of asserting '0 violations'", async () => {
    const { gatherOwnerReportData } = await import("@/lib/owner-report");
    const client = stubByTable({
      ...REPORT_TABLES,
      violations: { data: null, error: DB_DOWN },
    });

    await expect(
      gatherOwnerReportData(client as any, 30),
    ).rejects.toThrow(/HPD violations/);
  });

  it("rejects when any other section errors — the whole report is untrustworthy", async () => {
    const { gatherOwnerReportData } = await import("@/lib/owner-report");
    for (const [table, label] of [
      ["buildings", /buildings/],
      ["work_orders", /work orders/],
      ["certifications", /certifications/],
      ["compliance_items", /compliance items/],
    ] as Array<[string, RegExp]>) {
      const client = stubByTable({
        ...REPORT_TABLES,
        [table]: { data: null, error: DB_DOWN },
      });
      await expect(
        gatherOwnerReportData(client as any, 30),
      ).rejects.toThrow(label);
    }
  });

  it("positive control — a healthy gather still returns the rows", async () => {
    const { gatherOwnerReportData } = await import("@/lib/owner-report");
    const data = await gatherOwnerReportData(
      stubByTable({
        ...REPORT_TABLES,
        violations: {
          data: [{ id: "v1", building_id: "b1", class: "C", description: null, apartment: null, nov_issued_date: null, first_seen_at: "2026-09-01" }],
          error: null,
        },
      }) as any,
      30,
    );
    expect(data.violations).toHaveLength(1);
    expect(data.buildings).toHaveLength(1);
  });

  it("legitimate-zero control — a genuinely clean month still says so", async () => {
    const { gatherOwnerReportData, renderOwnerReportHtml } = await import(
      "@/lib/owner-report"
    );
    const data = await gatherOwnerReportData(stubByTable(REPORT_TABLES) as any, 30);
    const html = renderOwnerReportHtml({
      managerName: null,
      periodLabel: data.periodLabel,
      buildings: data.buildings,
      wos: data.wos,
      violations: data.violations,
      compliance: data.compliance,
      certs: data.certs,
    });
    expect(html).toContain("No new HPD violations posted in the last 30 days");
  });
});
