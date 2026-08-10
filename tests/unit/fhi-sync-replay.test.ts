import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  SIGNATURE_TTL_MS,
  signPayload,
  signingString,
} from "../../src/lib/fhi-sync";

// =============================================================================
//  M3 — the SupersDeck → FHI signature must not be replayable
// =============================================================================
//  The old signature covered the body alone, so it was a constant: capture one
//  request and it can be POSTed again forever. The payload carries
//  reporter_name and reporter_phone.
//
//  This file tests the SENDER half — the bytes we sign and the headers we send.
//  The REJECTION half lives in the FHI receiver (~/Developer/forest-hills-intake),
//  which this branch deliberately does not touch. The reference verifier below
//  is the executable specification of what that receiver must implement; it is
//  tested here so the spec is known to be correct before anyone writes against
//  a prose description of it.
// =============================================================================

const SECRET = "shared-secret-for-tests-only";

/**
 * Reference implementation of the check FHI must perform. Written here, tested
 * here, and quoted verbatim in the report so the two ends cannot drift.
 */
function verify(
  secret: string,
  headers: { timestamp: string | null; nonce: string | null; signature: string | null },
  rawBody: string,
  seenNonces: Set<string>,
  now = Date.now(),
): { ok: true } | { ok: false; reason: string } {
  const { timestamp, nonce, signature } = headers;
  if (!timestamp || !nonce || !signature) return { ok: false, reason: "missing_headers" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };
  if (Math.abs(now - ts) > SIGNATURE_TTL_MS) return { ok: false, reason: "stale" };

  // Constant-time compare, and only AFTER the cheap checks.
  const expected = signPayload(secret, ts, nonce, rawBody);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: "bad_signature" };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: "bad_signature" };

  // Nonce check LAST: never record a nonce for a request that failed to
  // authenticate, or an attacker can burn arbitrary nonces.
  if (seenNonces.has(nonce)) return { ok: false, reason: "replay" };
  seenNonces.add(nonce);
  return { ok: true };
}

function send(body: string, at = Date.now()) {
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    body,
    headers: {
      timestamp: String(at),
      nonce,
      signature: signPayload(SECRET, at, nonce, body),
    },
  };
}

const BODY = JSON.stringify({
  action: "upsert",
  id: "wo-1",
  reporter_name: "Test Resident",
  reporter_phone: "+15550000000",
});

describe("FHI sync signature", () => {
  it("binds the timestamp and nonce into the signed material", () => {
    const ts = 1_700_000_000_000;
    expect(signingString(ts, "abc", BODY)).toBe(`${ts}.abc.${BODY}`);

    // Changing ANY of the three changes the signature. If the signature still
    // only covered the body, the first two would be equal.
    const base = signPayload(SECRET, ts, "abc", BODY);
    expect(signPayload(SECRET, ts + 1, "abc", BODY)).not.toBe(base);
    expect(signPayload(SECRET, ts, "abd", BODY)).not.toBe(base);
    expect(signPayload(SECRET, ts, "abc", BODY + " ")).not.toBe(base);
    // Positive control — identical inputs are deterministic.
    expect(signPayload(SECRET, ts, "abc", BODY)).toBe(base);
  });

  it("accepts a fresh request and REJECTS the very same bytes replayed", () => {
    const seen = new Set<string>();
    const req = send(BODY);

    // Positive control first: the request is genuinely valid.
    expect(verify(SECRET, req.headers, req.body, seen)).toEqual({ ok: true });

    // The negative: byte-for-byte identical, which is all a captured request
    // ever is. Before this change it was indistinguishable from the original.
    expect(verify(SECRET, req.headers, req.body, seen)).toEqual({
      ok: false,
      reason: "replay",
    });
  });

  it("rejects a captured request replayed after the window, at any age", () => {
    const seen = new Set<string>();
    const t0 = Date.now();
    const req = send(BODY, t0);

    // Positive control — valid inside the window, including at the edge.
    expect(verify(SECRET, req.headers, req.body, new Set(), t0)).toEqual({ ok: true });
    expect(
      verify(SECRET, req.headers, req.body, new Set(), t0 + SIGNATURE_TTL_MS - 1),
    ).toEqual({ ok: true });

    // Negative — just past the window, and long past it.
    expect(
      verify(SECRET, req.headers, req.body, seen, t0 + SIGNATURE_TTL_MS + 1),
    ).toEqual({ ok: false, reason: "stale" });
    expect(
      verify(SECRET, req.headers, req.body, seen, t0 + 86_400_000),
    ).toEqual({ ok: false, reason: "stale" });
  });

  it("tolerates modest clock skew in BOTH directions", () => {
    // Vercel regions drift. A receiver that only allows past timestamps drops
    // legitimate work orders whenever the sender's clock runs slightly fast.
    const t0 = Date.now();
    const req = send(BODY, t0);
    expect(verify(SECRET, req.headers, req.body, new Set(), t0 - 60_000)).toEqual({
      ok: true,
    });
    expect(verify(SECRET, req.headers, req.body, new Set(), t0 + 60_000)).toEqual({
      ok: true,
    });
  });

  it("rejects a tampered body, a wrong secret, and missing headers", () => {
    const req = send(BODY);

    // Body swapped after signing — e.g. redirecting the WO to another unit.
    expect(
      verify(SECRET, req.headers, BODY.replace("wo-1", "wo-999"), new Set()),
    ).toEqual({ ok: false, reason: "bad_signature" });

    expect(verify("wrong-secret", req.headers, req.body, new Set())).toEqual({
      ok: false,
      reason: "bad_signature",
    });

    expect(
      verify(SECRET, { ...req.headers, nonce: null }, req.body, new Set()),
    ).toEqual({ ok: false, reason: "missing_headers" });
    expect(
      verify(SECRET, { ...req.headers, timestamp: null }, req.body, new Set()),
    ).toEqual({ ok: false, reason: "missing_headers" });

    // Positive control — the unmodified request still verifies.
    expect(verify(SECRET, req.headers, req.body, new Set())).toEqual({ ok: true });
  });

  it("does not consume the nonce of a request that failed to authenticate", () => {
    // Otherwise anyone who can guess a nonce can pre-burn it and make the
    // legitimate delivery look like a replay.
    const seen = new Set<string>();
    const req = send(BODY);

    expect(verify("wrong-secret", req.headers, req.body, seen)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
    expect(seen.size).toBe(0);
    // The genuine request still gets through.
    expect(verify(SECRET, req.headers, req.body, seen)).toEqual({ ok: true });
  });

  it("uses a replay window that is bounded and non-trivial", () => {
    // Not an arbitrary number: 5 minutes is the bound AWS SigV4 uses for the
    // same decision. Asserted so a later "just make it a day" edit is visible.
    expect(SIGNATURE_TTL_MS).toBe(5 * 60 * 1000);
  });
});
