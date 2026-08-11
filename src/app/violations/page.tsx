import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import RefreshViolationsButton from "@/components/RefreshViolationsButton";
import { db } from "@/lib/db";
import {
  lookupHpdViolationsForBuildings,
  cureDeadline,
  describeHpdFailure,
  violationsOrEmpty,
  type HpdLookupResult,
} from "@/lib/hpd";

export const dynamic = "force-dynamic";

// Class A = 90d cure, B = 30d, C = 24h, I = none
const classStyles: Record<string, string> = {
  A: "bg-warn-50 text-warn-800 border-warn-600/40",
  B: "bg-warn-50 text-warn-800 border-warn-600/40",
  C: "bg-danger-50 text-danger-800 border-danger-600/40",
  I: "bg-ink-100 text-ink-600 border-ink-200",
};

export default async function ViolationsPage() {
  const buildings = await db.buildings();
  // Per-building results. A failure for one building never blanks the others,
  // and "we couldn't check" is never rendered as "no violations".
  const perBuilding: Record<string, HpdLookupResult> =
    await lookupHpdViolationsForBuildings(buildings, { openOnly: true });

  const failed = buildings.filter((b) => perBuilding[b.id]?.ok === false);
  const checked = buildings.length - failed.length;
  const incomplete = failed.length > 0;

  const all = Object.values(perBuilding).flatMap((r) => (r.ok ? r.violations : []));
  const byClass = (cls: string) => all.filter((v) => v.violationclass === cls).length;
  const overdue = all.filter((v) => {
    const d = cureDeadline(v).days;
    return d !== null && d < 0;
  });

  // When any building failed to check, every count below is a FLOOR, not a
  // total. Suffix it so a zero can never be read as an all-clear.
  const count = (n: number) => (incomplete ? `${n}+` : String(n));

  return (
    <>
      <PageHeader
        title="HPD violations"
        subtitle="Live from NYC Open Data (data.cityofnewyork.us · wvxf-dwi5). Auto-syncs daily at 07:15 ET via Vercel Cron; refresh manually below to pull right now."
        actions={<RefreshViolationsButton />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open violations" value={count(all.length)} />
        <StatCard label="Class C (24h)" value={count(byClass("C"))} tone={byClass("C") > 0 ? "danger" : "default"} />
        <StatCard label="Class B (30d)" value={count(byClass("B"))} tone={byClass("B") > 0 ? "warn" : "default"} />
        <StatCard
          label="Past cure deadline"
          value={count(overdue.length)}
          // Never show the reassuring "ok" tone on an incomplete check.
          tone={overdue.length > 0 ? "danger" : incomplete ? "warn" : "ok"}
        />
      </div>

      {incomplete && (
        <div className="mt-4 rounded-md border border-warn-600/40 bg-warn-50 p-3 text-sm text-warn-800">
          <strong>Incomplete check — these numbers are a minimum, not a total.</strong>{" "}
          We checked {checked} of {buildings.length} buildings.{" "}
          {failed.length === 1 ? "One building" : `${failed.length} buildings`} could
          not be checked against HPD, so violations there are unknown — not zero.
          See the per-building notes below. The lookup runs again on next page load.
        </div>
      )}

      {buildings.map((b) => {
        const result = perBuilding[b.id];
        const vs = violationsOrEmpty(result);
        return (
          <section key={b.id} className="mt-8 rounded-xl2 border border-ink-200 bg-white">
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">{b.name}</h2>
                <p className="text-xs text-ink-400">{b.address}</p>
              </div>
              <a
                href={`https://hpdonline.hpdnyc.org/HPDonline/select_application.aspx`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-600 hover:underline"
              >
                Open in HPD Online ↗
              </a>
            </div>
            {result && !result.ok ? (
              // STATE 1: we could NOT check. Never render this as "clean".
              <div className="m-4 rounded-md border border-warn-600/40 bg-warn-50 p-4 text-sm text-warn-800">
                <p className="font-semibold">Not checked — status unknown.</p>
                <p className="mt-1 text-xs leading-relaxed">
                  {describeHpdFailure(result.failure)} This building may or may
                  not have open violations; we have no data either way. Check
                  HPD Online directly using the link above.
                  {result.failure.kind === "unparsable_address" && (
                    <>
                      {" "}
                      Fix by correcting the building address, or the
                      normalization in <code>src/lib/hpd.ts</code>.
                    </>
                  )}
                </p>
              </div>
            ) : vs.length === 0 ? (
              // STATE 2: we checked, and it really is clean.
              <div className="p-6 text-sm text-ink-400">
                Checked against HPD — no open violations found at this address.
              </div>
            ) : (
              // STATE 3: we checked, and there are violations.
              <div className="max-h-[480px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Class</th>
                      <th className="px-3 py-2 text-left">Issued</th>
                      <th className="px-3 py-2 text-left">Cure</th>
                      <th className="px-3 py-2 text-left">Apt</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vs.map((v) => {
                      const due = cureDeadline(v);
                      return (
                        <tr key={v.violationid} className="border-t border-ink-100 align-top">
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                                classStyles[v.violationclass ?? "I"]
                              }`}
                            >
                              {v.violationclass ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {v.novissueddate
                              ? new Date(v.novissueddate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span
                              className={
                                due.days !== null && due.days < 0
                                  ? "text-danger-800 font-semibold"
                                  : ""
                              }
                            >
                              {due.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">{v.apartment ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">{v.currentstatus ?? "—"}</td>
                          <td className="px-3 py-2 text-xs leading-relaxed">
                            {v.novdescription ?? ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      <div className="mt-8 rounded-xl2 border border-ink-200 bg-white p-4 text-sm text-ink-600">
        <h2 className="text-sm font-semibold text-ink-900">How sync works</h2>
        <p className="mt-1 text-xs text-ink-400">
          Pulls come from the NYC Open Data <code>wvxf-dwi5</code> dataset
          (free, no auth). Daily cron runs at 07:15 ET via Vercel Cron and
          upserts rows into a private <code>violations</code> table — the
          first time a Class C lands, you'll see it on the morning dashboard
          marked "NEW". Use the refresh button above to pull right now
          without waiting for the cron.
        </p>
      </div>
    </>
  );
}
