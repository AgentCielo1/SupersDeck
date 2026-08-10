import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export type Role = "admin" | "super" | "manager" | "porter" | "read_only";

// Role tiers, mirroring supabase/role-policies.sql so the service-role API path
// enforces the SAME authorization the RLS would (defense-in-depth — closes the
// bypass where a low-privilege user could hit a service-role route directly).
export const WRITE_ASM: Role[] = ["admin", "super", "manager"]; // most writes
export const WRITE_ASMP: Role[] = ["admin", "super", "manager", "porter"]; // work orders + heat-log inserts
export const ADMIN_ONLY: Role[] = ["admin"]; // deletes, reference-data writes

// ---------------------------------------------------------------------------
//  PII tiers — read boundaries, not write boundaries
// ---------------------------------------------------------------------------
//  The three tiers above answer "who may change things". These two answer "who
//  may SEE personal data", which is a different question and was previously not
//  asked at all: both surfaces below were open to every signed-in role.
//
//  TODAY THESE DISTINCTIONS ARE A NO-OP. Exactly two people sign into
//  SupersDeck — the Superintendent and the Assistant Superintendent — and both
//  are on the allowed side of both lists. Nobody is currently denied anything by
//  the two constants below.
//
//  They are still worth having, and worth being ONE LIST EACH, for the day that
//  stops being true: the first porter login, the first read_only auditor, the
//  second customer. On that day the decision is made here, in one place that is
//  reviewed, rather than discovered later in whichever route forgot to ask.
//  Widening either one is a single edit — plus the matching RLS policy, which
//  is named in each comment. Change both or the app and the database disagree.

/** The connected cloud drive: tenant correspondence, household composition
 *  letters, surrender agreements. Same tier that already gates /api/cloud/upload
 *  and work-orders/:id/file-to-cloud, so the whole subsystem has one boundary.
 *
 *  NOTE: this list is NOT what protects the drive. The real control is the path
 *  confinement in src/lib/cloud/path-guard.ts, which holds even when the caller
 *  is one of the two legitimate accounts — a forwarded link or a stolen session
 *  still cannot walk out of the allowed subtree. */
export const CLOUD_ACCESS: Role[] = ["admin", "super", "manager"];

/** The tenant directory: names, two phone numbers, emergency contact + relation,
 *  lease end, for every occupied unit. Least privilege pending an owner call —
 *  see supabase/migration-tenant-pii-policies.sql. Porters may legitimately need
 *  some contact access; adding "porter" here plus in that policy is the whole
 *  change. */
export const TENANT_PII: Role[] = ["admin", "super"];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

type Guard = { profile: Profile; response?: undefined } | { profile?: undefined; response: NextResponse };

/**
 * Gate an API route to an authenticated user whose role is in `allowed`.
 * Usage:
 *   const auth = await requireRole(ADMIN_ONLY);
 *   if (auth.response) return auth.response;   // 401 or 403, already formed
 *   // ...proceed; auth.profile is the caller
 */
export async function requireRole(allowed: Role[]): Promise<Guard> {
  const me = await getCurrentUserProfile();
  if (!me) {
    return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  if (!allowed.includes(me.role as Role)) {
    return { response: NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 }) };
  }
  return { profile: me as Profile };
}
