import { beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
//  Write-boundary validation — proof that the schemas actually REJECT
// =============================================================================
//  These exercise the real route handlers, not the schemas in isolation, so
//  what is under test is the boundary a request actually hits: bad input must
//  come back 400 before anything reaches the database, and privilege-shaped
//  fields a caller sneaks into the body must never appear in the row we write.
//
//  The Supabase client is a recorder, so every assertion about "what reached
//  the DB" is made against the exact payload the route handed it. All identities
//  and phone numbers here are synthetic — no tenant or staff data.
// =============================================================================

const ORG = "00000000-0000-0000-0000-0000000000aa";
const ATTACKER_ORG = "00000000-0000-0000-0000-0000000000ff";
const ME = "00000000-0000-0000-0000-0000000000b1";

const db = vi.hoisted(() => ({
  inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  updates: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  upserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  reset() {
    this.inserts = [];
    this.updates = [];
    this.upserts = [];
  },
}));

// A chainable stand-in for the PostgREST builder: every terminal form the
// routes use (await, .single(), .maybeSingle()) resolves to the same result.
const makeClient = vi.hoisted(() => () => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const k of ["select", "eq", "order", "limit"]) c[k] = () => c;
    c.single = async () => result;
    c.maybeSingle = async () => result;
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej);
    return c;
  };
  return {
    from(table: string) {
      return {
        insert: (payload: Record<string, unknown>) => {
          db.inserts.push({ table, payload });
          return chain({ data: { id: "alert-test-1" }, error: null });
        },
        update: (payload: Record<string, unknown>) => {
          db.updates.push({ table, payload });
          return chain({ data: null, error: null });
        },
        upsert: (payload: Record<string, unknown>) => {
          db.upserts.push({ table, payload });
          return chain({ data: null, error: null });
        },
        select: (_cols?: string, opts?: { count?: string }) =>
          chain(
            opts?.count
              ? { count: 1, error: null }
              : { data: { id: "alert-test-1", org_id: ORG }, error: null },
          ),
      };
    },
  };
});

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUserProfile: async () => ({ id: ME, role: "admin", org_id: ORG }),
  createSupabaseServerClient: () => makeClient(),
}));
vi.mock("@/lib/supabase", () => ({ getServerSupabase: () => makeClient() }));
vi.mock("@/lib/alerts", () => ({
  dispatchAlert: async () => ({ push: 0, email: 0, sms: 0 }),
  previewRecipients: async () => ({
    tier: "routine",
    channels: ["push"],
    staffCount: 0,
    residentCount: 0,
    smsConfigured: false,
  }),
}));

// Stripe: constructEvent is the authenticity control, so the fake keeps it
// meaningful — it throws unless the caller presents the expected signature, and
// it JSON.parses the RAW TEXT it was handed (which would fail outright if the
// route ever pre-parsed the body before verification).
const GOOD_SIG = "t=1,v1=synthetic-good-signature";
vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
  return {
    ...actual,
    getStripe: () => ({
      webhooks: {
        constructEvent: (raw: string, sig: string) => {
          if (sig !== GOOD_SIG) throw new Error("No signatures found matching the expected signature");
          return JSON.parse(raw);
        },
      },
    }),
  };
});

import { POST as createAlert } from "../../src/app/api/alerts/route";
import { POST as previewAlert } from "../../src/app/api/alerts/preview/route";
import { POST as acknowledge } from "../../src/app/api/alerts/[id]/acknowledge/route";
import { POST as consent } from "../../src/app/api/profile/consent/route";
import { POST as webhook } from "../../src/app/api/billing/webhook/route";

function jsonReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validAlert = {
  tier: "urgent",
  title: "Water shut-off 9am",
  message: "Cold water off in the A line while we swap the riser valve.",
  building_ids: ["bldg-1"],
};

beforeEach(() => db.reset());

// ---------------------------------------------------------------------------
describe("POST /api/alerts", () => {
  it("accepts what the composer actually sends", async () => {
    const res = await createAlert(jsonReq({ ...validAlert, unit_ids: ["unit-1", "unit-2"] }));
    expect(res.status).toBe(201);
    expect(db.inserts[0].table).toBe("alerts");
  });

  it("accepts an omitted unit_ids (the composer drops it for whole-building sends)", async () => {
    const res = await createAlert(jsonReq(validAlert));
    expect(res.status).toBe(201);
    expect(db.inserts[0].payload.unit_ids).toBeNull();
  });

  it.each([
    ["missing title", { ...validAlert, title: undefined }],
    ["missing message", { ...validAlert, message: undefined }],
    ["missing tier", { ...validAlert, tier: undefined }],
    ["unknown tier", { ...validAlert, tier: "catastrophic" }],
    ["wrong type for message", { ...validAlert, message: 12345 }],
    ["wrong type for building_ids", { ...validAlert, building_ids: "bldg-1" }],
    ["non-string inside building_ids", { ...validAlert, building_ids: [{ id: "bldg-1" }] }],
    ["blank title after trimming", { ...validAlert, title: "   " }],
  ])("rejects %s with a 400 and writes nothing", async (_label, payload) => {
    const res = await createAlert(jsonReq(payload));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid input." });
    expect(db.inserts).toHaveLength(0);
  });

  it("rejects an over-long message (SMS tier sends it verbatim)", async () => {
    const res = await createAlert(jsonReq({ ...validAlert, message: "x".repeat(1601) }));
    expect(res.status).toBe(400);
    expect(db.inserts).toHaveLength(0);
  });

  it("strips privilege-shaped fields instead of letting them reach the row", async () => {
    const res = await createAlert(
      jsonReq({ ...validAlert, role: "admin", isAdmin: true, org_id: ATTACKER_ORG, created_by: "someone-else", status: "resolved" }),
    );
    expect(res.status).toBe(201);
    const row = db.inserts[0].payload;
    expect(row).not.toHaveProperty("role");
    expect(row).not.toHaveProperty("isAdmin");
    // org_id / created_by / status stay server-stamped, never caller-supplied.
    expect(row.org_id).toBe(ORG);
    expect(row.created_by).toBe(ME);
    expect(row.status).toBe("active");
  });

  it("rejects a malformed body without throwing", async () => {
    const res = await createAlert(jsonReq("{not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON body." });
  });
});

// ---------------------------------------------------------------------------
describe("POST /api/alerts/preview", () => {
  it("accepts the composer's debounced preview payload", async () => {
    const res = await previewAlert(jsonReq({ tier: "emergency", building_ids: ["bldg-1"] }));
    expect(res.status).toBe(200);
  });

  it.each([
    ["missing tier", { building_ids: ["bldg-1"] }],
    ["unknown tier", { tier: "whatever", building_ids: ["bldg-1"] }],
    ["wrong type for unit_ids", { tier: "routine", unit_ids: 7 }],
  ])("rejects %s with a 400", async (_label, payload) => {
    const res = await previewAlert(jsonReq(payload));
    expect(res.status).toBe(400);
  });

  it("shares one schema with the send route, so preview cannot describe a different audience", async () => {
    const payload = { tier: "urgent", building_ids: ["bldg-1"], unit_ids: [{ evil: true }] };
    expect((await previewAlert(jsonReq(payload))).status).toBe(400);
    expect((await createAlert(jsonReq({ ...validAlert, ...payload }))).status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
describe("POST /api/alerts/[id]/acknowledge", () => {
  const ctx = { params: { id: "11111111-1111-1111-1111-111111111111" } };

  it("accepts the button's payload, with and without a note", async () => {
    expect((await acknowledge(jsonReq({ note: "On my way" }), ctx)).status).toBe(200);
    expect((await acknowledge(jsonReq({}), ctx)).status).toBe(200);
    expect(db.upserts[1].payload.note).toBeNull();
  });

  it.each([
    ["wrong type for note", { note: 42 }],
    ["an object where a note belongs", { note: { text: "hi" } }],
  ])("rejects %s with a 400 and writes nothing", async (_label, payload) => {
    const res = await acknowledge(jsonReq(payload), ctx);
    expect(res.status).toBe(400);
    expect(db.upserts).toHaveLength(0);
  });

  it("rejects an over-long note", async () => {
    const res = await acknowledge(jsonReq({ note: "x".repeat(2001) }), ctx);
    expect(res.status).toBe(400);
    expect(db.upserts).toHaveLength(0);
  });

  it("strips privilege-shaped fields — the acknowledger is always the caller", async () => {
    const res = await acknowledge(
      jsonReq({ note: "ok", acknowledged_by: "00000000-0000-0000-0000-0000000000cc", role: "admin", org_id: ATTACKER_ORG }),
      ctx,
    );
    expect(res.status).toBe(200);
    const row = db.upserts[0].payload;
    expect(row.acknowledged_by).toBe(ME);
    expect(row).not.toHaveProperty("role");
    expect(row).not.toHaveProperty("org_id");
  });
});

// ---------------------------------------------------------------------------
describe("POST /api/profile/consent", () => {
  it("accepts the consent modal's payload", async () => {
    const res = await consent(jsonReq({ push_consent: true, sms_consent: true, phone_number: "+15550100" }));
    expect(res.status).toBe(200);
    expect(db.updates[0].payload).toMatchObject({ push_consent: true, sms_consent: true, phone_number: "+15550100" });
  });

  it("leaves the stored number alone when the modal omits it", async () => {
    const res = await consent(jsonReq({ push_consent: true, sms_consent: false }));
    expect(res.status).toBe(200);
    expect(db.updates[0].payload).not.toHaveProperty("phone_number");
  });

  it.each([
    ["a missing consent flag", { push_consent: true }],
    ["a stringly-typed consent flag", { push_consent: "true", sms_consent: false }],
    ["a numeric consent flag", { push_consent: 1, sms_consent: 0 }],
    ["a null consent flag", { push_consent: null, sms_consent: true }],
  ])("rejects %s rather than recording it as denied", async (_label, payload) => {
    const res = await consent(jsonReq(payload));
    expect(res.status).toBe(400);
    expect(db.updates).toHaveLength(0);
  });

  it("rejects an over-long phone number", async () => {
    const res = await consent(jsonReq({ push_consent: true, sms_consent: true, phone_number: "1".repeat(101) }));
    expect(res.status).toBe(400);
    expect(db.updates).toHaveLength(0);
  });

  it("strips privilege-shaped fields from the profile update", async () => {
    const res = await consent(
      jsonReq({ push_consent: true, sms_consent: true, role: "admin", isAdmin: true, org_id: ATTACKER_ORG, id: "someone-else" }),
    );
    expect(res.status).toBe(200);
    const row = db.updates[0].payload;
    for (const k of ["role", "isAdmin", "org_id", "id"]) expect(row).not.toHaveProperty(k);
  });
});

// ---------------------------------------------------------------------------
describe("POST /api/billing/webhook", () => {
  const subscription = {
    id: "sub_synthetic_1",
    status: "active",
    customer: "cus_synthetic_1",
    metadata: { org_id: ORG },
    items: { data: [{ current_period_end: 1893456000 }] },
  };
  const event = (type: string, object: unknown) => ({ id: `evt_${Math.random().toString(36).slice(2)}`, type, data: { object } });

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_synthetic_test_value";
  });

  it("still refuses an unsigned body — the schema never replaces the signature", async () => {
    const res = await webhook(jsonReq(event("customer.subscription.updated", subscription), { "stripe-signature": "forged" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/signature verification failed/i);
    expect(db.inserts).toHaveLength(0);
  });

  it("refuses a body with no signature header at all", async () => {
    const res = await webhook(jsonReq(event("customer.subscription.updated", subscription)));
    expect(res.status).toBe(400);
    expect(db.inserts).toHaveLength(0);
  });

  it("applies a verified, well-shaped subscription event", async () => {
    const res = await webhook(jsonReq(event("customer.subscription.updated", subscription), { "stripe-signature": GOOD_SIG }));
    expect(res.status).toBe(200);
    expect(db.inserts[0].table).toBe("billing_events");
    expect(db.updates.find((u) => u.table === "orgs")?.payload).toMatchObject({ subscription_status: "active" });
  });

  it.each([
    ["a subscription with no status", { ...subscription, status: undefined }],
    ["a subscription with no id", { ...subscription, id: undefined }],
    ["a status that is not a string", { ...subscription, status: { value: "active" } }],
    ["items shaped as an array instead of a page", { ...subscription, items: [] }],
  ])("rejects %s even though the signature is valid", async (_label, object) => {
    const res = await webhook(jsonReq(event("customer.subscription.updated", object), { "stripe-signature": GOOD_SIG }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unexpected .* payload shape/);
  });

  it("fails a shape break BEFORE claiming the event id, so the retry is not swallowed as a duplicate", async () => {
    const evt = event("customer.subscription.updated", { ...subscription, status: undefined });
    const first = await webhook(jsonReq(evt, { "stripe-signature": GOOD_SIG }));
    expect(first.status).toBe(400);
    // Nothing was written, so Stripe's redelivery of the same id gets the same
    // honest 400 rather than a "duplicate, already handled" 200.
    expect(db.inserts).toHaveLength(0);
    const retry = await webhook(jsonReq(evt, { "stripe-signature": GOOD_SIG }));
    expect(retry.status).toBe(400);
    expect(db.inserts).toHaveLength(0);
  });

  it("records an unhandled event type without asserting a shape it never reads", async () => {
    const res = await webhook(jsonReq(event("customer.created", { whatever: true }), { "stripe-signature": GOOD_SIG }));
    expect(res.status).toBe(200);
    expect(db.inserts[0].table).toBe("billing_events");
  });

  it("rejects an invoice.payment_failed whose customer is neither an id nor an object", async () => {
    const res = await webhook(jsonReq(event("invoice.payment_failed", { customer: 12345 }), { "stripe-signature": GOOD_SIG }));
    expect(res.status).toBe(400);
    expect(db.inserts).toHaveLength(0);
  });
});
