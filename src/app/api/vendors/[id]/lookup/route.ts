import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Small read-only endpoint for the edit page to fetch the current row.
// (Could go straight through a server component but keeping the form as
//  client-only makes the state model simpler.)

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
