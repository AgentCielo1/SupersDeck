import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ComplianceRow from "@/components/ComplianceRow";
import WorkOrderCard from "@/components/WorkOrderCard";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const [buildings, compliance, workOrders] = await Promise.all([
    db.buildings(),
    db.complianceItems(),
    db.workOrders(),
  ]);
  const buildingById = Object.fromEntries(buildings.map((b) => [b.id, b]));

  const overdue = compliance.filter((c) => c.status === "overdue");
  const dueSoon = compliance.filter((c) => c.status === "due-soon");
  const upcoming = [...overdue, ...dueSoon]
    .sort((a, b) => {
      // next_due is required for these statuses but TS still wants the guard.
      const ad = a.next_due ? +new Date(a.next_due) : Infinity;
      const bd = b.next_due ? +new Date(b.next_due) : Infinity;
      return ad - bd;
    })
    .slice(0, 8);

  const openWO = workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled");
  const emergencyWO = openWO.filter((w) => w.priority === "emergency");
  const hpdRiskWO = openWO.filter((w) => w.hpd_risk);

  const totalUnits = buildings.reduce((s, b) => s + b.num_units, 0);

  return (
    <>
      <PageHeader
        title="Good morning"
        subtitle="Here's what needs your attention today."
        actions={
          <>
            <Link
              href="/alerts/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-danger-600 px-3 py-2 text-sm font-semibold text-white hover:bg-danger-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              New alert
            </Link>
            <Link
              href="/work-orders/new"
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              New work order
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Buildings"
          value={buildings.length}
          hint={`${totalUnits} total units`}
        />
        <StatCard
          label="Open work orders"
          value={openWO.length}
          hint={`${emergencyWO.length} emergency · ${hpdRiskWO.length} HPD risk`}
          tone={emergencyWO.length > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Compliance overdue"
          value={overdue.length}
          tone={overdue.length > 0 ? "danger" : "ok"}
        />
        <StatCard
          label="Due within 30 days"
          value={dueSoon.length}
          tone={dueSoon.length > 0 ? "warn" : "default"}
        />
      </div>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl2 border border-ink-200 bg-white">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <h2 className="text-base font-semibold">Compliance — needs attention</h2>
            <Link className="text-xs text-brand-600 hover:underline" href="/compliance">
              View all →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-6 text-sm text-ink-400">
              Nothing overdue or due in the next 30 days. Nice.
            </div>
          ) : (
            <div>
              {upcoming.map((item) => (
                <ComplianceRow
                  key={item.id}
                  item={item}
                  buildingName={buildingById[item.building_id]?.name ?? ""}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Open work orders</h2>
            <Link className="text-xs text-brand-600 hover:underline" href="/work-orders">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {openWO.slice(0, 5).map((wo) => (
              <WorkOrderCard key={wo.id} wo={wo} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
