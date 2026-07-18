import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  intakeTokensEnabled,
  mintIntakeToken,
  verifyIntakeToken,
} from "../../src/lib/intake-token";

const SECRET = "test-secret-do-not-use-in-prod";

describe("intake token (public intake guard)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    process.env.INTAKE_TOKEN_SECRET = SECRET;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.INTAKE_TOKEN_SECRET;
  });

  it("is dormant until the secret is configured", () => {
    delete process.env.INTAKE_TOKEN_SECRET;
    expect(intakeTokensEnabled()).toBe(false);
    expect(mintIntakeToken("bldg-1")).toBe("");
    // verify is strict — callers gate on intakeTokensEnabled() first
    expect(verifyIntakeToken("123.abc", "bldg-1")).toBe(false);
  });

  it("mints a token that verifies for the same building", () => {
    expect(intakeTokensEnabled()).toBe(true);
    const token = mintIntakeToken("bldg-1");
    expect(token).not.toBe("");
    expect(verifyIntakeToken(token, "bldg-1")).toBe(true);
  });

  it("is building-scoped — a bldg-1 token can't post to bldg-2", () => {
    const token = mintIntakeToken("bldg-1");
    expect(verifyIntakeToken(token, "bldg-2")).toBe(false);
  });

  it("canonicalizes the building id (case/whitespace)", () => {
    const token = mintIntakeToken("Bldg-1 ");
    expect(verifyIntakeToken(token, "bldg-1")).toBe(true);
  });

  it("expires after the TTL", () => {
    const token = mintIntakeToken("bldg-1", 60_000);
    expect(verifyIntakeToken(token, "bldg-1")).toBe(true);
    vi.setSystemTime(1_700_000_000_000 + 60_001);
    expect(verifyIntakeToken(token, "bldg-1")).toBe(false);
  });

  it("rejects tampered signatures and expiries", () => {
    const token = mintIntakeToken("bldg-1");
    const [exp, sig] = token.split(".");
    // flip a signature character
    const flipped = sig[0] === "A" ? "B" : "A";
    expect(verifyIntakeToken(`${exp}.${flipped}${sig.slice(1)}`, "bldg-1")).toBe(false);
    // extend the expiry without re-signing
    expect(verifyIntakeToken(`${Number(exp) + 999_999}.${sig}`, "bldg-1")).toBe(false);
  });

  it("rejects garbage tokens", () => {
    expect(verifyIntakeToken(null, "bldg-1")).toBe(false);
    expect(verifyIntakeToken("", "bldg-1")).toBe(false);
    expect(verifyIntakeToken("not-a-token", "bldg-1")).toBe(false);
    expect(verifyIntakeToken(".", "bldg-1")).toBe(false);
    expect(verifyIntakeToken("NaN.sig", "bldg-1")).toBe(false);
  });
});
