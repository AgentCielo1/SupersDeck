import { createSupabaseServerClient } from "@/lib/supabase-server";

// =============================================================================
//  Server-side data for the always-on alerts UI layer (banner + overlay).
// =============================================================================
//  Loaded once in the root layout for signed-in users. RLS-gated reads → only
//  the caller's org.
//
//  It used to "fail safe" by returning empty on any read error. That is the
//  BUG-001 shape: an empty list is a legitimate answer ("nothing active") AND
//  an error signal at the same time, so a live Tier-1 emergency rendered as a
//  calm app — no banner, no overlay — on every page load. The result is now
//  discriminated: `ok: false` is a state the layout must render distinctly,
//  and it cannot be mistaken for all-clear.
//
//  The `!s` (Supabase unconfigured) path still returns an honest empty layer:
//  that is demo mode, not a failed read.
// =============================================================================

export interface BannerAlert {
  id: string;
  tier: "routine" | "urgent" | "emergency";
  title: string;
  created_at: string;
  /** null = the acknowledgement read failed; render "unavailable", never 0. */
  ackCount: number | null;
  /** null = the super head-count read failed; render "unavailable", never 0. */
  expectedSuperCount: number | null;
  ackedByMe: boolean;
}

export interface OverlayAlert {
  id: string;
  tier: "routine" | "urgent" | "emergency";
  title: string;
  message: string;
  ackedByMe: boolean;
}

export type AlertsLayerFailureKind =
  | "alerts_read_failed" // the active-alerts query itself errored
  | "unexpected"; // anything thrown on the way (network, client, migration)

export interface AlertsLayerFailure {
  kind: AlertsLayerFailureKind;
  detail: string;
}

export type AlertsLayerData =
  | { ok: true; banner: BannerAlert[]; overlay: OverlayAlert[] }
  | { ok: false; failure: AlertsLayerFailure };

/** What the super reads on the failure strip. Says what is UNKNOWN, not "fine". */
export function describeAlertsLayerFailure(f: AlertsLayerFailure): string {
  switch (f.kind) {
    case "alerts_read_failed":
      return "Active alerts could not be read from the database, so this page cannot show whether an emergency is live.";
    case "unexpected":
      return "The alerts service could not be reached, so this page cannot show whether an emergency is live.";
  }
}

export async function getAlertsLayerData(
  userId: string,
  orgId?: string | null
): Promise<AlertsLayerData> {
  const s = createSupabaseServerClient();
  // Unconfigured Supabase is demo mode, not a failed read.
  if (!s) return { ok: true, banner: [], overlay: [] };

  try {
    const { data: alerts, error } = await s
      .from("alerts")
      .select("id, tier, title, message, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[alerts-layer] active alerts read failed:", error.message);
      return {
        ok: false,
        failure: { kind: "alerts_read_failed", detail: error.message },
      };
    }
    if (!alerts || alerts.length === 0) {
      return { ok: true, banner: [], overlay: [] };
    }

    const ids = alerts.map((a: { id: string }) => a.id);
    const { data: acks, error: acksError } = await s
      .from("alert_acknowledgments")
      .select("alert_id, acknowledged_by")
      .in("alert_id", ids);

    // A failed ack read must not become "0 of N acknowledged". Keep the
    // alerts (they were read successfully — hiding them would be worse) and
    // report the counts as unknown. ackedByMe falls back to false, which
    // errs toward SHOWING the overlay and the ack button: loud, not silent.
    if (acksError) {
      console.error(
        "[alerts-layer] acknowledgement read failed:",
        acksError.message
      );
    }
    const acksOk = !acksError;
    const ackRows = (acks ?? []) as Array<{
      alert_id: string;
      acknowledged_by: string | null;
    }>;

    let superQuery = s
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super");
    if (orgId) superQuery = superQuery.eq("org_id", orgId);
    const { count: superCount, error: superError } = await superQuery;
    if (superError) {
      console.error(
        "[alerts-layer] expected-super count failed:",
        superError.message
      );
    }

    const banner: BannerAlert[] = alerts.map((a: any) => {
      const rowAcks = ackRows.filter((r) => r.alert_id === a.id);
      return {
        id: a.id,
        tier: a.tier,
        title: a.title,
        created_at: a.created_at,
        ackCount: acksOk ? rowAcks.length : null,
        expectedSuperCount: superError ? null : superCount ?? null,
        ackedByMe: acksOk && rowAcks.some((r) => r.acknowledged_by === userId),
      };
    });

    const overlay: OverlayAlert[] = alerts
      .filter((a: any) => a.tier === "emergency")
      .map((a: any) => ({
        id: a.id,
        tier: a.tier,
        title: a.title,
        message: a.message,
        ackedByMe:
          acksOk &&
          ackRows.some(
            (r) => r.alert_id === a.id && r.acknowledged_by === userId
          ),
      }))
      .filter((a: OverlayAlert) => !a.ackedByMe);

    return { ok: true, banner, overlay };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[alerts-layer] unexpected failure:", detail);
    return { ok: false, failure: { kind: "unexpected", detail } };
  }
}
