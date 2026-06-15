import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/db";

export default async function BuildingsPage() {
  const [buildings, units, compliance] = await Promise.all([
    db.buildings(),
    db.units(),
    db.complianceItems(),
  ]);

  return (
    <>
      <PageHeader
        title="Buildings"
        subtitle="Profiles, unit rosters, and key compliance facts per building."
        actions={
          <div className="flex gap-2">
            <Link
              href="/buildings/import"
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              ↑ Import (CSV)
            </Link>
            <Link
              href="/buildings/new"
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              + Add building
            </Link>
          </div>
        }
      />

      {buildings.length === 0 && (
        <div className="rounded-xl2 border border-brand-400/30 bg-brand-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-ink-900">Let&apos;s add your buildings</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">
            Start your portfolio in under a minute. Bulk-import your whole
            building list from a spreadsheet, or add one building by hand.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/buildings/import"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              ↑ Import buildings (CSV)
            </Link>
            <Link
              href="/buildings/new"
              className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              + Add one building
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {buildings.map((b) => {
          const bUnits = units.filter((u) => u.building_id === b.id);
          const overdue = compliance.filter(
            (c) => c.building_id === b.id && c.status === "overdue"
          ).length;
          const due = compliance.filter(
            (c) => c.building_id === b.id && c.status === "due-soon"
          ).length;

          return (
            <div
              key={b.id}
              className="rounded-xl2 border border-ink-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-ink-900">
                    {b.name}
                  </div>
                  <div className="text-sm text-ink-600">{b.address}</div>
                  <div className="mt-1 text-xs text-ink-400">
                    {b.num_units} units · {b.num_floors} floors · built{" "}
                    {b.year_built} · BIN {b.bin}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  {b.is_pact_rad && (
                    <span className="rounded-md border border-brand-400/40 bg-brand-50 px-2 py-0.5 text-brand-800">
                      PACT/RAD
                    </span>
                  )}
                  {b.has_section8 && (
                    <span className="rounded-md border border-brand-400/40 bg-brand-50 px-2 py-0.5 text-brand-800">
                      Section 8
                    </span>
                  )}
                  {b.has_sprinkler && (
                    <span className="rounded-md border border-ink-200 bg-ink-100 px-2 py-0.5 text-ink-600">
                      Sprinkler
                    </span>
                  )}
                  {b.has_cooling_tower && (
                    <span className="rounded-md border border-ink-200 bg-ink-100 px-2 py-0.5 text-ink-600">
                      Cooling tower
                    </span>
                  )}
                  {b.has_oil_heat && (
                    <span
                      className={
                        b.heat_notes
                          ? "rounded-md border border-warn-600/40 bg-warn-50 px-2 py-0.5 text-warn-800"
                          : "rounded-md border border-ink-200 bg-ink-100 px-2 py-0.5 text-ink-600"
                      }
                    >
                      Oil heat{b.heat_notes ? " (temp)" : ""}
                    </span>
                  )}
                  {b.has_known_lead && (
                    <span className="rounded-md border border-warn-600/40 bg-warn-50 px-2 py-0.5 text-warn-800">
                      Known lead
                    </span>
                  )}
                </div>
              </div>

              {b.heat_notes && (
                <div className="mt-3 rounded-md border border-warn-600/40 bg-warn-50 px-3 py-2 text-xs text-warn-800">
                  <span className="font-medium">Heat status:</span>{" "}
                  {b.heat_notes}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-ink-200 p-3">
                  <div className="text-xs text-ink-400">Compliance overdue</div>
                  <div className="text-lg font-semibold text-danger-800">
                    {overdue}
                  </div>
                </div>
                <div className="rounded-md border border-ink-200 p-3">
                  <div className="text-xs text-ink-400">Due within 30 days</div>
                  <div className="text-lg font-semibold text-warn-800">
                    {due}
                  </div>
                </div>
                <div className="rounded-md border border-ink-200 p-3">
                  <div className="text-xs text-ink-400">Units seeded</div>
                  <div className="text-lg font-semibold">{bUnits.length}</div>
                </div>
                <div className="rounded-md border border-ink-200 p-3">
                  <div className="text-xs text-ink-400">Tenant intake link</div>
                  <div className="truncate font-mono text-xs text-brand-600">
                    /intake/{b.id}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/buildings/${b.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
                >
                  ✎ Edit building
                </Link>
                <Link
                  href={`/buildings/${b.id}/units/import`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
                >
                  ↑ Import units (CSV)
                </Link>
                <Link
                  href={`/buildings/${b.id}/poster`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
                >
                  ⎙ QR poster (lobby)
                </Link>
                <Link
                  href={`/intake/${b.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
                >
                  ↗ Preview tenant intake
                </Link>
              </div>

              {bUnits.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Units ({bUnits.length})
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {bUnits.slice(0, 36).map((u) => (
                      <span
                        key={u.id}
                        className="rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs"
                      >
                        {u.label}
                        {u.is_section8 && (
                          <span className="ml-1 text-brand-800">·S8</span>
                        )}
                        {u.has_children_under_6 && (
                          <span className="ml-1 text-warn-800">·LL1</span>
                        )}
                      </span>
                    ))}
                    {bUnits.length > 36 && (
                      <span className="text-xs text-ink-400">
                        +{bUnits.length - 36} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
