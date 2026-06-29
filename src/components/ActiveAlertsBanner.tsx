"use client";

import Link from "next/link";
import clsx from "clsx";
import { TIERS, type AlertTier } from "@/lib/alert-tiers";
import { TIER_BANNER, TIER_DOT, tierLabel } from "@/lib/alert-ui";
import { relativeTime } from "@/lib/format";
import AlertAckButton from "@/components/AlertAckButton";

export interface ActiveAlertSummary {
  id: string;
  tier: AlertTier;
  title: string;
  created_at: string;
  ackCount: number;
  expectedSuperCount: number;
  ackedByMe: boolean;
}

const MANAGER_ROLES = new Set(["admin", "super", "manager"]);

/**
 * Persistent stacked banner of ACTIVE alerts. The integrator mounts this at the
 * top of the content area (sticky-friendly). Renders null when there's nothing
 * active.
 */
export default function ActiveAlertsBanner({
  alerts,
  userRole,
}: {
  alerts: ActiveAlertSummary[];
  userRole: string;
}) {
  if (alerts.length === 0) return null;
  const canManage = MANAGER_ROLES.has(userRole);

  return (
    <div className="mb-4 space-y-2" role="region" aria-label="Active alerts">
      {alerts.map((a) => {
        const requiresAck = TIERS[a.tier].requiresAck;
        return (
          <div
            key={a.id}
            className={clsx(
              "rounded-xl2 border px-4 py-3",
              TIER_BANNER[a.tier]
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={clsx("h-2.5 w-2.5 rounded-full", TIER_DOT[a.tier])}
                  aria-hidden
                />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {tierLabel(a.tier)}
                </span>
                <Link href={`/alerts/${a.id}`} className="font-semibold hover:underline">
                  {a.title}
                </Link>
              </div>
              <span className="text-xs opacity-80">{relativeTime(a.created_at)}</span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              {requiresAck && (
                <span className="text-xs opacity-90">
                  {a.ackCount} of {a.expectedSuperCount} super
                  {a.expectedSuperCount === 1 ? "" : "s"} acknowledged
                </span>
              )}
              <div className="ml-auto flex items-center gap-3">
                {requiresAck && !a.ackedByMe && (
                  <AlertAckButton alertId={a.id} />
                )}
                {canManage && (
                  <Link
                    href={`/alerts/${a.id}`}
                    className="text-xs font-medium underline-offset-2 hover:underline"
                  >
                    Manage / resolve →
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
