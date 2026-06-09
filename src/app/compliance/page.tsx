import PageHeader from "@/components/PageHeader";
import ComplianceRow from "@/components/ComplianceRow";
import StatCard from "@/components/StatCard";
import { db } from "@/lib/db";
import { complianceTemplateById } from "@/data/compliance-templates";

// Items without a date (anniversary rules with no last_completed) sort last.
function dueSort(a: { next_due?: string }, b: { next_due?: string }): number {
  if (!a.next_due && !b.next_due) return 0;
  if (!a.next_due) return 1;
  if (!b.next_due) return -1;
  return +new Date(a.next_due) - +new Date(b.next_due);
}

export default async function CompliancePage() {
  const [buildings, items] = await Promise.all([
    db.buildings(),
    db.complianceItems(),
  ]);
  const buildingById = Object.fromEntries(buildings.map((b) => [b.id, b]));

  const overdue = items.filter((c) => c.status === "overdue");
  const dueSoon = items.filter((c) => c.status === "due-soon");
  const inProgress = items.filter((c) => c.status === "in-progress");
  const ok = items.filter((c) => c.status === "ok");
  const needsScheduling = items.filter((c) => c.status === "needs-scheduling");

  // group by category for the lower section
  const byCategory: Record<string, typeof items> = {};
  items.forEach((i) => {
    const t = complianceTemplateById(i.template_id);
    if (!t) return;
    byCategory[t.category] ??= [];
    byCategory[t.category].push(i);
  });

  const categories = Object.keys(byCategory).sort();

  return (
    <>
      <PageHeader
        title="Compliance"
        subtitle={`Every recurring inspection, filing, and certification across ${buildings.length} buildings.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total items tracked" value={items.length} />
        <StatCard
          label="Overdue"
          value={overdue.length}
          tone={overdue.length > 0 ? "danger" : "ok"}
        />
        <StatCard
          label="Due within 30 days"
          value={dueSoon.length}
          tone={dueSoon.length > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Need scheduling"
          value={needsScheduling.length}
          hint="Anniversary items missing a last-completed date"
        />
      </div>

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <section className="mt-8 rounded-xl2 border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-4 py-3">
            <h2 className="text-base font-semibold">Needs attention</h2>
            <p className="text-xs text-ink-400">
              Overdue first, then upcoming in chronological order.
            </p>
          </div>
          {[...overdue, ...dueSoon].sort(dueSort).map((item) => (
            <ComplianceRow
              key={item.id}
              item={item}
              buildingName={buildingById[item.building_id]?.name ?? ""}
            />
          ))}
        </section>
      )}

      {needsScheduling.length > 0 && (
        <section className="mt-8 rounded-xl2 border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-4 py-3">
            <h2 className="text-base font-semibold">Needs scheduling</h2>
            <p className="text-xs text-ink-400">
              Anniversary-based items (annual boiler, 5-yr elevator, etc.) need
              you to enter the last-completed date so the next deadline can be
              computed. They won't count as overdue until you do.
            </p>
          </div>
          {needsScheduling.map((item) => (
            <ComplianceRow
              key={item.id}
              item={item}
              buildingName={buildingById[item.building_id]?.name ?? ""}
            />
          ))}
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="mt-8 rounded-xl2 border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-4 py-3">
            <h2 className="text-base font-semibold">In progress</h2>
            <p className="text-xs text-ink-400">
              Currently active (heat-season log, etc.).
            </p>
          </div>
          {inProgress.map((item) => (
            <ComplianceRow
              key={item.id}
              item={item}
              buildingName={buildingById[item.building_id]?.name ?? ""}
            />
          ))}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold">By category</h2>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div
              key={cat}
              className="rounded-xl2 border border-ink-200 bg-white"
            >
              <div className="border-b border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600">
                {cat} ({byCategory[cat].length})
              </div>
              {byCategory[cat].sort(dueSort).map((item) => (
                <ComplianceRow
                  key={item.id}
                  item={item}
                  buildingName={buildingById[item.building_id]?.name ?? ""}
                />
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
