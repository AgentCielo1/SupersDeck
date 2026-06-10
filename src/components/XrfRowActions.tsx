"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// =============================================================================
//  XrfRowActions — inline mark-tested / mark-untested / set-date controls
// =============================================================================
//  Sits inside each row of the /lead-paint table. PATCHes /api/units/:id
//  with `lead_xrf_completed`. Three actions:
//    • Mark tested today
//    • Set custom date
//    • Clear (mark untested) — confirm dialog because it's destructive
// =============================================================================

export default function XrfRowActions({
  unitId,
  currentDate,
}: {
  unitId: string;
  currentDate: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [dateInput, setDateInput] = useState(
    currentDate ?? new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState<string | null>(null);

  async function patch(value: string | null) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/units/${unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_xrf_completed: value }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
      setBusy(false);
      return;
    }
    setBusy(false);
    setPicking(false);
    router.refresh();
  }

  if (picking) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="rounded border border-ink-200 px-2 py-1 text-xs"
        />
        <button
          onClick={() => patch(dateInput)}
          disabled={busy}
          className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          Save
        </button>
        <button
          onClick={() => setPicking(false)}
          className="rounded border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-100"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => patch(new Date().toISOString().slice(0, 10))}
        disabled={busy}
        className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        Tested today
      </button>
      <button
        onClick={() => setPicking(true)}
        className="rounded border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-100"
      >
        Date…
      </button>
      {currentDate && (
        <button
          onClick={() => {
            if (confirm("Clear XRF date for this unit?")) patch(null);
          }}
          disabled={busy}
          className="rounded border border-ink-200 px-2 py-1 text-xs text-ink-400 hover:text-danger-800"
        >
          Clear
        </button>
      )}
      {error && <span className="text-xs text-danger-800">{error}</span>}
    </div>
  );
}
