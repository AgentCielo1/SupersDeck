"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export interface AlertAckButtonProps {
  alertId: string;
  /** Open the note step immediately (used by the ?ack=1 deep link). */
  defaultOpen?: boolean;
  /** Visual variant — "overlay" inverts colors for the red emergency overlay. */
  variant?: "default" | "overlay";
}

/**
 * "I'm on it" acknowledgment control. Click reveals an optional note + confirm,
 * then POSTs /api/alerts/[id]/acknowledge and refreshes the route so the
 * server-rendered acked state updates.
 */
export default function AlertAckButton({
  alertId,
  defaultOpen = false,
  variant = "default",
}: AlertAckButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acked, setAcked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultOpen && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [defaultOpen]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setError("Could not record acknowledgment. Try again.");
        setSubmitting(false);
        return;
      }
      setAcked(true);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  const isOverlay = variant === "overlay";

  if (acked) {
    return (
      <div
        className={clsx(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          isOverlay
            ? "bg-white/20 text-white"
            : "border border-ok-600/30 bg-ok-50 text-ok-800"
        )}
        role="status"
      >
        ✓ You acknowledged this alert
      </div>
    );
  }

  const primaryBtn = isOverlay
    ? "rounded-md bg-white px-4 py-2 text-sm font-semibold text-danger-800 hover:bg-ink-50"
    : "rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60";

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Acknowledge this alert — I'm on it"
        onClick={() => setOpen(true)}
        className={primaryBtn}
      >
        I&apos;m on it
      </button>
    );
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional note (e.g. en route, ETA 10 min)…"
        aria-label="Acknowledgment note"
        className={clsx(
          "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2",
          isOverlay
            ? "border-white/40 bg-white/10 text-white placeholder-white/60 focus:ring-white/40"
            : "border-ink-200 bg-white text-ink-900 focus:border-brand-400 focus:ring-brand-100"
        )}
      />
      {error && (
        <div
          className={clsx(
            "rounded-md px-3 py-2 text-sm",
            isOverlay
              ? "bg-white/20 text-white"
              : "border border-danger-600/40 bg-danger-50 text-danger-800"
          )}
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          aria-label="Confirm acknowledgment"
          className={primaryBtn}
        >
          {submitting ? "Confirming…" : "Confirm — I'm on it"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => setOpen(false)}
          className={clsx(
            "rounded-md px-3 py-2 text-sm font-medium",
            isOverlay
              ? "text-white/80 hover:text-white"
              : "text-ink-600 hover:bg-ink-100"
          )}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
