import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";

// =============================================================================
//  PATCH /api/contractor-visits/:id — sign a contractor out
// =============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — default to signing out now
  }

  // Default to "now"; a supplied timestamp must be a real ISO date and not
  // meaningfully in the future (small allowance for clock skew).
  let signOutAt = new Date();
  if (body.sign_out_at != null) {
    const parsed = new Date(body.sign_out_at);
    if (typeof body.sign_out_at !== "string" || Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid sign_out_at" }, { status: 400 });
    }
    if (parsed.getTime() > Date.now() + 5 * 60_000) {
      return NextResponse.json({ error: "Invalid sign_out_at" }, { status: 400 });
    }
    signOutAt = parsed;
  }

  const { data: visit } = await supabase
    .from("contractor_visits")
    .select("id, sign_in_at, sign_out_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }
  if (visit.sign_out_at) {
    return NextResponse.json({ error: "Already signed out" }, { status: 400 });
  }
  if (signOutAt.getTime() < new Date(visit.sign_in_at).getTime()) {
    return NextResponse.json({ error: "Invalid sign_out_at" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("contractor_visits")
    .update({ sign_out_at: signOutAt.toISOString() })
    .eq("id", params.id)
    .is("sign_out_at", null) // guard against a concurrent sign-out
    .select()
    .single();
  if (error) return NextResponse.json({ error: "Could not sign out" }, { status: 500 });

  revalidatePath("/contractors/logbook");
  return NextResponse.json(data);
}
