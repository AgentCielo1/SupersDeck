import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import RefreshViolationsButton from "@/components/RefreshViolationsButton";
import { db, type EcbRow } from "@/lib/db";
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
  // OATH/ECB summonses come from the synced table (the refresh cron/button
  // fills it) — same honesty: a load error is shown, never painted as clean.
  const [ecbResult, ecbSync] = await Promise.all([
    db.ecbViolations(),
    db.ecbSync(),
  ]);

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
        title="Violations"
        subtitle="HPD housing-maintenance violations plus OATH/ECB summonses (DEP · DOB · FDNY · DSNY · DOHMH), live from NYC Open Data. Auto-syncs daily at 07:15 ET; refresh manually to pull right now."
        actions={<RefreshViolationsButton />}
      />

      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
        HPD · housing maintenance
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
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

      <EcbSection buildings={buildings} ecbResult={ecbResult} ecbSync={ecbSync} />

      <div className="mt-8 rounded-xl2 border border-ink-200 bg-white p-4 text-sm text-ink-600">
        <h2 className="text-sm font-semibold text-ink-900">How sync works</h2>
        <p className="mt-1 text-xs text-ink-400">
          HPD rows come from the NYC Open Data <code>wvxf-dwi5</code> dataset
          (per-building address lookup); OATH/ECB summonses come from{" "}
          <code>jz4z-kudi</code>, queried once for the campus tax lot (all
          three buildings share BBL 4021590002) and attributed to buildings by
          house number. Both are free, no auth. The daily 07:15 ET Vercel cron
          upserts into private <code>violations</code> /{" "}
          <code>ecb_violations</code> tables — the first time a Class C or a
          new summons lands, it shows in the morning digest. Use the refresh
          button above to pull right now without waiting for the cron.
        </p>
      </div>
    </>
  );
}

// =============================================================================
//  OATH/ECB section — DEP, DOB, FDNY, DSNY, DOHMH summonses on the campus lot
// =============================================================================
function EcbSection({
  buildings,
  ecbResult,
  ecbSync,
}: {
  buildings: Awaited<ReturnType<typeof db.buildings>>;
  ecbResult: Awaited<ReturnType<typeof db.ecbViolations>>;
  ecbSync: Awaited<ReturnType<typeof db.ecbSync>>;
}) {
  const money = (n: number | null) =>
    n == null
      ? "—"
      : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (!ecbResult.ok) {
    // We could not read the table — status unknown, never "clean".
    return (
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          OATH / ECB · DEP, DOB, FDNY &amp; other agencies
        </h2>
        <div className="mt-2 rounded-md border border-warn-600/40 bg-warn-50 p-4 text-sm text-warn-800">
          <p className="font-semibold">ECB status unknown — couldn&apos;t load.</p>
          <p className="mt-1 text-xs leading-relaxed">
            {ecbResult.detail}. If the <code>ecb_violations</code> table
            doesn&apos;t exist yet, run{" "}
            <code>supabase/migration-ecb-violations.sql</code>, then hit
            Refresh above.
          </p>
        </div>
      </section>
    );
  }

  const rows = ecbResult.rows;
  const open = rows.filter((r) => r.is_open);
  const depOpen = open.filter((r) => r.issuing_agency === "DEP");
  const now = Date.now();
  const upcoming = open.filter((r) => {
    if (!r.hearing_date) return false;
    const d = (new Date(r.hearing_date).getTime() - now) / 86400000;
    return d >= 0 && d <= 30;
  });
  const balance = open.reduce((sum, r) => sum + (r.balance_due ?? 0), 0);
  const defaulted = open.filter((r) => r.is_defaulted);
  const synced = ecbSync[0]?.last_synced_at
    ? new Date(ecbSync[0].last_synced_at).toLocaleString()
    : null;
  const neverSynced = ecbSync.length === 0;

  const nameById = new Map(buildings.map((b) => [b.id, b.name]));
  const groups = new Map<string, EcbRow[]>();
  for (const r of open) {
    const key = r.building_id ?? "campus";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          OATH / ECB · DEP, DOB, FDNY &amp; other agencies
        </h2>
        {synced && (
          <span className="text-xs text-ink-400">Synced {synced}</span>
        )}
      </div>

      {neverSynced ? (
        <div className="mt-2 rounded-md border border-warn-600/40 bg-warn-50 p-4 text-sm text-warn-800">
          <p className="font-semibold">Not synced yet — status unknown.</p>
          <p className="mt-1 text-xs leading-relaxed">
            No OATH/ECB pull has completed for this portfolio. Run the
            migration (<code>supabase/migration-ecb-violations.sql</code>),
            make sure each building has its BBL (
            <code>supabase/backfill-bin-bbl.sql</code>), then hit Refresh
            above. Until then, summonses here are unknown — not zero.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Open summonses" value={String(open.length)} />
            <StatCard
              label="DEP open"
              value={String(depOpen.length)}
              tone={depOpen.length > 0 ? "warn" : "default"}
            />
            <StatCard
              label="Hearings next 30d"
              value={String(upcoming.length)}
              tone={upcoming.length > 0 ? "warn" : "default"}
            />
            <StatCard
              label="Balance due"
              value={money(balance)}
              tone={balance > 0 ? "danger" : "ok"}
            />
          </div>

          {defaulted.length > 0 && (
            <div className="mt-3 rounded-md border border-danger-600/40 bg-danger-50 p-3 text-sm text-danger-800">
              <strong>
                {defaulted.length} summons{defaulted.length === 1 ? "" : "es"}{" "}
                in DEFAULT
              </strong>{" "}
              — a missed hearing imposes the full penalty automatically.
              Request a new hearing (motion to vacate) as soon as possible.
            </div>
          )}

          {open.length === 0 ? (
            <div className="mt-3 rounded-xl2 border border-ink-200 bg-white p-6 text-sm text-ink-400">
              Checked against OATH — no open summonses on the campus lot.
            </div>
          ) : (
            [...groups.entries()].map(([key, list]) => (
              <section
                key={key}
                className="mt-4 rounded-xl2 border border-ink-200 bg-white"
              >
                <div className="border-b border-ink-200 px-4 py-3">
                  <h3 className="text-base font-semibold">
                    {key === "campus"
                      ? "Campus-wide / unattributed"
                      : nameById.get(key) ?? key}
                  </h3>
                  {key === "campus" && (
                    <p className="text-xs text-ink-400">
                      Summonses on the shared lot whose house number didn&apos;t
                      match a specific building — still yours to answer.
                    </p>
                  )}
                </div>
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Agency</th>
                        <th className="px-3 py-2 text-left">Ticket</th>
                        <th className="px-3 py-2 text-left">Issued</th>
                        <th className="px-3 py-2 text-left">Hearing</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Balance</th>
                        <th className="px-3 py-2 text-left">Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-ink-100 align-top"
                        >
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                                r.issuing_agency === "DEP"
                                  ? "border-brand-600/40 bg-brand-50 text-brand-800"
                                  : "border-ink-200 bg-ink-100 text-ink-600"
                              }`}
                            >
                              {r.issuing_agency ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                          <td className="px-3 py-2 text-xs">
                            {r.violation_date
                              ? new Date(r.violation_date).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {r.hearing_date
                              ? new Date(r.hearing_date).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span
                              className={
                                r.is_defaulted
                                  ? "font-semibold text-danger-800"
                                  : ""
                              }
                            >
                              {r.hearing_status ?? r.compliance_status ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span
                              className={
                                (r.balance_due ?? 0) > 0
                                  ? "font-semibold text-danger-800"
                                  : ""
                              }
                            >
                              {money(r.balance_due)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs leading-relaxed">
                            {r.charge ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </>
      )}
    </section>
  );
}
