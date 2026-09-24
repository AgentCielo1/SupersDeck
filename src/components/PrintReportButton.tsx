"use client";

// Print-or-save-as-PDF button for report pages (the browser's print dialog
// includes "Save as PDF" on every platform, so one button covers both).
export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 print:hidden"
    >
      🖨 Print / Save as PDF
    </button>
  );
}
