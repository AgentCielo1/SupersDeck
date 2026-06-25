"use client";

import { useMemo, useState } from "react";

export type DirRow = {
  buildingId: string;
  building: string;
  apt: string;
  tenant: string | null;
  phone: string | null;
  leaseEnd: string | null;
  occupied: boolean;
};

// floor number + line letter, for natural apartment sorting (2A before 10A)
function aptKey(label: string): [number, string] {
  const m = label.match(/^(\d+)\s*(.*)$/);
  return m ? [parseInt(m[1], 10), m[2]] : [9999, label];
}

export default function TenantDirectory({ rows }: { rows: DirRow[] }) {
  const [q, setQ] = useState("");

  const indexed = useMemo(
    () =>
      rows
        .map((r) => ({
          r,
          s: `${r.building} ${r.apt} ${r.tenant ?? ""} ${r.phone ?? ""}`.toLowerCase(),
        }))
        .sort((a, b) => {
          if (a.r.building !== b.r.building)
            return a.r.building.localeCompare(b.r.building);
          const [af, al] = aptKey(a.r.apt);
          const [bf, bl] = aptKey(b.r.apt);
          return af - bf || al.localeCompare(bl);
        }),
    [rows]
  );

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length
    ? indexed.filter(({ s }) => words.every((w) => s.includes(w)))
    : indexed;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name, or a building + apartment (e.g. “Building 1 5B” or “Watson”)"
          className="min-w-[260px] flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <span className="text-xs text-ink-400">
          {matches.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2">Building</th>
              <th className="px-3 py-2">Apt</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Lease ends</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-ink-400">
                  No matches.
                </td>
              </tr>
            )}
            {matches.map(({ r }) => (
              <tr
                key={`${r.buildingId}-${r.apt}`}
                className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50"
              >
                <td className="px-3 py-2 text-xs text-ink-600">{r.building}</td>
                <td className="px-3 py-2 font-mono text-xs font-medium text-ink-900">
                  {r.apt}
                </td>
                <td className="px-3 py-2 text-ink-900">
                  {r.tenant ?? (
                    <span className="text-ink-300">
                      {r.occupied ? "(occupied — no name on file)" : "(vacant)"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.phone ? (
                    <a href={`tel:${r.phone}`} className="text-brand hover:underline">
                      {r.phone}
                    </a>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-ink-600">
                  {r.leaseEnd ? new Date(r.leaseEnd).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
