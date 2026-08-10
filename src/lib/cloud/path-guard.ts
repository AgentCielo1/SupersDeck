// =============================================================================
//  path-guard — confine every cloud-drive request to an allowlisted subtree
// =============================================================================
//  The connected Dropbox is a whole ACCOUNT, not a folder. Before this guard,
//  /api/cloud/list?path= passed the query string to Dropbox verbatim, so any
//  caller who got past the auth check could ask for "" (the account root) and
//  walk the entire tree — which holds tenant correspondence, household
//  composition letters and surrender agreements.
//
//  Two independent things have to be true for a path to be served:
//
//    1. It NORMALIZES cleanly. No "..", no backslashes, no control characters,
//       no absurd length. We reject rather than silently repair, because a
//       request containing ".." is not a typo — it is someone probing.
//    2. It RESOLVES INSIDE an allowlisted root. The allowlist is configuration
//       (CLOUD_ALLOWED_ROOTS), not a constant, because the folder names are the
//       customer's, not ours.
//
//  DENY WHEN UNSET. If CLOUD_ALLOWED_ROOTS is empty, every path is refused.
//  The tempting alternative — "unset means allow everything, same as today" —
//  is the exact shape of the dormant INTAKE_TOKEN_SECRET guard this audit also
//  found: a security control that reads as present in the source and does
//  nothing in production. A cloud browser that is visibly dark until one env
//  var is set is a cheaper failure than one that is quietly wide open.
//
//    CLOUD_ALLOWED_ROOTS="/Forest Hills,/FHMHA Records"
//
//  Matching is case-insensitive because Dropbox paths are (path_lower is the
//  provider's own canonical form).
// =============================================================================

export const CLOUD_ROOTS_ENV = "CLOUD_ALLOWED_ROOTS";

/** Longest path we will forward. Dropbox's own limit is far higher; this is
 *  just a sanity bound so a pathological query can't become a payload. */
export const MAX_PATH_LENGTH = 1024;

export type CloudPathDenial =
  | "not_configured" // CLOUD_ALLOWED_ROOTS is unset — nothing is servable
  | "malformed" // control chars, backslashes, over-length
  | "traversal" // an explicit ".." segment
  | "outside_root" // well-formed, but not under any allowed root
  | "root_not_a_file"; // the virtual root has no bytes to stream

export type CloudPathResult =
  | { ok: true; kind: "file"; path: string }
  | { ok: true; kind: "virtual-root"; roots: string[] }
  | { ok: false; reason: CloudPathDenial };

/**
 * The configured allowlist, normalized ("/Forest Hills"). Empty when unset —
 * callers must treat empty as "deny", never as "allow all".
 */
export function allowedRoots(): string[] {
  const raw = process.env[CLOUD_ROOTS_ENV] ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `/${s.split("/").filter(Boolean).join("/")}`)
    .filter((s) => s !== "/");
}

/** True once at least one allowed root is configured. */
export function cloudRootsConfigured(): boolean {
  return allowedRoots().length > 0;
}

/**
 * Normalize an untrusted provider path. Returns null when the input is
 * malformed, and "" for the account root.
 *
 * Deliberately NOT a resolver: "a/../b" does not become "b", it is rejected.
 */
export function normalizeCloudPath(raw: string | null | undefined): string | null {
  const s = String(raw ?? "");
  if (s.length > MAX_PATH_LENGTH) return null;
  // Control characters (incl. NUL) and backslashes never appear in a legitimate
  // Dropbox path we generated, and both are classic separator-confusion tricks.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(s)) return null;
  const segments = s.split("/").filter((seg) => seg !== "" && seg !== ".");
  if (segments.some((seg) => seg === "..")) return null;
  if (segments.length === 0) return "";
  return `/${segments.join("/")}`;
}

function isInside(path: string, root: string): boolean {
  const p = path.toLowerCase();
  const r = root.toLowerCase();
  return p === r || p.startsWith(`${r}/`);
}

/**
 * The one entry point routes should call.
 *
 * `allowVirtualRoot` is for the folder LISTING only: the browser opens on "",
 * and with the account root off-limits we answer that with a synthetic listing
 * of the allowed roots themselves. A byte-serving route (stream/thumb/preview)
 * passes false — there is no file at the virtual root.
 */
export function resolveCloudPath(
  raw: string | null | undefined,
  opts: { allowVirtualRoot?: boolean } = {},
): CloudPathResult {
  const roots = allowedRoots();
  if (roots.length === 0) return { ok: false, reason: "not_configured" };

  const s = String(raw ?? "");
  // Distinguish the two denial reasons for the log: a ".." is a probe, a
  // control character is a malformed client. Both are refused.
  if (s.split("/").some((seg) => seg === "..")) {
    return { ok: false, reason: "traversal" };
  }
  const path = normalizeCloudPath(s);
  if (path === null) return { ok: false, reason: "malformed" };

  if (path === "") {
    if (opts.allowVirtualRoot) return { ok: true, kind: "virtual-root", roots };
    // A single configured root can stand in for "the top" unambiguously; with
    // several there is no one file the caller could have meant.
    if (roots.length === 1) return { ok: true, kind: "file", path: roots[0] };
    return { ok: false, reason: "root_not_a_file" };
  }

  if (!roots.some((r) => isInside(path, r))) {
    return { ok: false, reason: "outside_root" };
  }
  return { ok: true, kind: "file", path };
}

/** HTTP status + message for a denial. Kept next to the reasons so all four
 *  routes answer identically and no route invents its own wording. */
export function denialResponse(reason: CloudPathDenial): {
  status: number;
  error: string;
} {
  if (reason === "not_configured") {
    return {
      status: 503,
      error:
        "The cloud drive is not configured for browsing. An administrator must set " +
        `${CLOUD_ROOTS_ENV} to the folder(s) SupersDeck may open.`,
    };
  }
  // Everything else is the caller asking for something outside the records
  // they're allowed to see. One message for all of them: distinguishing
  // "doesn't exist" from "not allowed" would map the tree we just confined.
  return { status: 403, error: "That folder isn't available in SupersDeck." };
}
