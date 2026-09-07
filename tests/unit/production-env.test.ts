import { describe, expect, it } from "vitest";
import {
  INTAKE_SECRET_MISSING_MESSAGE,
  PRODUCTION_REQUIRED_ENV,
  SUPABASE_MISSING_MESSAGE,
  assertProductionEnv,
  intakeGuardMustBeConfigured,
  supabaseMustBeConfigured,
} from "../../src/lib/production-env";

// =============================================================================
//  H2 — the dormant INTAKE_TOKEN_SECRET must refuse the boot, not warn
// =============================================================================
//  The guard being tested here is itself a guard, so the failure mode to worry
//  about is a boot check that has quietly gone dormant the same way the thing it
//  protects did. Hence: every "must fire" assertion is paired with a "must stand
//  down" assertion, so neither an always-true nor an always-false predicate can
//  pass this file.
// =============================================================================

describe("intakeGuardMustBeConfigured", () => {
  it("FIRES in production with no secret — and not when the secret is present", () => {
    // The negative case that matters: this is the exact production state the
    // audit found, where intakeTokensEnabled() returned false and both
    // anonymous write endpoints fell through to rate-limit-only.
    expect(
      intakeGuardMustBeConfigured({
        nodeEnv: "production",
        hasSecret: false,
        skipValidation: false,
      }),
    ).toBe(true);

    // Positive control — an always-true predicate would also pass the line
    // above. This is what rules it out.
    expect(
      intakeGuardMustBeConfigured({
        nodeEnv: "production",
        hasSecret: true,
        skipValidation: false,
      }),
    ).toBe(false);
  });

  it("stands down outside production, where a missing secret is normal", () => {
    for (const nodeEnv of ["development", "test", undefined]) {
      expect(
        intakeGuardMustBeConfigured({ nodeEnv, hasSecret: false, skipValidation: false }),
      ).toBe(false);
    }
    // Positive control — production still fires, so "stands down" above isn't
    // just the predicate being dead.
    expect(
      intakeGuardMustBeConfigured({
        nodeEnv: "production",
        hasSecret: false,
        skipValidation: false,
      }),
    ).toBe(true);
  });

  it("honours SKIP_ENV_VALIDATION, because CI has no real secrets", () => {
    expect(
      intakeGuardMustBeConfigured({
        nodeEnv: "production",
        hasSecret: false,
        skipValidation: true,
      }),
    ).toBe(false);
    // Positive control — and therefore a green CI run is NOT evidence the
    // variable is set anywhere. Only the real deploy can tell.
    expect(
      intakeGuardMustBeConfigured({
        nodeEnv: "production",
        hasSecret: false,
        skipValidation: false,
      }),
    ).toBe(true);
  });
});

describe("supabaseMustBeConfigured", () => {
  it("FIRES in production when either Supabase variable is missing — and not when both are set", () => {
    for (const [hasUrl, hasAnonKey] of [
      [false, false],
      [true, false],
      [false, true],
    ] as const) {
      expect(
        supabaseMustBeConfigured({
          nodeEnv: "production",
          hasUrl,
          hasAnonKey,
          skipValidation: false,
        }),
      ).toBe(true);
    }
    // Positive control — rules out an always-true predicate.
    expect(
      supabaseMustBeConfigured({
        nodeEnv: "production",
        hasUrl: true,
        hasAnonKey: true,
        skipValidation: false,
      }),
    ).toBe(false);
  });

  it("stands down outside production and under SKIP_ENV_VALIDATION", () => {
    expect(
      supabaseMustBeConfigured({
        nodeEnv: "development",
        hasUrl: false,
        hasAnonKey: false,
        skipValidation: false,
      }),
    ).toBe(false);
    expect(
      supabaseMustBeConfigured({
        nodeEnv: "production",
        hasUrl: false,
        hasAnonKey: false,
        skipValidation: true,
      }),
    ).toBe(false);
    // Positive control — production without the skip still fires.
    expect(
      supabaseMustBeConfigured({
        nodeEnv: "production",
        hasUrl: false,
        hasAnonKey: false,
        skipValidation: false,
      }),
    ).toBe(true);
  });
});

describe("assertProductionEnv", () => {
  it("throws an actionable error in production, and is silent when configured", () => {
    expect(() =>
      assertProductionEnv({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toThrow(/INTAKE_TOKEN_SECRET is required in production/);

    // With the intake secret set, the next missing guard — Supabase — fires,
    // because an unconfigured production would serve sample data as real.
    expect(() =>
      assertProductionEnv({
        NODE_ENV: "production",
        INTAKE_TOKEN_SECRET: "x".repeat(64),
      } as NodeJS.ProcessEnv),
    ).toThrow(/Supabase is not configured in production/);

    // The messages have to tell the owner what to DO — a boot failure nobody
    // can action is just an outage.
    expect(INTAKE_SECRET_MISSING_MESSAGE).toContain("openssl rand -hex 32");
    expect(INTAKE_SECRET_MISSING_MESSAGE).toContain("Vercel");
    expect(SUPABASE_MISSING_MESSAGE).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(SUPABASE_MISSING_MESSAGE).toContain("Vercel");

    // Positive control: fully configured, the server comes up.
    expect(() =>
      assertProductionEnv({
        NODE_ENV: "production",
        INTAKE_TOKEN_SECRET: "x".repeat(64),
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it("does not block local development", () => {
    expect(() =>
      assertProductionEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it("declares the guard variables as production-required", () => {
    expect(PRODUCTION_REQUIRED_ENV).toContain("INTAKE_TOKEN_SECRET");
    expect(PRODUCTION_REQUIRED_ENV).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(PRODUCTION_REQUIRED_ENV).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
