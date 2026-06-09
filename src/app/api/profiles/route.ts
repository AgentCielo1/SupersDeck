import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";

// =============================================================================
//  POST /api/profiles — invite a new user (admin only)
// =============================================================================
//  Body: { email: string, full_name?: string, role: "super"|"porter"|"manager"|"read_only"|"admin" }
//
//  Uses the service-role key to call Supabase auth.admin.inviteUserByEmail
//  with `data: { role, full_name }` so the handle_new_user trigger picks up
//  the right role + name when the user clicks their magic link.
// =============================================================================

const ALLOWED_ROLES = new Set(["admin", "super", "manager", "porter", "read_only"]);

export async function POST(request: Request) {
  // 1. Caller must be an authenticated admin.
  const me = await getCurrentUserProfile();
  if (!me) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (me.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can invite users" },
      { status: 403 }
    );
  }

  // 2. Parse + validate body.
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const full_name = String(body.full_name ?? "").trim();
  const role = String(body.role ?? "");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${[...ALLOWED_ROLES].join(", ")}` },
      { status: 400 }
    );
  }

  // 3. Use the service-role client (bypasses RLS) to call admin invite.
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name },
    redirectTo: `${origin}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/people");
  return NextResponse.json({ user: data.user }, { status: 201 });
}
