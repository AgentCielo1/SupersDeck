import { NextResponse } from "next/server";
import { requireRole, ADMIN_ONLY } from "@/lib/authz";
import { deleteConnection } from "@/lib/cloud/store";

// POST /api/cloud/disconnect — remove the org connection (admin only).
// The Dropbox account itself is untouched; we just forget our tokens.
export async function POST() {
  const auth = await requireRole(ADMIN_ONLY);
  if (auth.response) return auth.response;
  await deleteConnection();
  return NextResponse.json({ ok: true });
}
