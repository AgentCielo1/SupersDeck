import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { parseJson, reqStr, optStr } from "@/lib/validation";

const CreateCertSchema = z.object({
  holder_name: reqStr(300),
  type: reqStr(300),
  number: reqStr(100),
  expires_at: reqStr(100),
  issued_at: optStr(100),
  agency: optStr(300),
  notes: optStr(5000),
});

// =============================================================================
//  POST /api/certifications — add a staff certification
// =============================================================================

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function POST(request: Request) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }
  const parsed = await parseJson(request, CreateCertSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const row = {
    id: `cert-${slug(`${body.holder_name}-${body.type}-${body.number}`)}-${Date.now().toString(36)}`,
    holder_name: String(body.holder_name).trim(),
    type: String(body.type).trim(),
    number: String(body.number).trim(),
    issued_at: body.issued_at || null,
    expires_at: String(body.expires_at),
    agency: body.agency ? String(body.agency).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
  };

  const { data, error } = await supabase
    .from("certifications")
    .insert(row)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/certifications");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
