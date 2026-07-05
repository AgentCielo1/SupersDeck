import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";

// An absent/empty body is valid here (defaults to signing out "now"), so we
// parse tolerantly rather than 400 on a missing body. A supplied sign_out_at is
// bounded + must be a string; the handler further checks it parses, isn't in
// the future, and isn't before sign-in.
const SignOutSchema = z.object({
  sign_out_at: z.string().max(64).optional().nullable(),
});

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

  // Read tolerantly: a missing/empty body defaults to signing out now.
  let raw: unknown = {};
  try {
    raw = await request.json();
  } catch {
    // empty body is fine — default to signing out now
  }
  const shape = SignOutSchema.safeParse(raw);
  if (!shape.success) {
    return NextResponse.json({ error: "Invalid sign_out_at" }, { status: 400 });
  }
  const body = shape.data;

  // Default to "now"; a supplied timestamp must be a real ISO date and not
  // meaningfully in the future (small allowance for clock skew).
  let signOutAt = new Date();
  if (body.sign_out_at != null) {
    const parsedDate = new Date(body.sign_out_at);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid sign_out_at" }, { status: 400 });
    }
    if (parsedDate.getTime() > Date.now() + 5 * 60_000) {
      return NextResponse.json({ error: "Invalid sign_out_at" }, { status: 400 });
    }
    signOutAt = parsedDate;
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
