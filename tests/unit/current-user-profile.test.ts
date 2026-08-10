import { beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
//  H4 — a missing `profiles` row must NOT be a privilege grant
// =============================================================================
//  WHY THIS FILE IS SEPARATE FROM authz-roles.test.ts
//
//  That suite mocks @/lib/supabase-server wholesale, so it proves requireRole
//  denies a null profile — but it can say nothing about whether
//  getCurrentUserProfile actually RETURNS null, because the real function is
//  never executed. Reverting the H4 fix leaves that suite green.
//
//  This file therefore mocks one layer lower: the Supabase client itself. It
//  exercises the real getCurrentUserProfile, so restoring the old
//  `?? { role: "super" }` fallback turns it red. That is the difference between
//  a test and a decoration.
// =============================================================================

const maybeSingle = vi.fn();
const getUser = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined, set: () => {} }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: () => getUser() },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }),
    }),
  }),
}));

// getServerSupabase is re-exported by supabase-server; stub the module it comes
// from so importing it doesn't need real credentials.
vi.mock("@/lib/supabase", () => ({ getServerSupabase: () => null }));

const SIGNED_IN_USER = { id: "user-with-no-profile-row", email: "ghost@example.local" };

describe("getCurrentUserProfile", () => {
  beforeEach(() => {
    vi.resetModules();
    maybeSingle.mockReset();
    getUser.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder";
  });

  it("returns NULL for a signed-in user with no profiles row (and the profile when there is one)", async () => {
    const { getCurrentUserProfile } = await import("@/lib/supabase-server");

    // ---- The negative -------------------------------------------------------
    // Authenticated with Supabase, but no row in `profiles`. This used to be
    // answered with a synthesized { role: "super" } — the highest operational
    // role in the product — which requireRole then trusted on every
    // service-role route. A missing row was a privilege GRANT.
    getUser.mockResolvedValueOnce({ data: { user: SIGNED_IN_USER } });
    maybeSingle.mockResolvedValueOnce({ data: null });

    const ghost = await getCurrentUserProfile();
    expect(ghost).toBeNull();

    // ---- The positive control ----------------------------------------------
    // Same code path, same mocks, a row that exists. Without this, the
    // assertion above would pass with getCurrentUserProfile() returning null
    // unconditionally — i.e. with the whole app locked out — and we would
    // have "proved" security by breaking the product.
    getUser.mockResolvedValueOnce({ data: { user: { id: "u-2", email: "real@example.local" } } });
    maybeSingle.mockResolvedValueOnce({
      data: { id: "u-2", email: "real@example.local", full_name: "Real", role: "porter" },
    });

    const real = await getCurrentUserProfile();
    expect(real).not.toBeNull();
    expect(real?.role).toBe("porter");
  });

  it("does not invent a role — whatever profiles says is what comes back", async () => {
    const { getCurrentUserProfile } = await import("@/lib/supabase-server");

    // The specific regression: the old fallback hardcoded "super". If it ever
    // returns for a low-privilege user, this catches it.
    getUser.mockResolvedValueOnce({ data: { user: { id: "u-3", email: "p@example.local" } } });
    maybeSingle.mockResolvedValueOnce({
      data: { id: "u-3", email: "p@example.local", full_name: null, role: "read_only" },
    });

    const me = await getCurrentUserProfile();
    expect(me?.role).toBe("read_only");
    expect(me?.role).not.toBe("super");
  });

  it("returns null when nobody is signed in at all", async () => {
    const { getCurrentUserProfile } = await import("@/lib/supabase-server");
    getUser.mockResolvedValueOnce({ data: { user: null } });
    expect(await getCurrentUserProfile()).toBeNull();
    // maybeSingle must not even have been consulted — no user, no lookup.
    expect(maybeSingle).not.toHaveBeenCalled();
  });
});
