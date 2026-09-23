import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { parseJson, optStr } from "@/lib/validation";

// =============================================================================
//  POST /api/profile/consent — record notification consent (NY all-party)
// =============================================================================
//  Stores the user's explicit push/SMS opt-in choices + timestamp + phone.
//  Both choices are required by the consent modal; this endpoint just persists
//  whatever the user decided.
//
//  This row IS the NY all-party consent record, so the two flags are REQUIRED
//  booleans rather than coerced ones: a missing or non-boolean field now gets a
//  400 instead of being silently recorded as "denied". ConsentModal has always
//  sent both as real booleans (it will not enable Save until both are chosen).
// =============================================================================

export const dynamic = "force-dynamic";

// 100 chars is generous for any E.164 number plus formatting; the value is
// stored verbatim and later handed to Twilio, which does its own parsing.
const ConsentSchema = z.object({
  push_consent: z.boolean(),
  sms_consent: z.boolean(),
  phone_number: optStr(100),
});

export async function POST(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJson(request, ConsentSchema);
  if (parsed.response) return parsed.response;
  const { push_consent, sms_consent } = parsed.data;
  // optStr already trimmed it; an empty/absent number leaves the column alone,
  // exactly as before.
  const phone_number = parsed.data.phone_number || undefined;

  const supabase = createSupabaseServerClient();
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
