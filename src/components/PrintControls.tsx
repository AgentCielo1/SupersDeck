"use client";

import { useEffect, useState } from "react";

// =============================================================================
//  PrintControls — print a work order, fit to one page by default
// =============================================================================
//  "Fit to one page" (default on) toggles `.condense` on #wo-print-sheet, which
//  collapses the blank write-in reserves + tightens type so even a long work
//  order lands on a single sheet. Uncheck it for a roomier form (handwriting)
//  or to allow a 2-page print on the rare very-long order.
// =============================================================================

export default function PrintControls({ long = false }: { long?: boolean }) {
  const [fit, setFit] = useState(true);

  useEffect(() => {
    const el = document.getElementById("wo-print-sheet");
    if (el) el.classList.toggle("condense", fit);
  }, [fit]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        className="flex items-center gap-1.5 text-sm text-ink-600"
        title="Collapses blank write-in space so it prints on one sheet"
      >
        <input
          type="checkbox"
          checked={fit}
          onChange={(e) => setFit(e.target.checked)}
        />
        Fit to one page
      </label>
      {long && !fit && (
        <span className="text-xs text-warn-800">
          Long order — may print on 2 pages.
        </span>
      )}
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        Print this work order
      </button>
    </div>
  );
}
