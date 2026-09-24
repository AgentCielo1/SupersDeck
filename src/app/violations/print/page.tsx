import Link from "next/link";
import { db, type EcbRow } from "@/lib/db";
import {
  lookupHpdViolationsForBuildings,
  cureDeadline,
  describeHpdFailure,
} from "@/lib/hpd";
import PrintReportButton from "@/components/PrintReportButton";

// =============================================================================
//  /violations/print — the full enforcement record as a handable document
// =============================================================================
//  Print-optimized snapshot of both feeds (HPD + OATH/ECB), for the moments a
//  super needs the record OUTSIDE the app: an owner meeting, an OATH hearing,
//  a contractor scope walk. The browser's print dialog covers paper and
//  save-as-PDF alike.
//
//  ?all=1 includes resolved/closed history; default matches the live page
//  (open items only). The honesty rules carry over: a building that could not
//  be checked prints as NOT CHECKED, never as clean.
// =============================================================================

export const dynamic = "force-dynamic";

const fmtMoney = (n: number | null) =>
  n == null
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ViolationsPrintPage({
  searchParams,
}: {
  searchParams: { all?: string };
}) {
  const includeAll = searchParams.all === "1";
  const buildings = await db.buildings();
  const [hpd, ecbResult, ecbSync] = await Promise.all([
    lookupHpdViolationsForBuildings(buildings, { openOnly: !includeAll, limit: 500 }),
    db.ecbViolations(),
    db.ecbSync(),
  ]);
  const nameById = new Map(buildings.map((b) => [b.id, b.name]));

  const ecbRows = ecbResult.ok
    ? includeAll
      ? ecbResult.rows
      : ecbResult.rows.filter((r) => r.is_open)
    : [];
  const ecbGroups = new Map<string, EcbRow[]>();
  for (const r of ecbRows) {
    const key = r.building_id ?? "campus";
    ecbGroups.set(key, [...(ecbGroups.get(key) ?? []), r]);
  }
  const ecbBalance = ecbRows.reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const hpdTotal = buildings.reduce(
    (s, b) => s + (hpd[b.id]?.ok ? (hpd[b.id] as any).violations.length : 0),
    0,
  );
  const hpdFailed = buildings.filter((b) => hpd[b.id]?.ok === false);

  const th = "border-b border-ink-300 px-2 py-1 text-left align-bottom";
  const td = "border-b border-ink-100 px-2 py-1 align-top";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 text-[13px] leading-snug text-ink-900 print:max-w-none print:px-0 print:text-[11px]">
      {/* On-screen controls — never printed */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/violations" className="text-sm text-brand-600 hover:underline">
          ← Back to Violations
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={includeAll ? "/violations/print" : "/violations/print?all=1"}
            className="text-sm text-brand-600 hover:underline"
          >
            {includeAll ? "Show open items only" : "Include resolved history"}
          </Link>
          <PrintReportButton />
        </div>
      </div>

      {/* Report header */}
      <header className="border-b-2 border-ink-900 pb-3">
        <h1 className="text-xl font-bold">
          Violations report — {includeAll ? "full history" : "open items"}
        </h1>
        <p className="mt-1 text-ink-600">
          Forest Hills portfolio · BBL 4021590002 · Generated{" "}
          {new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}{" "}
          ET
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          Sources: NYC Open Data — HPD Housing Maintenance Code Violations
          (live per-building lookup) and OATH Hearings Division Case Status
          {ecbSync[0]
            ? ` (synced ${new Date(ecbSync[0].last_synced_at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET)`
            : " (not yet synced)"}
          .
        </p>
      </header>

      {/* Totals strip */}
      <section className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <span>
          <strong>{hpdTotal}</strong> HPD violation{hpdTotal === 1 ? "" : "s"}
          {hpdFailed.length > 0 && (
            <strong className="text-danger-800">
              {" "}
              (+{hpdFailed.length} building{hpdFailed.length === 1 ? "" : "s"} NOT
              CHECKED — totals are a floor)
            </strong>
          )}
        </span>
        <span>
          <strong>{ecbRows.length}</strong> OATH/ECB summons
          {ecbRows.length === 1 ? "" : "es"}
        </span>
        <span>
          OATH balance due: <strong>{fmtMoney(ecbBalance)}</strong>
        </span>
      </section>

      {/* HPD */}
      <h2 className="mt-6 border-b border-ink-400 pb-1 text-base font-bold">
        HPD · Housing maintenance violations
      </h2>
      {buildings.map((b) => {
        const result = hpd[b.id];
        return (
          <section key={b.id} className="mt-3 break-inside-avoid-page">
            <h3 className="font-semibold">
              {b.name} — {b.address}
            </h3>
            {result && !result.ok ? (
              <p className="mt-1 font-semibold text-danger-800">
                NOT CHECKED — {describeHpdFailure(result.failure)} Status
                unknown, not zero.
              </p>
            ) : !result || result.violations.length === 0 ? (
              <p className="mt-1 text-ink-500">
                No {includeAll ? "" : "open "}violations found at this address.
              </p>
            ) : (
              <table className="mt-1 w-full border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-ink-500">
                    <th className={th}>Class</th>
                    <th className={th}>Issued</th>
                    <th className={th}>Cure</th>
                    <th className={th}>Apt</th>
                    <th className={th}>Status</th>
                    <th className={th}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {result.violations.map((v) => (
                    <tr key={v.violationid}>
                      <td className={`${td} font-semibold`}>
                        {v.violationclass ?? "—"}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {v.novissueddate
                          ? new Date(v.novissueddate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {cureDeadline(v).label}
                      </td>
                      <td className={td}>{v.apartment ?? "—"}</td>
                      <td className={td}>{v.currentstatus ?? "—"}</td>
                      <td className={td}>{v.novdescription ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      {/* OATH/ECB */}
      <h2 className="mt-8 border-b border-ink-400 pb-1 text-base font-bold">
        OATH / ECB · Summonses (DEP · DOB · FDNY · DSNY · DOHMH · …)
      </h2>
      {!ecbResult.ok ? (
        <p className="mt-1 font-semibold text-danger-800">
          NOT LOADED — {ecbResult.detail}. ECB status unknown, not zero.
        </p>
      ) : ecbRows.length === 0 ? (
        <p className="mt-1 text-ink-500">
          No {includeAll ? "" : "open "}summonses on the campus lot.
        </p>
      ) : (
        [...ecbGroups.entries()].map(([key, list]) => (
          <section key={key} className="mt-3 break-inside-avoid-page">
            <h3 className="font-semibold">
              {key === "campus"
                ? "Campus-wide / unattributed"
                : nameById.get(key) ?? key}
            </h3>
            <table className="mt-1 w-full border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-500">
                  <th className={th}>Agency</th>
                  <th className={th}>Ticket</th>
                  <th className={th}>Issued</th>
                  <th className={th}>Hearing</th>
                  <th className={th}>Status</th>
                  <th className={th}>Balance</th>
                  <th className={th}>Charge</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td className={`${td} font-semibold`}>
                      {r.issuing_agency ?? "—"}
                    </td>
                    <td className={`${td} font-mono text-xs`}>{r.id}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {r.violation_date
                        ? new Date(r.violation_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {r.hearing_date
                        ? new Date(r.hearing_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td
                      className={`${td} ${r.is_defaulted ? "font-bold text-danger-800" : ""}`}
                    >
                      {r.hearing_status ?? r.compliance_status ?? "—"}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {fmtMoney(r.balance_due)}
                    </td>
                    <td className={td}>{r.charge ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      <footer className="mt-8 border-t border-ink-300 pt-2 text-xs text-ink-500">
        Generated by SupersDeck from NYC Open Data. HPD figures are live at
        generation time; OATH figures reflect the last sync noted above. A
        section marked NOT CHECKED / NOT LOADED means status unknown — verify
        with the agency before relying on this report.
      </footer>
    </div>
  );
}
