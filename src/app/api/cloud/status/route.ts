import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getConnection } from "@/lib/cloud/store";
import { CLOUD_ACCESS, type Role } from "@/lib/authz";

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
  // Whether a drive is connected is harmless. WHOSE drive it is — the owner's
  // personal Dropbox address — is not, and roles that can't browse the drive
  // have no use for it. See CLOUD_ACCESS in src/lib/authz.ts.
  const canBrowse = CLOUD_ACCESS.includes(me.role as Role);
  return NextResponse.json({
    connected: true,
    provider: conn.provider,
    account_email: canBrowse ? conn.account_email : null,
    account_name: canBrowse ? conn.account_name : null,
    canBrowse,
    isAdmin: me.role === "admin",
  });
}
