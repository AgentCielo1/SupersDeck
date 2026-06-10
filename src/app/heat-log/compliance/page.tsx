import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/db";
import type { Building, HeatLog } from "@/types";

// =============================================================================
//  /heat-log/compliance — per-building heat law compliance dashboard
// =============================================================================
//  NYC heat law (NYC Admin Code §27-2029):
//    • Heat season: October 1 – May 31.
//    • Day (6 AM – 10 PM):   apartments must be ≥ 68°F when outdoor < 55°F.
//    • Night (10 PM – 6 AM): apartments must be ≥ 62°F at all times,
//                            regardless of outdoor temperature.
//    • Hot water: ≥ 120°F year-round (any time of day).
//
//  This page reads the last 30 days of heat_logs, computes which entries
//  violated the rule above, and produces a per-building scoreboard. The full
//  log is at /heat-log; this view is the management-facing summary.
// =============================================================================

const HEAT_DAY_MIN = 68;
const HEAT_NIGHT_MIN = 62;
const OUTDOOR_TRIGGER = 55;
const HOT_WATER_MIN = 120;
const WINDOW_DAYS = 30;

function isHeatSeason(d: Date = new Date()): boolean {
  const m = d.getMonth() + 1;
  return m >= 10 || m <= 5;
}

function isDaytime(d: Date): boolean {
  const h = d.getHours();
  return h >= 6 && h < 22;
}

type Violation =
  | "heat-day"
  | "heat-night"
  | "hot-water"
  | "missing-outdoor";

function classify(log: HeatLog): Violation | null {
  const recordedAt = new Date(log.recorded_at);
  const day = isDaytime(recordedAt);
  const inSeason = isHeatSeason(recordedAt);

  // Hot water check applies year-round.
  if (
    log.hot_water_temp_f != null &&
    log.hot_water_temp_f < HOT_WATER_MIN
  ) {
    return "hot-water";
  }

  // Heat checks only fire during heat season (Oct 1 – May 31).
  if (!inSeason) return null;

  if (!day) {
    // Night rule: indoor must be ≥ 62°F regardless of outdoor.
    return log.indoor_temp_f < HEAT_NIGHT_MIN ? "heat-night" : null;
  }

  // Day rule: 68°F minimum when outdoor is below 55°F.
  if (log.outdoor_temp_f == null) {
    // Can't apply the rule without an outdoor reading; surface it as a
    // data-quality flag so the super logs outdoor temps during the day.
    return log.indoor_temp_f < HEAT_DAY_MIN ? "missing-outdoor" : null;
  }
  if (log.outdoor_temp_f < OUTDOOR_TRIGGER) {
    return log.indoor_temp_f < HEAT_DAY_MIN ? "heat-day" : null;
  }
  return null;
}

const VIOLATION_LABELS: Record<Violation, string> = {
  "heat-day": "Day heat (<68°F)",
  "heat-night": "Night heat (<62°F)",
  "hot-water": "Hot water (<120°F)",
  "missing-outdoor": "Low indoor, no outdoor logged",
};

export default async function HeatComplianceDashboard() {
  const [logs, buildings] = await Promise.all([
    db.heatLogs(),
    db.buildings(),
  ]);

  const since = Date.now() - WINDOW_DAYS * 86400000;
  const recentLogs = logs.filter((l) => +new Date(l.recorded_at) >= since);
  const buildingsById: Record<string, Building> = Object.fromEntries(
    buildings.map((b) => [b.id, b])
  );

  // For each building: total readings in window, violations, latest reading.
  type Summary = {
    building: Building;
    total: number;
    violations: Partial<Record<Violation, number>>;
    latest: HeatLog | null;
    latestViolation: Violation | null;
  };
  const summaries: Summary[] = buildings.map((b) => {
    const mine = recentLogs.filter((l) => l.building_id === b.id);
    const violations: Partial<Record<Violation, number>> = {};
    for (const l of mine) {
      const v = classify(l);
      if (v) violations[v] = (violations[v] ?? 0) + 1;
    }
    const latest = mine.length === 0 ? null : mine.reduce((acc, l) =>
      +new Date(l.recorded_at) > +new Date(acc.recorded_at) ? l : acc
    );
    return {
      building: b,
      total: mine.length,
      violations,
      latest,
      latestViolation: latest ? classify(latest) : null,
    };
  });

  const totalViolations = summaries.reduce(
    (s, x) => s + Object.values(x.violations).reduce((a, b) => a + b, 0),
    0
  );
  const buildingsWithFails = summaries.filter(
    (s) => Object.keys(s.violations).length > 0
  ).length;
  const buildingsNoData = summaries.filter((s) => s.total === 0).length;

  const seasonNow = isHeatSeason();

  return (
    <>
      <PageHeader
        title="Heat & hot water compliance"
        subtitle={
          seasonNow
            ? "Heat season is ACTIVE (Oct 1 – May 31). Day ≥68°F when outdoor <55°F, night ≥62°F always, hot water ≥120°F year-round."
            : "Off-season. Hot water ≥120°F still required year-round; heat rules resume Oct 1."
        }
        actions={
          <div className="flex gap-2">
            <Link
              href="/heat-log"
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              Full log
            </Link>
            <Link
              href="/heat-log/new"
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Log a reading
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Readings (30d)" value={recentLogs.length} />
        <Stat
          label="Total violations"
          value={totalViolations}
          tone={totalViolations > 0 ? "danger" : "ok"}
        />
        <Stat
          label="Buildings with fails"
          value={buildingsWithFails}
          tone={buildingsWithFails > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Buildings with no data"
          value={buildingsNoData}
          tone={buildingsNoData > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2">Building</th>
              <th className="px-3 py-2 text-right">Readings (30d)</th>
              <th className="px-3 py-2">Latest reading</th>
              <th className="px-3 py-2">Violations in window</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const failCount = Object.values(s.violations).reduce(
                (a, b) => a + b,
                0
              );
              const heatNotes = s.building.heat_notes;
              return (
                <tr
                  key={s.building.id}
                  className="border-b border-ink-100 align-top last:border-0"
                >
                  <td className="px-3 py-3">
                    <div className="font-semibold text-ink-900">
                      {s.building.name}
                    </div>
                    <div className="text-xs text-ink-400">
                      {s.building.address}
                    </div>
                    {heatNotes && (
                      <div className="mt-1 rounded-md border border-warn-600/40 bg-warn-50 px-2 py-1 text-xs text-warn-800">
                        {heatNotes}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-sm">
                    {s.total === 0 ? (
                      <span className="rounded-md border border-warn-600/40 bg-warn-50 px-1.5 py-0.5 text-xs text-warn-800">
                        No data
                      </span>
                    ) : (
                      s.total
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-ink-600">
                    {s.latest ? (
                      <>
                        <div>
                          {new Date(s.latest.recorded_at).toLocaleString()}
                        </div>
                        <div className="text-ink-400">
                          Indoor {s.latest.indoor_temp_f}°F
                          {s.latest.outdoor_temp_f != null
                            ? ` · Outdoor ${s.latest.outdoor_temp_f}°F`
                            : ""}
                          {s.latest.hot_water_temp_f != null
                            ? ` · HW ${s.latest.hot_water_temp_f}°F`
                            : ""}
                        </div>
                        {s.latestViolation && (
                          <div className="mt-1 inline-block rounded-md border border-danger-600/40 bg-danger-50 px-1.5 py-0.5 text-danger-800">
                            ↓ {VIOLATION_LABELS[s.latestViolation]}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {failCount === 0 ? (
                      <span className="rounded-md border border-ok-600/30 bg-ok-50 px-1.5 py-0.5 text-ok-800">
                        ✓ Clean
                      </span>
                    ) : (
                      <ul className="space-y-1">
                        {(Object.entries(s.violations) as Array<
                          [Violation, number]
                        >).map(([v, count]) => (
                          <li key={v}>
                            <span className="rounded-md border border-danger-600/40 bg-danger-50 px-1.5 py-0.5 font-medium text-danger-800">
                              {VIOLATION_LABELS[v]}
                            </span>{" "}
                            <span className="text-ink-600">×{count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-400">
        Rule reference: NYC Admin Code §27-2029. Heat season runs October 1
        through May 31. Day = 6 AM – 10 PM. A complete defense in a 311 case
        usually requires regular log entries covering the period in question
        — aim for at least one reading per heat-season day from a sample
        line on a representative floor.
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
