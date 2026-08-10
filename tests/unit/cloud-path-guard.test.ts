import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CLOUD_ROOTS_ENV,
  MAX_PATH_LENGTH,
  allowedRoots,
  cloudRootsConfigured,
  denialResponse,
  normalizeCloudPath,
  resolveCloudPath,
} from "../../src/lib/cloud/path-guard";

// =============================================================================
//  H1 — the cloud drive path confinement
// =============================================================================
//  BUG-015 discipline: every negative assertion is paired with a POSITIVE
//  control in the same test. An isolation test that only asserts "denied" goes
//  green when the guard denies EVERYTHING — including for a reason that has
//  nothing to do with the thing being tested (unset env, thrown error, typo in
//  the fixture). The pair is what proves the guard discriminates.
// =============================================================================

const ROOT = "/Forest Hills";

describe("cloud path guard", () => {
  beforeEach(() => {
    process.env[CLOUD_ROOTS_ENV] = ROOT;
  });
  afterEach(() => {
    delete process.env[CLOUD_ROOTS_ENV];
  });

  describe("configuration", () => {
    it("is DENY-by-default when unconfigured, and open once configured", () => {
      delete process.env[CLOUD_ROOTS_ENV];
      expect(cloudRootsConfigured()).toBe(false);
      expect(allowedRoots()).toEqual([]);
      // The negative: nothing resolves, not even a legitimate path.
      expect(resolveCloudPath(`${ROOT}/Leases/x.pdf`)).toEqual({
        ok: false,
        reason: "not_configured",
      });

      // The positive control: the SAME path resolves once configured. Without
      // this line the test above would pass with resolveCloudPath() hardcoded
      // to return a denial.
      process.env[CLOUD_ROOTS_ENV] = ROOT;
      expect(resolveCloudPath(`${ROOT}/Leases/x.pdf`)).toEqual({
        ok: true,
        kind: "file",
        path: `${ROOT}/Leases/x.pdf`,
      });
    });

    it("parses and normalizes a multi-root allowlist", () => {
      process.env[CLOUD_ROOTS_ENV] = " /Forest Hills , Records/ ,, ";
      expect(allowedRoots()).toEqual(["/Forest Hills", "/Records"]);
    });

    it("ignores a bare '/' root — that would allowlist the whole account", () => {
      process.env[CLOUD_ROOTS_ENV] = "/";
      expect(allowedRoots()).toEqual([]);
      expect(cloudRootsConfigured()).toBe(false);
    });
  });

  describe("traversal and malformed input", () => {
    it("rejects '..' but allows a name that merely CONTAINS dots", () => {
      // Negative
      expect(resolveCloudPath(`${ROOT}/../../etc/passwd`)).toEqual({
        ok: false,
        reason: "traversal",
      });
      expect(resolveCloudPath(`${ROOT}/Leases/../../../Personal`)).toEqual({
        ok: false,
        reason: "traversal",
      });
      // Positive control — dots are not inherently traversal, and a guard that
      // rejected these would be broken in the other direction.
      expect(resolveCloudPath(`${ROOT}/2024..2025 Leases/a..b.pdf`)).toEqual({
        ok: true,
        kind: "file",
        path: `${ROOT}/2024..2025 Leases/a..b.pdf`,
      });
    });

    it("rejects backslashes and control characters, allows ordinary punctuation", () => {
      // Negative — separator confusion and NUL truncation.
      expect(normalizeCloudPath(`${ROOT}\\..\\secret`)).toBeNull();
      expect(normalizeCloudPath(`${ROOT}/x\u0000.pdf`)).toBeNull();
      expect(normalizeCloudPath(`${ROOT}/x\u007f.pdf`)).toBeNull();
      expect(normalizeCloudPath(`${ROOT}/x\u001b[0m.pdf`)).toBeNull();
      // Positive control — real FHMHA filenames have spaces, ampersands,
      // parentheses, commas, accents and hyphens.
      expect(normalizeCloudPath(`${ROOT}/Smith & Co (2024), final — señor.pdf`)).toBe(
        `${ROOT}/Smith & Co (2024), final — señor.pdf`,
      );
    });

    it("bounds path length, but not below any plausible real path", () => {
      const tooLong = `${ROOT}/${"a".repeat(MAX_PATH_LENGTH)}`;
      expect(normalizeCloudPath(tooLong)).toBeNull();
      // Positive control
      expect(normalizeCloudPath(`${ROOT}/${"a".repeat(100)}`)).not.toBeNull();
    });

    it("collapses redundant separators rather than being confused by them", () => {
      expect(resolveCloudPath(`${ROOT}//Leases///x.pdf`)).toEqual({
        ok: true,
        kind: "file",
        path: `${ROOT}/Leases/x.pdf`,
      });
    });
  });

  describe("confinement to the allowlisted subtree", () => {
    it("denies a sibling folder while allowing the real one", () => {
      // Negative — the whole point of H1. A signed-in caller asking for the
      // owner's personal folders.
      expect(resolveCloudPath("/Personal/Taxes/2024.pdf")).toEqual({
        ok: false,
        reason: "outside_root",
      });
      // Positive control — same call shape, inside the root.
      expect(resolveCloudPath(`${ROOT}/Leases/2024.pdf`)).toEqual({
        ok: true,
        kind: "file",
        path: `${ROOT}/Leases/2024.pdf`,
      });
    });

    it("is not fooled by a prefix that merely STARTS with the root name", () => {
      // "/Forest Hills Personal" starts with "/Forest Hills" as a string but is
      // a different folder. A naive startsWith() check leaks it.
      expect(resolveCloudPath("/Forest Hills Personal/diary.pdf")).toEqual({
        ok: false,
        reason: "outside_root",
      });
      // Positive control — the genuine child is still allowed.
      expect(resolveCloudPath("/Forest Hills/diary.pdf")).toEqual({
        ok: true,
        kind: "file",
        path: "/Forest Hills/diary.pdf",
      });
    });

    it("matches case-insensitively, as Dropbox paths do", () => {
      expect(resolveCloudPath("/FOREST HILLS/Leases/x.pdf")).toEqual({
        ok: true,
        kind: "file",
        path: "/FOREST HILLS/Leases/x.pdf",
      });
      // Positive control that case-insensitivity did not become "allow all".
      expect(resolveCloudPath("/PERSONAL/x.pdf")).toEqual({
        ok: false,
        reason: "outside_root",
      });
    });

    it("honours every configured root, and only those", () => {
      process.env[CLOUD_ROOTS_ENV] = "/Forest Hills,/Records";
      expect(resolveCloudPath("/Records/a.pdf")).toMatchObject({ ok: true });
      expect(resolveCloudPath("/Forest Hills/a.pdf")).toMatchObject({ ok: true });
      expect(resolveCloudPath("/Archive/a.pdf")).toEqual({
        ok: false,
        reason: "outside_root",
      });
    });
  });

  describe("the account root", () => {
    it("never resolves to Dropbox's real root for a byte-serving route", () => {
      process.env[CLOUD_ROOTS_ENV] = "/Forest Hills,/Records";
      // Negative — with several roots there is no single file "" could mean,
      // and it must NOT fall through to "" (the whole account).
      expect(resolveCloudPath("")).toEqual({ ok: false, reason: "root_not_a_file" });
      // Positive control — the listing route asks for the virtual root and gets
      // the allowed roots, never the account root.
      expect(resolveCloudPath("", { allowVirtualRoot: true })).toEqual({
        ok: true,
        kind: "virtual-root",
        roots: ["/Forest Hills", "/Records"],
      });
    });

    it("substitutes the single configured root for '' rather than the account root", () => {
      const r = resolveCloudPath("");
      expect(r).toEqual({ ok: true, kind: "file", path: ROOT });
      // The regression this guards: returning "" would list the whole Dropbox.
      expect(r.ok && r.kind === "file" && r.path).not.toBe("");
    });
  });

  describe("denial responses", () => {
    it("tells the admin what to set, but tells a prober nothing", () => {
      const unconfigured = denialResponse("not_configured");
      expect(unconfigured.status).toBe(503);
      expect(unconfigured.error).toContain(CLOUD_ROOTS_ENV);

      // All caller-fault denials look identical — distinguishing "not found"
      // from "not allowed" would map the tree we just confined.
      const outside = denialResponse("outside_root");
      const traversal = denialResponse("traversal");
      const malformed = denialResponse("malformed");
      expect(outside.status).toBe(403);
      expect(traversal).toEqual(outside);
      expect(malformed).toEqual(outside);
      expect(outside.error).not.toContain(CLOUD_ROOTS_ENV);
    });
  });
});
