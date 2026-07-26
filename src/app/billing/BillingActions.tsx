"use client";

import { useState } from "react";

// =============================================================================
//  Billing action buttons (client)
// =============================================================================
//  - "Upgrade" / "Add Buildings" → POST /api/billing/create-checkout, then
//    redirect to the returned Stripe Checkout URL.
//  - "Manage Billing" → navigate to GET /api/billing/portal (which 303-redirects
//    into the Stripe Customer Portal).
// =============================================================================

export interface BillingActionsProps {
  /** Whether the org already has an active paid subscription. */
  isActive: boolean;
  /** Whether the org has a Stripe customer (portal is reachable). */
  hasCustomer: boolean;
}

export default function BillingActions({
  isActive,
  hasCustomer,
}: BillingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function openPortal() {
    window.location.href = "/api/billing/portal";
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Starting…"
          : isActive
          ? "Add Buildings"
          : "Upgrade — $49/building/mo"}
      </button>

      {hasCustomer && (
        <button
          type="button"
          onClick={openPortal}
          disabled={loading}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Manage Billing
        </button>
      )}

      {error && (
        <p className="w-full text-sm text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
