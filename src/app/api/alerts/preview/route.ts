import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { previewRecipients } from "@/lib/alerts";
import { parseJson } from "@/lib/validation";
import { AlertTargetingSchema } from "@/lib/alert-schemas";

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

  // Same schema as POST /api/alerts, so the preview panel can never describe a
  // different audience from the one the send would actually reach.
  const parsed = await parseJson(request, AlertTargetingSchema);
  if (parsed.response) return parsed.response;
  const { tier, building_ids } = parsed.data;
  const unit_ids = parsed.data.unit_ids ?? null;

  const preview = await previewRecipients({
    orgId: me.org_id ?? DEFAULT_ORG_ID,
    tier,
    buildingIds: building_ids,
    unitIds: unit_ids,
  });

  return NextResponse.json(preview);
}
