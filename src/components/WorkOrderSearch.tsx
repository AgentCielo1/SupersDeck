"use client";

import { useMemo, useState } from "react";
import WorkOrderCard from "@/components/WorkOrderCard";
import type { WorkOrder } from "@/types";

// =============================================================================
//  WorkOrderSearch — instant search over the tickets tab
// =============================================================================
//  Everything is already in memory (the page loads all WOs), so search is a
//  pure client-side filter: ticket #, title (English + original), description,
//  reporter, assignee, category, status. Space-separated terms AND together
//  ("leak 7c" → leaks mentioning 7C).
// =============================================================================

function haystack(wo: WorkOrder): string {
  return [
    wo.ticket_number,
    wo.title,
    wo.title_en,
    wo.description,
    wo.description_en,
    wo.reporter_name,
    wo.assigned_to,
    wo.category,
    wo.status,
    wo.unit_id, // "u-1-7c" — matches apartment searches like "7c"
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function WorkOrderSearch({ all }: { all: WorkOrder[] }) {
  const [q, setQ] = useState("");

  const { open, closed } = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const match = (wo: WorkOrder) => {
      if (terms.length === 0) return true;
      const h = haystack(wo);
      return terms.every((t) => h.includes(t));
    };
    const hit = all.filter(match);
    return {
      open: hit.filter((w) => w.status !== "completed" && w.status !== "cancelled"),
      closed: hit.filter((w) => w.status === "completed"),
    };
  }, [all, q]);

  return (
    <>
      <div className="mb-5">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tickets — number, apt, tenant, problem…"
            aria-label="Search work orders"
            className="w-full rounded-md border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {q && (
          <p className="mt-1.5 text-xs text-ink-400">
            {open.length + closed.length} match{open.length + closed.length === 1 ? "" : "es"} for
            “{q}” —{" "}
            <button onClick={() => setQ("")} className="text-brand-600 hover:underline">
              clear
            </button>
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-base font-semibold">Open ({open.length})</h2>
        {open.length === 0 && (
          <p className="rounded-md border border-ink-200 bg-white px-3 py-4 text-sm text-ink-400">
            {q ? "No open tickets match." : "No open tickets."}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {open.map((wo) => (
            <WorkOrderCard key={wo.id} wo={wo} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold">Recently closed ({closed.length})</h2>
        {closed.length === 0 && (
          <p className="rounded-md border border-ink-200 bg-white px-3 py-4 text-sm text-ink-400">
            {q ? "No closed tickets match." : "Nothing closed yet."}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {closed.map((wo) => (
            <WorkOrderCard key={wo.id} wo={wo} />
          ))}
        </div>
      </section>
    </>
  );
}
