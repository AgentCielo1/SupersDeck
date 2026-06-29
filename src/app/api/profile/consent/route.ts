import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";

// =============================================================================
//  POST /api/profile/consent — record notification consent (NY all-party)
// =============================================================================
//  Stores the user's explicit push/SMS opt-in choices + timestamp + phone.
//  Both choices are required by the consent modal; this endpoint just persists
//  whatever the user decided.
// =============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { push_consent?: boolean; sms_consent?: boolean; phone_number?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const push_consent = Boolean(body.push_consent);
  const sms_consent = Boolean(body.sms_consent);
  const phone_number =
    typeof body.phone_number === "string" && body.phone_number.trim()
      ? body.phone_number.trim()
      : undefined;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const update: Record<string, unknown> = {
    push_consent,
    sms_consent,
    notification_consented_at: new Date().toISOString(),
  };
  if (phone_number !== undefined) update.phone_number = phone_number;

  const { error } = await supabase.from("profiles").update(update).eq("id", me.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
