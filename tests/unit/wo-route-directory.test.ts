import { beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
//  BUG-351 — POST /api/work-orders must not change the Tenant Directory on its
//  own, and the explicit "save this number" tick is honoured only for a
//  signed-in admin/super, an occupied unit, and a number not already on file.
// =============================================================================
//  The pure rule (directoryPhoneUpdate) is tested in wo-prefill.test.ts. This
//  file runs the real route handler against an in-memory Supabase fake, so the
//  wiring itself can go red: the role passed to the rule, the unit ownership
//  check, and the absence of the old "latest work order wins" copy.
//  Made-up data only (010 exchange numbers cannot be real lines).
// =============================================================================

type Row = Record<string, unknown>;

const state = vi.hoisted(() => {
  type R = Record<string, unknown>;
  const s = {
    db: {} as Record<string, R[]>,
    log: [] as Array<{ op: string; table: string; payload: unknown }>,
    user: null as null | { id: string },
    profile: null as null | { id: string; email: string; full_name: string | null; role: string },
    makeClient(asUser: boolean) {
      const query = (table: string) => {
        const filters: Array<[string, string, unknown]> = [];
        let op: "select" | "insert" | "update" = "select";
        let payload: unknown = null;
        const match = (r: R) =>
          filters.every(([k, f, v]) =>
            f === "eq"
              ? String(r[k]) === String(v)
              : f === "neq"
                ? String(r[k]) !== String(v)
                : f === "ilike"
                  ? String(r[k]).toLowerCase() === String(v).toLowerCase()
                  : f === "in"
                    ? (v as unknown[]).includes(r[k])
                    : true,
          );
        const exec = () => {
          const rows = (s.db[table] ??= []);
          if (op === "insert") {
            const arr = (Array.isArray(payload) ? payload : [payload]) as R[];
            rows.push(...arr);
            s.log.push({ op, table, payload });
            return { data: arr.length === 1 ? arr[0] : arr, error: null };
          }
          if (op === "update") {
            const hit = rows.filter(match);
            hit.forEach((r) => Object.assign(r, payload));
            s.log.push({ op, table, payload });
            return { data: hit, error: null };
          }
          return { data: rows.filter(match), error: null };
        };
        const one = () => {
          const r = exec();
          return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
        };
        const b: Record<string, unknown> = {};
        Object.assign(b, {
          select: () => b,
          eq: (k: string, v: unknown) => (filters.push([k, "eq", v]), b),
          neq: (k: string, v: unknown) => (filters.push([k, "neq", v]), b),
          ilike: (k: string, v: unknown) => (filters.push([k, "ilike", v]), b),
          in: (k: string, v: unknown) => (filters.push([k, "in", v]), b),
          order: () => b,
          limit: () => b,
          insert: (p: unknown) => ((op = "insert"), (payload = p), b),
          update: (p: unknown) => ((op = "update"), (payload = p), b),
          maybeSingle: async () => one(),
          single: async () => one(),
          then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            Promise.resolve(exec()).then(res, rej),
        });
        return b;
      };
      return {
        auth: { getUser: async () => ({ data: { user: asUser ? s.user : null } }) },
        from: query,
      };
    },
  };
  return s;
});

vi.mock("@/lib/supabase", () => ({ getServerSupabase: () => state.makeClient(false) }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: () => state.makeClient(true),
  getCurrentUserProfile: async () => state.profile,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("resend", () => ({ Resend: class { emails = { send: async () => ({}) }; } }));
vi.mock("@/lib/push", () => ({ pushToAdminsAndSupers: async () => {} }));
vi.mock("@/lib/translate", () => ({
  translateToEnglish: async (t: string, d: string) => ({ title_en: t, description_en: d, source_language: "en" }),
}));
vi.mock("@/lib/ratelimit-durable", () => ({ getClientIp: () => "203.0.113.9", isRateLimitedDurable: async () => false }));
vi.mock("@/lib/fhi-sync", () => ({ pushWorkOrderToFHI: async () => {} }));
vi.mock("@/lib/intake-token", () => ({ intakeTokensEnabled: () => false, verifyIntakeToken: () => true }));

import { POST } from "@/app/api/work-orders/route";

const OLD = "917-010-0001";
const NEW = "917-010-0002";
function seed() {
  state.db = {
    buildings: [
      { id: "bldg-t1", name: "Test Building One", address: "1 Test St" },
      { id: "bldg-t2", name: "Test Building Two", address: "2 Test St" },
    ],
    units: [
      { id: "u-t1-5f", building_id: "bldg-t1", label: "5F", occupied: true, tenant_phone: OLD, tenant_phone2: null, emergency_contact_phone: "917-010-0099", notes: null },
      { id: "u-t1-5e", building_id: "bldg-t1", label: "5E", occupied: false, tenant_phone: null, tenant_phone2: null, emergency_contact_phone: null, notes: null },
      { id: "u-t2-5f", building_id: "bldg-t2", label: "5F", occupied: true, tenant_phone: "917-010-0050", tenant_phone2: null, emergency_contact_phone: null, notes: null },
    ] as Row[],
    work_orders: [],
    work_order_updates: [],
  };
  state.log = [];
}
const signedIn = (role: string) => {
  state.user = { id: "user-test" };
  state.profile = { id: "user-test", email: "test-staff@example.local", full_name: "Test Staff", role };
};
const anonymous = () => {
  state.user = null;
  state.profile = null;
};
const base = { building_id: "bldg-t1", unit_label: "5F", reporter_name: "Test Reporter", reporter_phone: NEW, title: "Test leak", description: "Test" };
async function post(body: Record<string, unknown>) {
  const res = await POST(new Request("http://localhost/api/work-orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}
const unitWrites = () => state.log.filter((l) => l.op === "update" && l.table === "units");
const unit = (id: string) => state.db.units.find((u) => u.id === id)!;
const createdWo = () => state.db.work_orders[state.db.work_orders.length - 1];

describe("POST /api/work-orders and the Tenant Directory (BUG-351)", () => {
  beforeEach(() => {
    seed();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("without the tick, a work order never changes the directory (the old auto-copy is gone)", async () => {
    signedIn("super");
    const r = await post(base);
    expect(r.status).toBe(201);
    expect(unitWrites()).toHaveLength(0);
    expect(unit("u-t1-5f").tenant_phone).toBe(OLD);
    expect(r.json.directory).toBeUndefined();
  });

  it("anonymous intake can never change the directory, even when it sends the tick", async () => {
    anonymous();
    const r = await post({ ...base, update_directory: "1" });
    expect(r.status).toBe(201);
    expect(unitWrites()).toHaveLength(0);
    expect((r.json.directory as { reason: string }).reason).toBe("not-allowed");
  });

  it("a manager's tick is refused: only admin/super may edit tenant contacts", async () => {
    signedIn("manager");
    const r = await post({ ...base, update_directory: "1" });
    expect(unitWrites()).toHaveLength(0);
    expect(r.json.directory).toEqual({ requested: true, updated: false, reason: "not-allowed" });
  });

  it("a super's tick on a vacant apartment is refused", async () => {
    signedIn("super");
    const r = await post({ ...base, unit_label: "5E", update_directory: "1" });
    expect(unitWrites()).toHaveLength(0);
    expect((r.json.directory as { reason: string }).reason).toBe("vacant-unit");
  });

  it("a super's tick saves the new number and keeps the old one as the second number", async () => {
    signedIn("super");
    const r = await post({ ...base, update_directory: "1" });
    expect(r.json.directory).toEqual({ requested: true, updated: true, reason: "update" });
    expect(unitWrites()).toHaveLength(1);
    expect(unit("u-t1-5f").tenant_phone).toBe(NEW);
    expect(unit("u-t1-5f").tenant_phone2).toBe(OLD);
  });

  it("refuses a number that is on file for another apartment, or is this apartment's emergency contact", async () => {
    signedIn("super");
    const other = await post({ ...base, reporter_phone: "917-010-0050", update_directory: "1" });
    expect((other.json.directory as { reason: string }).reason).toBe("on-file-for-another-unit");
    const ec = await post({ ...base, reporter_phone: "917-010-0099", update_directory: "1" });
    expect((ec.json.directory as { reason: string }).reason).toBe("emergency-contact-number");
    expect(unitWrites()).toHaveLength(0);
  });

  it("never attaches a work order to a unit_id from another building", async () => {
    signedIn("super");
    await post({ ...base, unit_label: undefined, unit_id: "u-t2-5f" });
    expect(createdWo().unit_id).toBeNull();
    await post({ ...base, unit_id: "u-t2-5f" });
    expect(createdWo().unit_id).toBe("u-t1-5f");
  });

  it("ignores a unit_id sent by an anonymous caller", async () => {
    anonymous();
    await post({ ...base, unit_label: undefined, unit_id: "u-t1-5f" });
    expect(createdWo().unit_id).toBeNull();
  });
});
