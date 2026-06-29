import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { previewRecipients, TIERS, type AlertTier } from "@/lib/alerts";

// =============================================================================
//  POST /api/alerts/preview — "This will notify X residents and Y staff"
// =============================================================================
//  Auth: management. Computes recipient counts + channels for the composer
//  preview panel WITHOUT sending anything.
// =============================================================================

export const dynamic = "force-dynamic";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const MANAGEMENT = new Set(["admin", "super", "manager"]);

export async function POST(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!MANAGEMENT.has(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = String(body.tier ?? "") as AlertTier;
  if (!TIERS[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  const building_ids = Array.isArray(body.building_ids)
    ? (body.building_ids as unknown[]).map((b) => String(b))
    : [];
  const unit_ids = Array.isArray(body.unit_ids)
    ? (body.unit_ids as unknown[]).map((u) => String(u))
    : null;

  const preview = await previewRecipients({
    orgId: me.org_id ?? DEFAULT_ORG_ID,
    tier,
    buildingIds: building_ids,
    unitIds: unit_ids,
  });

  return NextResponse.json(preview);
}
