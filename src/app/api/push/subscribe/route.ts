import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { parseJson, reqStr } from "@/lib/validation";

const SubscribeSchema = z.object({
  endpoint: reqStr(1000),
  keys: z.object({
    p256dh: reqStr(500),
    auth: reqStr(500),
  }),
});

const UnsubscribeSchema = z.object({
  endpoint: reqStr(1000),
});

// =============================================================================
//  POST /api/push/subscribe — save a Web Push subscription
//  DELETE /api/push/subscribe — remove one by endpoint
// =============================================================================
//  Called by the browser after the user grants notification permission and
//  PushManager.subscribe() returns a PushSubscription. We persist the
//  endpoint + keys against the signed-in user so the server can fan out
//  notifications later (see src/lib/push.ts).
//
//  Deduplication: rows are unique on `endpoint` (see migration-phase10.sql),
//  so re-subscribing with the same browser is idempotent — upsert overwrites.
// =============================================================================

export async function POST(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const parsed = await parseJson(request, SubscribeSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const endpoint = body.endpoint;
  const p256dh = body.keys.p256dh;
  const auth = body.keys.auth;

  const row = {
    id: `push-${me.id}-${Date.now().toString(36)}`,
    user_id: me.id,
    endpoint: String(endpoint),
    p256dh: String(p256dh),
    auth: String(auth),
    user_agent: request.headers.get("user-agent") ?? null,
  };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const parsed = await parseJson(request, UnsubscribeSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const endpoint = body.endpoint;

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", String(endpoint))
    .eq("user_id", me.id);

  return NextResponse.json({ ok: true });
}
