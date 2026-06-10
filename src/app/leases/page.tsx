import PageHeader from "@/components/PageHeader";
import LeaseRowActions from "@/components/LeaseRowActions";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Building, Unit } from "@/types";

// =============================================================================
//  /leases — lease renewals + Temporary CO expirations
// =============================================================================
//  Two adjacent renewal triggers in one place:
//
//    1. Units whose lease_end is within 90 days → upcoming renewals. Sorted
//       by date so the soonest expirations are at the top.
//    2. Buildings whose co_expires_at is within 60 days → TCO renewals.
//       Leaving these to lapse means a DOB stop-work or worse.
//
//  Editing happens in-place via LeaseRowActions (PATCH /api/units/:id).
//  Set CO data via /buildings → Edit → Certificate of Occupancy.
// =============================================================================

const LEASE_WINDOW_DAYS = 90;
const TCO_WINDOW_DAYS = 60;

const RENT_STATUS_LABELS: Record<string, string> = {
  stabilized: "Rent stabilized",
  controlled: "Rent controlled",
  market: "Market rate",
  section8: "Section 8",
  pact: "PACT/RAD",
};

function daysUntil(iso: string): number {
  return Math.floor((+new Date(iso) - Date.now()) / 86400000);
}

export default async function LeasesPage() {
  const [buildings, units] = await Promise.all([db.buildings(), db.units()]);
  const buildingsById: Record<string, Building> = Object.fromEntries(
    buildings.map((b) => [b.id, b])
  );

  // Lease renewals — sorted by lease_end (soonest first), nulls last.
  const unitsWithLease: Unit[] = [...units].filter(
    (u) => u.lease_end || u.lease_start || u.rent_status
  );
  unitsWithLease.sort((a, b) => {
    const ae = a.lease_end ? +new Date(a.lease_end) : Infinity;
    const be = b.lease_end ? +new Date(b.lease_end) : Infinity;
    return ae - be;
  });

  const renewalsSoon = unitsWithLease.filter((u) => {
    if (!u.lease_end) return false;
    const days = daysUntil(u.lease_end);
    return days <= LEASE_WINDOW_DAYS;
  });

  // TCO renewals on buildings.
  const tcoSoon: Building[] = buildings.filter((b) => {
    if (!b.co_expires_at) return false;
    const days = daysUntil(b.co_expires_at);
    return days <= TCO_WINDOW_DAYS;
  });

  return (
    <>
      <PageHeader
        title="Leases & CO"
        subtitle="Lease renewals and Temporary Certificate of Occupancy expirations. Edit dates in-line."
      />

      {/* TCO alerts (rare but high-stakes) */}
      {tcoSoon.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-900">
            Temporary CO expiring soon
          </h2>
          <div className="space-y-2">
            {tcoSoon.map((b) => {
              const days = daysUntil(b.co_expires_at!);
              return (
                <div
                  key={b.id}
                  className={`flex items-center justify-between rounded-xl2 border px-4 py-3 ${
                    days < 0
                      ? "border-danger-600/40 bg-danger-50 text-danger-800"
                      : days < 30
                      ? "border-warn-600/40 bg-warn-50 text-warn-800"
                      : "border-ink-200 bg-white text-ink-900"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{b.name}</div>
                    <div className="text-xs opacity-80">
                      CO #{b.co_number ?? "—"} · expires{" "}
                      {new Date(b.co_expires_at!).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Units with lease tracked" value={unitsWithLease.length} />
        <Stat
          label="Renewals (≤90d)"
          value={renewalsSoon.length}
          tone={renewalsSoon.length > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Renewals (≤30d)"
          value={
            renewalsSoon.filter(
              (u) => daysUntil(u.lease_end!) <= 30 && daysUntil(u.lease_end!) >= 0
            ).length
          }
          tone={
            renewalsSoon.filter(
              (u) => daysUntil(u.lease_end!) <= 30 && daysUntil(u.lease_end!) >= 0
            ).length > 0
              ? "warn"
              : "ok"
          }
        />
        <Stat
          label="Overdue (lapsed)"
          value={
            unitsWithLease.filter(
              (u) => u.lease_end && daysUntil(u.lease_end) < 0
            ).length
          }
          tone={
            unitsWithLease.some(
              (u) => u.lease_end && daysUntil(u.lease_end) < 0
            )
              ? "danger"
              : "ok"
          }
        />
      </div>

      {/* Main table */}
      <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2">Building</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Lease term</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-ink-400">
                  No units yet. Import via /buildings → unit import.
                </td>
              </tr>
            )}
            {units.map((u) => {
              const tracked = !!(u.lease_end || u.lease_start || u.rent_status);
              const days =
                u.lease_end != null ? daysUntil(u.lease_end) : null;
              return (
                <tr
                  key={u.id}
                  className="border-b border-ink-100 align-top last:border-0 hover:bg-ink-50/40"
                >
                  <td className="px-3 py-2 text-xs text-ink-600">
                    {buildingsById[u.building_id]?.name ?? u.building_id}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-medium text-ink-900">
                    {u.label}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-600">
                    {u.tenant_name || (u.occupied ? "(occupied)" : "—")}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-600">
                    {u.lease_start || u.lease_end ? (
                      <>
                        {u.lease_start
                          ? new Date(u.lease_start).toLocaleDateString()
                          : "—"}
                        {" → "}
                        {u.lease_end
                          ? new Date(u.lease_end).toLocaleDateString()
                          : "—"}
                      </>
                    ) : tracked ? (
                      <span className="text-ink-400">—</span>
                    ) : (
                      <span className="text-ink-300">untracked</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {days === null ? (
                      <span className="text-ink-400">—</span>
                    ) : days < 0 ? (
                      <span className="rounded-md border border-danger-600/40 bg-danger-50 px-1.5 py-0.5 font-medium text-danger-800">
                        {Math.abs(days)}d overdue
                      </span>
                    ) : days <= 30 ? (
                      <span className="rounded-md border border-warn-600/40 bg-warn-50 px-1.5 py-0.5 font-medium text-warn-800">
                        {days}d left
                      </span>
                    ) : days <= 90 ? (
                      <span className="rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-ink-600">
                        {days}d left
                      </span>
                    ) : (
                      <span className="text-ink-400">{days}d left</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-600">
                    {u.rent_status
                      ? RENT_STATUS_LABELS[u.rent_status] ?? u.rent_status
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <LeaseRowActions
                      unitId={u.id}
                      leaseStart={u.lease_start ?? null}
                      leaseEnd={u.lease_end ?? null}
                      rentStatus={u.rent_status ?? null}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-400">
        For rent-stabilized units, NYC requires the owner to offer renewal
        leases 90–150 days before expiration. Add CO data per building under{" "}
        <Link href="/buildings" className="underline hover:text-ink-900">
          /buildings → Edit → Certificate of Occupancy
        </Link>
        .
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "ok" | "warn" | "danger";
}) {
  const cls =
    tone === "ok"
      ? "border-ok-600/30 bg-ok-50 text-ok-800"
      : tone === "warn"
      ? "border-warn-600/40 bg-warn-50 text-warn-800"
      : tone === "danger"
      ? "border-danger-600/40 bg-danger-50 text-danger-800"
      : "border-ink-200 bg-white text-ink-900";
  return (
    <div className={`rounded-xl2 border px-4 py-3 ${cls}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold">{value}</div>
    </div>
  );
}
