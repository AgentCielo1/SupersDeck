import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import StatCard from "@/components/StatCard";
import { db } from "@/lib/db";

const HPD_HEAT_DAY = 68;
const HPD_HEAT_NIGHT = 62;
const HPD_HOT_WATER = 120;

function thresholdForHour(hour: number) {
  // Day: 6am-10pm. Night: 10pm-6am.
  return hour >= 6 && hour < 22 ? HPD_HEAT_DAY : HPD_HEAT_NIGHT;
}

export default async function HeatLogPage() {
  const [logs, buildings] = await Promise.all([
    db.heatLogs(),
    db.buildings(),
  ]);
  const buildingById = Object.fromEntries(buildings.map((b) => [b.id, b]));

  const inSeason = (() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    return m >= 10 || m <= 5;
  })();

  // Count readings that failed HPD thresholds, for the stats row.
  const flagged = logs.filter((l) => {
    const hour = new Date(l.recorded_at).getHours();
    const t = thresholdForHour(hour);
    const heatFail = l.indoor_temp_f < t;
    const waterFail =
      l.hot_water_temp_f !== undefined &&
      l.hot_water_temp_f !== null &&
      l.hot_water_temp_f < HPD_HOT_WATER;
    return heatFail || waterFail;
  }).length;

  const last30 = logs.filter((l) => {
    const t = new Date(l.recorded_at).getTime();
    return Date.now() - t < 30 * 86_400_000;
  }).length;

  return (
    <>
      <PageHeader
        title="Heat & hot water log"
        subtitle={
          inSeason
            ? "Heat season is active (Oct 1 – May 31). HPD minimums: 68°F day / 62°F night when outdoor <55°F. Hot water ≥120°F year-round."
            : "Off-season. Hot water ≥120°F still required year-round."
        }
        actions={
          <div className="flex gap-2">
            <Link
              href="/heat-log/compliance"
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              Compliance dashboard
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Buildings" value={buildings.length} />
        <StatCard label="Readings (30d)" value={last30} />
        <StatCard
          label="Below threshold"
          value={flagged}
          tone={flagged > 0 ? "danger" : "ok"}
        />
        <StatCard
          label="Sensor integrations"
          value="0"
          hint="phase 4 — Govee / Aqara auto-import"
        />
      </div>

      <section className="mt-8 rounded-xl2 border border-ink-200 bg-white">
        <div className="border-b border-ink-200 px-4 py-3">
          <h2 className="text-base font-semibold">Readings</h2>
        </div>
        {logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No readings logged yet"
              message="Manual entry for now — pick a unit per line per floor and record indoor temp, outdoor temp, hot water temp. Each reading becomes part of the HPD-defensible record if a 311 complaint hits."
              cta={
                <Link
                  href="/heat-log/new"
                  className="inline-flex rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
                >
                  Log a reading
                </Link>
              }
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Building</th>
                <th className="px-4 py-2 text-left">Unit</th>
                <th className="px-4 py-2 text-right">Indoor °F</th>
                <th className="px-4 py-2 text-right">Outdoor °F</th>
                <th className="px-4 py-2 text-right">Hot water °F</th>
                <th className="px-4 py-2 text-left">Flags</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const hour = new Date(l.recorded_at).getHours();
                const threshold = thresholdForHour(hour);
                const heatFail = l.indoor_temp_f < threshold;
                const waterFail =
                  l.hot_water_temp_f != null && l.hot_water_temp_f < HPD_HOT_WATER;
                return (
                  <tr key={l.id} className={`border-t border-ink-100 ${heatFail || waterFail ? "bg-danger-50" : ""}`}>
                    <td className="px-4 py-2">
                      {new Date(l.recorded_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {buildingById[l.building_id]?.name ?? l.building_id}
                    </td>
                    <td className="px-4 py-2">{l.unit_id ?? "—"}</td>
                    <td
                      className={`px-4 py-2 text-right ${
                        heatFail ? "font-semibold text-danger-800" : ""
                      }`}
                    >
                      {l.indoor_temp_f}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {l.outdoor_temp_f ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right ${
                        waterFail ? "font-semibold text-danger-800" : ""
                      }`}
                    >
                      {l.hot_water_temp_f ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {heatFail && (
                        <span className="mr-1 rounded-md border border-danger-600/40 bg-danger-50 px-1.5 py-0.5 text-danger-800">
                          Heat &lt;{threshold}°F
                        </span>
                      )}
                      {waterFail && (
                        <span className="rounded-md border border-danger-600/40 bg-danger-50 px-1.5 py-0.5 text-danger-800">
                          Hot water &lt;120°F
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
