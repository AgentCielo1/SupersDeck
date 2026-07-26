import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import AlertAckButton from "@/components/AlertAckButton";
import AlertResolveButton from "@/components/AlertResolveButton";
import { createSupabaseServerClient, getCurrentUserProfile } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { TIERS, type AlertTier } from "@/lib/alerts";
import { TIER_BADGE, tierLabel, channelsLabel } from "@/lib/alert-ui";
import { relativeTime, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = new Set(["admin", "super", "manager"]);

interface AlertDetailRow {
  id: string;
  tier: AlertTier;
  title: string;
  message: string;
  status: "active" | "resolved";
  created_at: string;
  resolved_at: string | null;
  channels: string[] | null;
  building_ids: string[] | null;
  unit_ids: string[] | null;
  recipient_staff_count: number | null;
  recipient_resident_count: number | null;
}

interface AckRow {
  acknowledged_by: string;
  acknowledged_at: string;
  note: string | null;
}

export default async function AlertDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ack?: string };
}) {
  const supabase = createSupabaseServerClient();
  if (!supabase) notFound();

  const [profile, buildings] = await Promise.all([
    getCurrentUserProfile(),
    db.buildings(),
  ]);
  const nameById = new Map(buildings.map((b) => [b.id, b.name]));

  const { data: alertData } = await supabase
    .from("alerts")
    .select(
      "id, tier, title, message, status, created_at, resolved_at, channels, building_ids, unit_ids, recipient_staff_count, recipient_resident_count"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!alertData) notFound();
  const alert = alertData as AlertDetailRow;
  const cfg = TIERS[alert.tier];

  // Acknowledgments + the names of who acked (two-step: no FK join via RLS).
  const { data: ackData } = await supabase
    .from("alert_acknowledgments")
    .select("acknowledged_by, acknowledged_at, note")
    .eq("alert_id", alert.id)
    .order("acknowledged_at", { ascending: true });
  const acks = (ackData ?? []) as AckRow[];

  const ackerNames = new Map<string, string>();
  if (acks.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in(
        "id",
        acks.map((a) => a.acknowledged_by)
      );
    for (const p of (profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>) {
      ackerNames.set(p.id, p.full_name || p.email || "Unknown");
    }
  }

  const ackedByMe = profile
    ? acks.some((a) => a.acknowledged_by === profile.id)
    : false;
  const canManage = profile ? MANAGER_ROLES.has(profile.role) : false;
  const buildingNames = (alert.building_ids ?? []).map(
    (id) => nameById.get(id) ?? id
  );
  const staffCount = alert.recipient_staff_count ?? 0;
  const residentCount = alert.recipient_resident_count ?? 0;
  const deepLinkAck = searchParams.ack === "1";

  return (
    <>
      <div className="mb-3">
        <Link href="/alerts" className="text-sm text-brand-600 hover:underline">
          ← Back to alerts
        </Link>
      </div>
      <PageHeader
        title="Alert"
        actions={
          alert.status === "active" && canManage ? (
            <AlertResolveButton alertId={alert.id} />
          ) : undefined
        }
      />

      <div className="space-y-4">
        <div className="rounded-xl2 border border-ink-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                "rounded-md border px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide",
                TIER_BADGE[alert.tier]
              )}
            >
              {tierLabel(alert.tier)}
            </span>
            {alert.status === "resolved" ? (
              <span className="rounded-md border border-ok-600/30 bg-ok-50 px-1.5 py-0.5 text-xs font-medium text-ok-800">
                Resolved
                {alert.resolved_at && ` · ${relativeTime(alert.resolved_at)}`}
              </span>
            ) : (
              <span className="rounded-md border border-ink-200 bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-600">
                Active
              </span>
            )}
          </div>

          <h2 className="mt-3 text-xl font-semibold text-ink-900">
            {alert.title}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600">
            {alert.message}
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-ink-200 pt-4 text-sm sm:grid-cols-2">
            <Meta label="Buildings">
              {buildingNames.length > 0 ? buildingNames.join(", ") : "—"}
            </Meta>
            <Meta label="Channels fired">{channelsLabel(alert.channels ?? [])}</Meta>
            <Meta label="Recipients">
              Notified ~{residentCount} resident
              {residentCount === 1 ? "" : "s"} and {staffCount} staff
            </Meta>
            <Meta label="Sent">
              <span title={shortDate(alert.created_at)}>
                {relativeTime(alert.created_at)}
              </span>
            </Meta>
          </dl>
        </div>

        {/* Acknowledge — only when the tier requires it and the user hasn't yet */}
        {cfg.requiresAck && alert.status === "active" && !ackedByMe && (
          <div
            id="acknowledge"
            className={clsx(
              "rounded-xl2 border p-4",
              deepLinkAck
                ? "border-warn-600/60 bg-warn-50 ring-2 ring-warn-50"
                : "border-ink-200 bg-white"
            )}
          >
            <div className="text-sm font-semibold text-ink-900">
              This alert needs your acknowledgment
            </div>
            <p className="mt-1 mb-3 text-sm text-ink-600">
              Confirm you&apos;ve seen it and are responding.
            </p>
            <AlertAckButton alertId={alert.id} defaultOpen={deepLinkAck} />
          </div>
        )}

        <div className="rounded-xl2 border border-ink-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink-900">
            Acknowledgments
            <span className="ml-2 font-normal text-ink-400">
              {acks.length} total
            </span>
          </h3>
          {acks.length === 0 ? (
            <p className="mt-2 text-sm text-ink-400">No one has acknowledged yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {acks.map((a, i) => (
                <li
                  key={`${a.acknowledged_by}-${i}`}
                  className="flex flex-wrap items-start justify-between gap-2 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-ink-900">
                      {ackerNames.get(a.acknowledged_by) ?? "Unknown"}
                    </div>
                    {a.note && (
                      <div className="mt-0.5 text-sm text-ink-600">{a.note}</div>
                    )}
                  </div>
                  <span
                    className="text-xs text-ink-400"
                    title={shortDate(a.acknowledged_at)}
                  >
                    {relativeTime(a.acknowledged_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-ink-900">{children}</dd>
    </div>
  );
}
