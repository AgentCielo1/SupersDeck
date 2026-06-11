"use client";

// =============================================================================
//  PrintTrigger — small client button that calls window.print()
// =============================================================================
//  Used by the work-order print view + the QR poster page. Kept as its own
//  component so the host page can stay a server component.
// =============================================================================

export default function PrintTrigger({
  label = "Print",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
    >
      {label}
    </button>
  );
}
