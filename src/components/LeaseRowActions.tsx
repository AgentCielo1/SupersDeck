"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// =============================================================================
//  LeaseRowActions — inline edit for lease_start / lease_end / rent_status
// =============================================================================
//  Sits inside each row of /leases. PATCHes /api/units/:id with all three
//  fields at once. Edit-in-place modal-ish — shows current values until
//  the user clicks "Edit", then exposes the inputs.
// =============================================================================

const RENT_STATUS_OPTIONS: Array<{
  value: "" | "stabilized" | "controlled" | "market" | "section8" | "pact";
  label: string;
}> = [
  { value: "", label: "—" },
  { value: "stabilized", label: "Rent stabilized" },
  { value: "controlled", label: "Rent controlled" },
  { value: "market", label: "Market rate" },
  { value: "section8", label: "Section 8" },
  { value: "pact", label: "PACT/RAD" },
];

export default function LeaseRowActions({
  unitId,
  leaseStart,
  leaseEnd,
  rentStatus,
}: {
  unitId: string;
  leaseStart: string | null;
  leaseEnd: string | null;
  rentStatus: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(leaseStart ?? "");
  const [end, setEnd] = useState(leaseEnd ?? "");
  const [status, setStatus] = useState(rentStatus ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/units/${unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lease_start: start || null,
        lease_end: end || null,
        rent_status: status || null,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
      setBusy(false);
      return;
    }
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs">
          <label className="text-ink-400">Start</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded border border-ink-200 px-1 py-0.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <label className="text-ink-400">End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded border border-ink-200 px-1 py-0.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <label className="text-ink-400">Type</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-ink-200 px-1 py-0.5 text-xs"
          >
            {RENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={busy}
            className="rounded bg-brand-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setStart(leaseStart ?? "");
              setEnd(leaseEnd ?? "");
              setStatus(rentStatus ?? "");
            }}
            className="rounded border border-ink-200 px-2 py-0.5 text-xs text-ink-600 hover:bg-ink-100"
          >
            Cancel
          </button>
        </div>
        {error && <div className="text-xs text-danger-800">{error}</div>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="rounded border border-ink-200 px-2 py-0.5 text-xs text-ink-600 hover:bg-ink-100"
    >
      Edit
    </button>
  );
}
