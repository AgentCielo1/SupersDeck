import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getConnection } from "@/lib/cloud/store";

// GET /api/cloud/status — is a cloud drive connected? (any signed-in staff)
// Never returns tokens; just enough for the UI to render connect/browse state.
export async function GET() {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const conn = await getConnection();
  if (!conn) {
    // isAdmin matters MOST here — it gates the Connect button.
    return NextResponse.json({ connected: false, isAdmin: me.role === "admin" });
  }
  return NextResponse.json({
    connected: true,
    provider: conn.provider,
    account_email: conn.account_email,
    account_name: conn.account_name,
    isAdmin: me.role === "admin",
  });
}
