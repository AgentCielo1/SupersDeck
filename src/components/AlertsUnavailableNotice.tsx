import Link from "next/link";
import {
  describeAlertsLayerFailure,
  type AlertsLayerFailure,
} from "@/lib/alerts-layer";

/**
 * Rendered in place of the alerts banner when the alerts layer could NOT be
 * read. It exists so a failed read is visually distinct from "no alerts" —
 * silence used to mean both, and a live emergency looked like a calm app.
 *
 * Deliberately not dismissable: the super must not be able to turn an unknown
 * emergency state back into silence.
 */
export default function AlertsUnavailableNotice({
  failure,
}: {
  failure: AlertsLayerFailure;
}) {
  return (
    <div
      role="alert"
      aria-label="Alerts unavailable"
      className="mb-4 rounded-xl2 border border-danger-600/40 bg-danger-50 px-4 py-3 text-danger-800"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full bg-danger-600"
          aria-hidden
        />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Alerts unavailable
        </span>
      </div>
      <p className="mt-1.5 text-sm">
        {describeAlertsLayerFailure(failure)}{" "}
        <strong>Assume nothing — check for yourself.</strong>
      </p>
      <Link
        href="/alerts"
        className="mt-1.5 inline-block text-xs font-medium underline underline-offset-2"
      >
        Open the alerts page →
      </Link>
    </div>
  );
}
