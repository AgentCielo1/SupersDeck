import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  PATCH /api/contractor-visits/:id — sign a contractor out
// =============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const { data, error } = await supabase
    .from("contractor_visits")
    .update({ sign_out_at: body.sign_out_at ?? new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/contractors/logbook");
  return NextResponse.json(data);
}
