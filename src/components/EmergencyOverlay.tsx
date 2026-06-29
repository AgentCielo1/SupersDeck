"use client";

import { useState } from "react";
import type { AlertTier } from "@/lib/alerts";
import AlertAckButton from "@/components/AlertAckButton";

export interface EmergencyOverlayAlert {
  id: string;
  tier: AlertTier;
  title: string;
  message: string;
  ackedByMe: boolean;
}

/**
 * Full-screen, non-dismissible red overlay for unacknowledged EMERGENCY alerts.
 * Covers everything (z-[100]) until the user acknowledges. If several emergencies
 * are unacked, they're shown one at a time; acking the last one clears it (the
 * embedded ack button refreshes the route, re-rendering this with fewer alerts).
 */
export default function EmergencyOverlay({
  alerts,
}: {
  alerts: EmergencyOverlayAlert[];
}) {
  const unacked = alerts.filter(
    (a) => a.tier === "emergency" && !a.ackedByMe
  );
  const [index] = useState(0);

  if (unacked.length === 0) return null;
  const current = unacked[Math.min(index, unacked.length - 1)];

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Emergency alert"
      aria-describedby="emergency-overlay-message"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-danger-600/95 p-6 text-white"
    >
      <div className="w-full max-w-lg">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
          Emergency
          {unacked.length > 1 && (
            <span className="ml-2 font-normal">
              1 of {unacked.length}
            </span>
          )}
        </div>
        <h2 className="mt-2 text-3xl font-bold leading-tight">{current.title}</h2>
        <p
          id="emergency-overlay-message"
          className="mt-3 whitespace-pre-wrap text-lg leading-relaxed"
        >
          {current.message}
        </p>

        <p className="mt-6 border-t border-white/30 pt-4 text-sm text-white/80">
          This operational alert is supplementary to your building&apos;s
          required FDNY-posted emergency notices. Follow your building&apos;s
          posted emergency instructions.
        </p>

        <div className="mt-6">
          <AlertAckButton
            alertId={current.id}
            defaultOpen
            variant="overlay"
          />
        </div>
      </div>
    </div>
  );
}
