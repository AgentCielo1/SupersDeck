"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { AlertTier } from "@/lib/alerts";
import { TIER_BADGE, tierLabel, channelsLabel } from "@/lib/alert-ui";
import { relativeTime, shortDate } from "@/lib/format";
import EmptyState from "@/components/EmptyState";

export interface AlertListRow {
  id: string;
  tier: AlertTier;
  title: string;
  status: "active" | "resolved";
  created_at: string;
  resolved_at: string | null;
  channels: string[];
  building_ids: string[];
  buildingNames: string[];
  ackCount: number;
}

type TierFilter = AlertTier | "all";
type StatusFilter = "all" | "active" | "resolved";

export default function AlertsList({ rows }: { rows: AlertListRow[] }) {
  const [tier, setTier] = useState<TierFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [building, setBuilding] = useState<string>("all");

  // Distinct buildings present across the rows, for the building filter.
  const buildings = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      r.building_ids.forEach((id, i) => {
        if (!map.has(id)) map.set(id, r.buildingNames[i] ?? id);
      });
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (tier === "all" || r.tier === tier) &&
          (status === "all" || r.status === status) &&
          (building === "all" || r.building_ids.includes(building))
      ),
    [rows, tier, status, building]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Tier"
          value={tier}
          onChange={(v) => setTier(v as TierFilter)}
          options={[
            { value: "all", label: "All tiers" },
            { value: "routine", label: "Routine" },
            { value: "urgent", label: "Urgent" },
            { value: "emergency", label: "Emergency" },
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "resolved", label: "Resolved" },
          ]}
        />
        {buildings.length > 1 && (
          <FilterSelect
            label="Building"
            value={building}
            onChange={setBuilding}
            options={[
              { value: "all", label: "All buildings" },
              ...buildings.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        )}
        <span className="ml-auto text-xs text-ink-400">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No alerts match"
          message={
            rows.length === 0
              ? "No alerts have been sent in the last 30 days."
              : "Try changing the filters above."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/alerts/${r.id}`}
              className="block rounded-xl2 border border-ink-200 bg-white p-4 transition hover:border-brand-400/50 hover:bg-brand-50/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={clsx(
                      "rounded-md border px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide",
                      TIER_BADGE[r.tier]
                    )}
                  >
                    {tierLabel(r.tier)}
                  </span>
                  {r.status === "resolved" ? (
                    <span className="rounded-md border border-ok-600/30 bg-ok-50 px-1.5 py-0.5 text-xs font-medium text-ok-800">
                      Resolved
                    </span>
                  ) : (
                    <span className="rounded-md border border-ink-200 bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-600">
                      Active
                    </span>
                  )}
                </div>
                <span
                  className="text-xs text-ink-400"
                  title={shortDate(r.created_at)}
                >
                  {relativeTime(r.created_at)}
                </span>
              </div>

              <div className="mt-2 font-semibold text-ink-900">{r.title}</div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                <span>
                  {r.building_ids.length} building
                  {r.building_ids.length === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>{channelsLabel(r.channels)}</span>
                {r.ackCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{r.ackCount} acked</span>
                  </>
                )}
                {r.resolved_at && (
                  <>
                    <span>·</span>
                    <span title={shortDate(r.resolved_at)}>
                      resolved {relativeTime(r.resolved_at)}
                    </span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-ink-400">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
