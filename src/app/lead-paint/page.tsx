import PageHeader from "@/components/PageHeader";
import XrfRowActions from "@/components/XrfRowActions";
import { db } from "@/lib/db";
import type { Building, Unit } from "@/types";

// =============================================================================
//  /lead-paint — Local Law 31 XRF inspection tracker
// =============================================================================
//  LL31 (Local Law 31 of 2020) requires every unit in a pre-1960 multifamily
//  to have an XRF lead-paint inspection by an EPA-certified inspector by
//  8/9/2025, and then again on every turnover. Failure = Class C HPD
//  violation per unit.
//
//  In-scope units for this page = units in buildings where year_built < 1960
//  OR has_known_lead = true (per LL1's lead presumption rules — anything
//  before 1960 is presumed to have lead unless tested; 1960-1978 buildings
//  trigger the same rules once lead is documented). All such units must be
//  XRF'd regardless of whether kids live there.
//
//  Sorting order — most-urgent-first:
//    1. Units with kids under 6 that have never been tested
//    2. All other never-tested units
//    3. Tested units, oldest first (re-test on turnover; aging tests get
//       review priority)
// =============================================================================

const LL31_DEADLINE = "2025-08-09";

function isInScope(b: Building): boolean {
  return (b.year_built ?? 9999) < 1960 || b.has_known_lead === true;
}

function statusOf(u: Unit): "tested" | "untested" {
  return u.lead_xrf_completed ? "tested" : "untested";
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - +new Date(iso)) / 86400000);
}

export default async function LeadPaintPage() {
  const [buildings, units] = await Promise.all([db.buildings(), db.units()]);

  const inScopeBuildings = buildings.filter(isInScope);
  const inScopeBuildingIds = new Set(inScopeBuildings.map((b) => b.id));
  const inScopeUnits = units.filter((u) => inScopeBuildingIds.has(u.building_id));

  const byBuilding = Object.fromEntries(buildings.map((b) => [b.id, b]));

  const sorted = [...inScopeUnits].sort((a, b) => {
    const sa = statusOf(a);
    const sb = statusOf(b);
    if (sa !== sb) return sa === "untested" ? -1 : 1;
    if (sa === "untested") {
      // Kids under 6 first.
      if (a.has_children_under_6 !== b.has_children_under_6) {
        return a.has_children_under_6 ? -1 : 1;
      }
      // Then by building + label for stability.
      return (
        a.building_id.localeCompare(b.building_id) ||
        a.label.localeCompare(b.label, undefined, { numeric: true })
      );
    }
    // Both tested: oldest first.
    const ad = a.lead_xrf_completed!;
    const bd = b.lead_xrf_completed!;
    return ad.localeCompare(bd);
  });

  const totals = {
    total: inScopeUnits.length,
    tested: inScopeUnits.filter((u) => u.lead_xrf_completed).length,
    untested: inScopeUnits.filter((u) => !u.lead_xrf_completed).length,
    untestedKids: inScopeUnits.filter(
      (u) => !u.lead_xrf_completed && u.has_children_under_6
    ).length,
  };

  return (
    <>
      <PageHeader
        title="Lead paint XRF (LL31)"
        subtitle={`Pre-1960 (or known-lead) buildings — every unit needs an XRF lead inspection.`}
      />

      {inScopeUnits.length === 0 ? (
        <div className="rounded-xl2 border border-ink-200 bg-white p-8 text-center text-sm text-ink-400">
          No buildings in your portfolio are LL31-in-scope (pre-1960 or
          known-lead). Flip a building's <em>Documented lead paint</em> toggle
          in its edit screen if that's wrong.
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total in-scope units" value={totals.total} />
            <Stat label="XRF'd" value={totals.tested} tone="ok" />
            <Stat
              label="Awaiting XRF"
              value={totals.untested}
              tone={totals.untested > 0 ? "warn" : "default"}
            />
            <Stat
              label="With kids <6, untested"
              value={totals.untestedKids}
              tone={totals.untestedKids > 0 ? "danger" : "default"}
            />
          </div>

          <div className="mb-4 rounded-md border border-warn-600/40 bg-warn-50 px-4 py-3 text-xs text-warn-800">
            <strong>LL31 baseline deadline:</strong> {LL31_DEADLINE}. After
            that date, every unit in scope without an XRF is exposed to a
            Class C HPD violation. Hire an EPA-certified lead inspector/risk
            assessor — see the Vendor directory under <em>Lead inspector</em>.
          </div>

          <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-3 py-2">Building</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Tenant</th>
                  <th className="px-3 py-2">Kids &lt;6</th>
                  <th className="px-3 py-2">XRF date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => {
                  const tested = !!u.lead_xrf_completed;
                  const days = tested ? daysSince(u.lead_xrf_completed!) : null;
                  const isStale = days !== null && days > 365;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-ink-100 last:border-0 hover:bg-ink-50/40"
                    >
                      <td className="px-3 py-2 text-xs text-ink-600">
                        {byBuilding[u.building_id]?.name ?? u.building_id}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-medium text-ink-900">
                        {u.label}
                      </td>
                      <td className="px-3 py-2 text-xs text-ink-600">
                        {u.tenant_name || (u.occupied ? "(occupied)" : "—")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {u.has_children_under_6 ? (
                          <span className="rounded-md border border-danger-600/40 bg-danger-50 px-1.5 py-0.5 font-medium text-danger-800">
                            YES
                          </span>
                        ) : (
                          <span className="text-ink-400">no</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-ink-600">
                        {tested
                          ? new Date(u.lead_xrf_completed!).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {!tested ? (
                          <span className="rounded-md border border-warn-600/40 bg-warn-50 px-1.5 py-0.5 font-medium text-warn-800">
                            Untested
                          </span>
                        ) : isStale ? (
                          <span className="rounded-md border border-warn-600/40 bg-warn-50 px-1.5 py-0.5 font-medium text-warn-800">
                            {days}d old
                          </span>
                        ) : (
                          <span className="rounded-md border border-ok-600/30 bg-ok-50 px-1.5 py-0.5 font-medium text-ok-800">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <XrfRowActions
                          unitId={u.id}
                          currentDate={u.lead_xrf_completed ?? null}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
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
