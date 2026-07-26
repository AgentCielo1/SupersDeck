import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import type { AlertTier } from "@/lib/alerts";
import AlertsList, { type AlertListRow } from "./AlertsList";

// Always reflect the latest sends — never serve a stale alert history.
export const dynamic = "force-dynamic";

interface AlertDbRow {
  id: string;
  tier: AlertTier;
  title: string;
  status: "active" | "resolved";
  created_at: string;
  resolved_at: string | null;
  channels: string[] | null;
  building_ids: string[] | null;
}

export default async function AlertsPage() {
  const supabase = createSupabaseServerClient();
  const buildings = await db.buildings();
  const nameById = new Map(buildings.map((b) => [b.id, b.name]));

  const newAlertLink = (
    <Link
      href="/alerts/new"
      className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
    >
      New alert
    </Link>
  );

  if (!supabase) {
    return (
      <>
        <PageHeader
          title="Alerts"
          subtitle="Tiered emergency notifications."
          actions={newAlertLink}
        />
        <EmptyState
          title="Alerts unavailable"
          message="Connect a database to send and review alerts."
        />
      </>
    );
  }

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: alertData } = await supabase
    .from("alerts")
    .select(
      "id, tier, title, status, created_at, resolved_at, channels, building_ids"
    )
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false });

  const alerts = (alertData ?? []) as AlertDbRow[];

  // Ack counts per alert (one extra query, then tally client-side).
  const ackCountByAlert = new Map<string, number>();
  if (alerts.length > 0) {
    const { data: ackData } = await supabase
      .from("alert_acknowledgments")
      .select("alert_id")
      .in(
        "alert_id",
        alerts.map((a) => a.id)
      );
    for (const row of (ackData ?? []) as Array<{ alert_id: string }>) {
      ackCountByAlert.set(
        row.alert_id,
        (ackCountByAlert.get(row.alert_id) ?? 0) + 1
      );
    }
  }

  const rows: AlertListRow[] = alerts.map((a) => {
    const building_ids = a.building_ids ?? [];
    return {
      id: a.id,
      tier: a.tier,
      title: a.title,
      status: a.status,
      created_at: a.created_at,
      resolved_at: a.resolved_at,
      channels: a.channels ?? [],
      building_ids,
      buildingNames: building_ids.map((id) => nameById.get(id) ?? id),
      ackCount: ackCountByAlert.get(a.id) ?? 0,
    };
  });

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Tiered emergency notifications — last 30 days."
        actions={newAlertLink}
      />
      <AlertsList rows={rows} />
    </>
  );
}
