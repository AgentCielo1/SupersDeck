"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";

// =============================================================================
//  PUBLIC tenant intake page — reachable via QR code in each lobby.
//  URL: /intake/<building-id>
// =============================================================================
//  No auth, no nav. After submit:
//    • Shows a QR code that links to /track/<ticket> so tenants can save it
//      to camera roll / share with a roommate / etc.
//    • Shows the tracking URL in big text + a copy button.
//    • If the tenant provided an email, the server emails them the same
//      link — see /api/work-orders POST.
// =============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  "no-heat": "No heat",
  "no-hot-water": "No hot water",
  leak: "Leak",
  electrical: "Electrical issue",
  appliance: "Broken appliance",
  "lock-key": "Lock / key issue",
  pest: "Pest",
  mold: "Mold",
  elevator: "Elevator",
  intercom: "Intercom",
  "common-area": "Common area issue",
  other: "Repair request",
};

export default function TenantIntakePage() {
  const params = useParams<{ buildingCode: string }>();
  const buildingId = params?.buildingCode ?? "";
  const [building, setBuilding] = useState<{ id: string; name: string; address: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<{ ticket_number: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildingId) return;
    let cancelled = false;
    fetch(`/api/buildings/${buildingId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((b) => {
        if (!cancelled) setBuilding(b);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold">Invalid building code</h1>
        <p className="mt-2 text-sm text-ink-400">
          Check the QR code in the lobby or ask your super.
        </p>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-ink-400">
        Loading…
      </div>
    );
  }

  if (ticket) {
    return <ConfirmationView ticket={ticket} />;
  }

  return (
    <div className="mx-auto max-w-md p-5">
      <div className="mb-5 text-center">
        <div className="text-xs uppercase tracking-wide text-ink-400">
          {building.name}
        </div>
        <h1 className="mt-1 text-lg font-semibold">Report an issue</h1>
        <p className="mt-1 text-xs text-ink-400">
          Fill this out and your super will see it right away.
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          const fd = new FormData(e.currentTarget);
          const body = Object.fromEntries(fd.entries()) as Record<string, string>;

          // Derive title from category + unit (the form intentionally doesn't
          // ask for one). Server has the same fallback as a safety net.
          const categoryLabel =
            CATEGORY_LABELS[body.category ?? "other"] ?? "Repair request";
          const titlePieces = [categoryLabel];
          if (body.unit_label) titlePieces.push(`Apt ${body.unit_label}`);
          (body as any).title = titlePieces.join(" — ");

          const res = await fetch("/api/work-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(
              data.error ?? "Couldn't send. Try again or call your super."
            );
            setSubmitting(false);
            return;
          }
          setTicket({ ticket_number: data.ticket_number });
        }}
      >
        <input type="hidden" name="building_id" value={building.id} />
        <Field label="Your name">
          <input name="reporter_name" required className={fieldClass} />
        </Field>
        <Field label="Apartment">
          <input
            name="unit_label"
            required
            placeholder="e.g. 7C"
            className={fieldClass}
          />
        </Field>
        <Field label="Phone (so we can update you)">
          <input
            name="reporter_phone"
            type="tel"
            inputMode="tel"
            className={fieldClass}
          />
        </Field>
        <Field label="Email (optional — we'll send your tracking link)">
          <input
            name="reporter_email"
            type="email"
            inputMode="email"
            className={fieldClass}
          />
        </Field>
        <Field label="What's the issue?">
          <select name="category" defaultValue="other" className={fieldClass}>
            <option value="no-heat">No heat</option>
            <option value="no-hot-water">No hot water</option>
            <option value="leak">Leak / water damage</option>
            <option value="electrical">Electrical</option>
            <option value="appliance">Appliance broken</option>
            <option value="lock-key">Lock / key</option>
            <option value="pest">Pest / bug</option>
            <option value="mold">Mold</option>
            <option value="elevator">Elevator</option>
            <option value="intercom">Intercom</option>
            <option value="common-area">Common area (hallway, lobby)</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Describe what's happening">
          <textarea
            name="description"
            rows={4}
            required
            className={fieldClass}
            placeholder="Where, when it started, anything you tried..."
          />
        </Field>
        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send to my super"}
        </button>
        <p className="text-center text-xs text-ink-400">
          Emergency (no heat, leak, gas, fire, lockout)? Call 311 or 911.
        </p>
      </form>
    </div>
  );
}

// =============================================================================
//  Confirmation view (after submit)
// =============================================================================
function ConfirmationView({
  ticket,
}: {
  ticket: { ticket_number: string };
}) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const trackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/track/${ticket.ticket_number}`
      : `/track/${ticket.ticket_number}`;

  useEffect(() => {
    QRCode.toDataURL(trackUrl, { width: 480, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrSrc)
      .catch(() => setQrSrc(""));
  }, [trackUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — copy isn't available everywhere
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-50 text-ok-800">
        <svg
          className="h-7 w-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1 className="mt-4 text-lg font-semibold">Got it — thanks.</h1>
      <p className="mt-2 text-sm text-ink-600">
        Your super has the report. Save this so you can check status anytime —
        no login needed.
      </p>

      <div className="mt-3 inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 font-mono text-base font-semibold">
        {ticket.ticket_number}
      </div>

      {qrSrc && (
        <div className="mt-4 flex flex-col items-center">
          <img
            src={qrSrc}
            alt={`QR code for ${trackUrl}`}
            className="h-48 w-48 rounded-md border border-ink-200"
          />
          <p className="mt-2 text-xs text-ink-400">
            Save this QR (long-press → Save Image) or copy the link below.
            Reopen anytime to see status updates.
          </p>
        </div>
      )}

      <div className="mt-4">
        <a
          href={`/track/${ticket.ticket_number}`}
          className="block w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Track this ticket →
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="mt-2 block w-full rounded-md border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          {copied ? "Copied!" : "Copy tracking link"}
        </button>
      </div>

      <p className="mt-4 text-xs text-ink-400">
        If this is an emergency (no heat, leak, fire, gas smell, lockout),
        please also call 311 or 911.
      </p>
    </div>
  );
}

const fieldClass =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
