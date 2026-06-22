import { NextResponse } from "next/server";
import { pushToUsers } from "@/lib/push";
import { getCurrentUserProfile } from "@/lib/supabase-server";

// =============================================================================
//  GET /api/push/test  — sends a test push to the current signed-in user
// =============================================================================
//  Use after enabling notifications to confirm the round-trip works. Returns
//  JSON with how many subscriptions got the message.
// =============================================================================

export async function GET() {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const result = await pushToUsers([me.id], {
    title: "BoroDesk test",
    body: "Push notifications are working. You'll get pings like this for new work orders.",
    url: "/",
    tag: "supersdeck-test",
  });
  return NextResponse.json(result);
}
