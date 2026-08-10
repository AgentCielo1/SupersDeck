import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
//  H4 (fail-open profile) + the role boundaries on every PII surface
// =============================================================================
//  BUG-015 discipline throughout: a role test that only asserts 403 passes just
//  as well when requireRole() rejects EVERYONE — which is exactly what a broken
//  auth mock produces. So every "denied" assertion below is accompanied by an
//  "allowed" assertion driven through the SAME mock, in the same test. If the
//  harness is dead, the positive control fails and the test cannot lie.
// =============================================================================

const getCurrentUserProfile = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUserProfile: () => getCurrentUserProfile(),
}));

// Imported after the mock is registered.
const { requireRole, ADMIN_ONLY, WRITE_ASM, CLOUD_ACCESS, TENANT_PII } = await import(
  "@/lib/authz"
);

const ALL_ROLES = ["admin", "super", "manager", "porter", "read_only"] as const;

function profile(role: string) {
  return { id: "u-1", email: `${role}@example.local`, full_name: role, role };
}

/** Run requireRole as `role` and return the HTTP status (200 = allowed). */
async function statusFor(role: string | null, tier: Parameters<typeof requireRole>[0]) {
  getCurrentUserProfile.mockResolvedValueOnce(role === null ? null : profile(role));
  const auth = await requireRole(tier);
  return auth.response ? auth.response.status : 200;
}

describe("requireRole", () => {
  beforeEach(() => getCurrentUserProfile.mockReset());
  afterEach(() => vi.clearAllMocks());

  // ---------------------------------------------------------------------------
  //  H4 — a missing profiles row used to be synthesized as { role: "super" }
  // ---------------------------------------------------------------------------
  it("DENIES a user with no profile row, while still admitting a real one", async () => {
    // The negative. getCurrentUserProfile now returns null for an unknown user
    // instead of inventing a "super" profile, so every service-role route that
    // gates on requireRole refuses them.
    expect(await statusFor(null, ADMIN_ONLY)).toBe(401);
    expect(await statusFor(null, WRITE_ASM)).toBe(401);
    expect(await statusFor(null, CLOUD_ACCESS)).toBe(401);
    expect(await statusFor(null, TENANT_PII)).toBe(401);

    // The positive control. If the mock or requireRole were simply refusing
    // everything, this line fails — which is what makes the four above mean
    // something. This is the assertion that would have caught H4: before the
    // fix, `statusFor(null, ADMIN_ONLY)` returned 200, because the unknown user
    // arrived as a "super"… and would have arrived as an admin-equivalent on
    // any tier containing "super".
    expect(await statusFor("admin", ADMIN_ONLY)).toBe(200);
  });

  it("distinguishes 401 (nobody) from 403 (somebody, wrong role)", async () => {
    // These must not collapse into one another: a route that answers 401 to a
    // signed-in porter is hiding an authorization bug behind an auth message.
    expect(await statusFor(null, ADMIN_ONLY)).toBe(401);
    expect(await statusFor("porter", ADMIN_ONLY)).toBe(403);
    expect(await statusFor("admin", ADMIN_ONLY)).toBe(200);
  });

  // ---------------------------------------------------------------------------
  //  H1 — the cloud drive tier, one negative per role
  // ---------------------------------------------------------------------------
  describe("CLOUD_ACCESS (the connected Dropbox)", () => {
    it.each(["porter", "read_only"])("denies %s", async (role) => {
      expect(await statusFor(role, CLOUD_ACCESS)).toBe(403);
      // Positive control in the same test — the mock IS delivering profiles.
      expect(await statusFor("super", CLOUD_ACCESS)).toBe(200);
    });

    it.each(["admin", "super", "manager"])("allows %s", async (role) => {
      expect(await statusFor(role, CLOUD_ACCESS)).toBe(200);
    });

    it("covers every known role explicitly — no role is unaccounted for", () => {
      // If someone adds a role to the Role union, this fails and forces a
      // decision about the drive rather than a silent default.
      const decided = new Set([...CLOUD_ACCESS, "porter", "read_only"]);
      for (const r of ALL_ROLES) expect(decided.has(r)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  //  M1 — the tenant phone directory tier
  // ---------------------------------------------------------------------------
  describe("TENANT_PII (tenant names, phones, emergency contacts)", () => {
    it.each(["manager", "porter", "read_only"])("denies %s", async (role) => {
      expect(await statusFor(role, TENANT_PII)).toBe(403);
      // Positive control.
      expect(await statusFor("admin", TENANT_PII)).toBe(200);
    });

    it.each(["admin", "super"])("allows %s", async (role) => {
      expect(await statusFor(role, TENANT_PII)).toBe(200);
    });

    it("is strictly tighter than the cloud tier", () => {
      // Documents the intended ordering. If someone widens TENANT_PII past
      // CLOUD_ACCESS this fails and asks them to think about it.
      for (const r of TENANT_PII) expect(CLOUD_ACCESS).toContain(r);
    });
  });

  it("never admits an unrecognized role string", async () => {
    // Negative — a typo'd or injected role must not pass any tier.
    expect(await statusFor("superuser", CLOUD_ACCESS)).toBe(403);
    expect(await statusFor("SUPER", CLOUD_ACCESS)).toBe(403);
    expect(await statusFor("", CLOUD_ACCESS)).toBe(403);
    // Positive control.
    expect(await statusFor("super", CLOUD_ACCESS)).toBe(200);
  });
});
