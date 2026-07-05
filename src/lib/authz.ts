import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export type Role = "admin" | "super" | "manager" | "porter" | "read_only";

// Role tiers, mirroring supabase/role-policies.sql so the service-role API path
// enforces the SAME authorization the RLS would (defense-in-depth — closes the
// bypass where a low-privilege user could hit a service-role route directly).
export const WRITE_ASM: Role[] = ["admin", "super", "manager"]; // most writes
export const WRITE_ASMP: Role[] = ["admin", "super", "manager", "porter"]; // work orders + heat-log inserts
export const ADMIN_ONLY: Role[] = ["admin"]; // deletes, reference-data writes

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
