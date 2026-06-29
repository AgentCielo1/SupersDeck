"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AlertResolveButtonProps {
  alertId: string;
}

/**
 * "Mark resolved" — admin/super/manager-only. POSTs /api/alerts/[id]/resolve
 * then refreshes. Asks for a quick confirm so an active life-safety alert
 * isn't closed by a stray tap.
 */
export default function AlertResolveButton({ alertId }: AlertResolveButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setError("Could not resolve. Try again.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        aria-label="Mark this alert resolved"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-100"
      >
        Mark resolved
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-600">Mark this alert resolved?</p>
      {error && (
        <div
          className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={resolve}
          className="rounded-md bg-ok-600 px-3 py-2 text-sm font-medium text-white hover:bg-ok-800 disabled:opacity-60"
        >
          {submitting ? "Resolving…" : "Yes, mark resolved"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => setConfirming(false)}
          className="rounded-md px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
