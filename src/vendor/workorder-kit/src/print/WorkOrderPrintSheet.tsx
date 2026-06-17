import type { NormalizedWorkOrder } from "../contract";
import { statusLabel, priorityLabel } from "../contract";
import { fmtDate, fmtTime, elapsedMinutes } from "./format";

// =============================================================================
//  Shared printable Resident Service Order (the "finished work order")
// =============================================================================
//  Clean, print-safe, black/white-on-white. Takes a NormalizedWorkOrder and
//  renders one Letter page. Presentational only (no hooks) so it works in a
//  server or client component. The app wraps it with its own print button.
//
//  Carries the original-language block (when the resident didn't write in
//  English) so the translated print never loses the resident's own words.
// =============================================================================

export interface WorkOrderPrintSheetProps {
  wo: NormalizedWorkOrder;
}

export function WorkOrderPrintSheet({ wo }: WorkOrderPrintSheetProps) {
  const elapsed = elapsedMinutes(wo.completion?.startedAt, wo.completion?.completedAt);
  const sig = wo.completion?.signatureDataUrl;

  return (
    <div className="mx-auto max-w-[8.5in] bg-white p-6 text-black print:p-0">
      <style>{`@media print { @page { size: letter; margin: 0.5in; } }`}</style>
      <div className="border border-zinc-300 p-8 print:border-0 print:p-0">
        {/* Branded header */}
        <header className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            {wo.org.mark && (
              <div className="flex h-12 w-12 items-center justify-center border-2 border-black text-lg font-bold">
                {wo.org.mark}
              </div>
            )}
            <div>
              <p className="text-lg font-bold leading-tight">{wo.org.name}</p>
              {wo.org.subtitle && (
                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  {wo.org.subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold uppercase tracking-wide">Resident Service Order</p>
            <p className="font-mono text-sm">{wo.referenceNumber}</p>
          </div>
        </header>

        {/* Metadata grid */}
        <section className="mb-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
          <Meta label="Date" value={fmtDate(wo.createdAt)} />
          <Meta label="Taken by" value={wo.takenBy ?? "—"} />
          <Meta label="Status" value={statusLabel(wo.status)} />
          <Meta label="Resident" value={wo.reporter.name || "—"} />
          <Meta label="Phone" value={wo.reporter.phone ?? "—"} />
          <Meta label="Priority" value={priorityLabel(wo.priority)} />
          <Meta label="Address" value={wo.location.address ?? "—"} />
          <Meta label="Building" value={wo.location.buildingName || "—"} />
          <Meta label="Apartment" value={wo.location.unitLabel ?? "—"} />
          <Meta label="Location" value={wo.location.zone ?? "—"} />
          <Meta label="Category" value={wo.category?.label ?? "—"} />
        </section>

        {/* Complaint / request — English, with the resident's original below */}
        <section className="mb-5">
          <h2 className="mb-1 border-b border-black text-xs font-bold uppercase tracking-widest">
            Complaint / Request
          </h2>
          <div className="min-h-28 whitespace-pre-wrap p-2 text-sm">
            <p className="font-semibold">{wo.title}</p>
            {wo.description && <p className="mt-1">{wo.description}</p>}
            {wo.original && (
              <div className="mt-3 border-t border-dashed border-zinc-400 pt-2 text-xs text-zinc-600">
                <p className="mb-1 uppercase tracking-wider">
                  As submitted ({wo.original.language})
                </p>
                <p className="font-semibold">{wo.original.title}</p>
                {wo.original.description && (
                  <p className="mt-0.5">{wo.original.description}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Work performed */}
        <section className="mb-5">
          <h2 className="mb-1 border-b border-black text-xs font-bold uppercase tracking-widest">
            Work Performed / Completion Notes
          </h2>
          <div className="min-h-32 whitespace-pre-wrap p-2 text-sm">
            {wo.completion?.notes ?? ""}
          </div>
        </section>

        {/* Times */}
        <section className="mb-6 grid grid-cols-3 gap-4 text-sm">
          <Meta
            label="Time started"
            value={wo.completion?.startedAt ? fmtTime(wo.completion.startedAt) : "________"}
          />
          <Meta
            label="Time stopped"
            value={wo.completion?.completedAt ? fmtTime(wo.completion.completedAt) : "________"}
          />
          <Meta label="Elapsed" value={elapsed !== null ? `${elapsed} min` : "________"} />
        </section>

        {/* Signatures — each with a date line beside it */}
        <section className="space-y-5 text-sm">
          <div className="grid grid-cols-[1fr_10rem] gap-6">
            <div>
              <div className="flex h-16 items-end border-b border-black pb-1">
                {sig ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sig} alt="Resident signature" className="max-h-14" />
                ) : null}
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-zinc-600">
                Resident signature
                {wo.completion?.signedByName ? ` — ${wo.completion.signedByName}` : ""}
              </p>
            </div>
            <div>
              <div className="flex h-16 items-end border-b border-black pb-1">
                {wo.completion?.signedAt ? fmtDate(wo.completion.signedAt) : ""}
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-zinc-600">Date</p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_10rem] gap-6">
            <div>
              <div className="flex h-16 items-end border-b border-black pb-1">
                <span>{wo.completion?.doneBy ?? ""}</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-zinc-600">Work done by</p>
            </div>
            <div>
              <div className="flex h-16 items-end border-b border-black pb-1">
                {wo.completion?.completedAt ? fmtDate(wo.completion.completedAt) : ""}
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-zinc-600">Date</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className="block border-b border-zinc-400 pb-0.5">{value}</span>
    </div>
  );
}
