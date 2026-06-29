import { createSupabaseServerClient } from "@/lib/supabase-server";

// =============================================================================
//  Server-side data for the always-on alerts UI layer (banner + overlay).
// =============================================================================
//  Loaded once in the root layout for signed-in users. RLS-gated reads → only
//  the caller's org. Fails safe (returns empty) so a missing migration or a
//  read error never blocks the app shell.
// =============================================================================

export interface BannerAlert {
  id: string;
  tier: "routine" | "urgent" | "emergency";
  title: string;
  created_at: string;
  ackCount: number;
  expectedSuperCount: number;
  ackedByMe: boolean;
}

export interface OverlayAlert {
  id: string;
  tier: "routine" | "urgent" | "emergency";
  title: string;
  message: string;
  ackedByMe: boolean;
}

export interface AlertsLayerData {
  banner: BannerAlert[];
  overlay: OverlayAlert[];
}

export async function getAlertsLayerData(
  userId: string,
  orgId?: string | null
): Promise<AlertsLayerData> {
  const empty: AlertsLayerData = { banner: [], overlay: [] };
  const s = createSupabaseServerClient();
  if (!s) return empty;

  try {
    const { data: alerts, error } = await s
      .from("alerts")
      .select("id, tier, title, message, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error || !alerts || alerts.length === 0) return empty;

    const ids = alerts.map((a: { id: string }) => a.id);
    const { data: acks } = await s
      .from("alert_acknowledgments")
      .select("alert_id, acknowledged_by")
      .in("alert_id", ids);

    const ackRows = (acks ?? []) as Array<{
      alert_id: string;
      acknowledged_by: string | null;
    }>;

    let superQuery = s
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super");
    if (orgId) superQuery = superQuery.eq("org_id", orgId);
    const { count: superCount } = await superQuery;

    const banner: BannerAlert[] = alerts.map((a: any) => {
      const rowAcks = ackRows.filter((r) => r.alert_id === a.id);
      return {
        id: a.id,
        tier: a.tier,
        title: a.title,
        created_at: a.created_at,
        ackCount: rowAcks.length,
        expectedSuperCount: superCount ?? 0,
        ackedByMe: rowAcks.some((r) => r.acknowledged_by === userId),
      };
    });

    const overlay: OverlayAlert[] = alerts
      .filter((a: any) => a.tier === "emergency")
      .map((a: any) => ({
        id: a.id,
        tier: a.tier,
        title: a.title,
        message: a.message,
        ackedByMe: ackRows.some(
          (r) => r.alert_id === a.id && r.acknowledged_by === userId
        ),
      }))
      .filter((a: OverlayAlert) => !a.ackedByMe);

    return { banner, overlay };
  } catch {
    return empty;
  }
}
