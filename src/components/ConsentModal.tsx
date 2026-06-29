"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export interface ConsentModalProps {
  /** Integrator decides this — true on first login after the feature ships. */
  open: boolean;
}

type Choice = "unset" | "allow" | "deny";

/**
 * Non-dismissible consent gate. The user MUST make an explicit yes/no choice for
 * Push and SMS — neither defaults to "yes" or "no" so a denial is a deliberate
 * selection (NY all-party / opt-in posture). POSTs /api/profile/consent.
 * No close button, no backdrop dismiss.
 */
export default function ConsentModal({ open }: ConsentModalProps) {
  const router = useRouter();
  const [push, setPush] = useState<Choice>("unset");
  const [sms, setSms] = useState<Choice>("unset");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const bothChosen = push !== "unset" && sms !== "unset";
  const smsAllowed = sms === "allow";

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          push_consent: push === "allow",
          sms_consent: sms === "allow",
          phone_number: smsAllowed && phone.trim() ? phone.trim() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setError("Could not save your choices. Try again.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/60 p-4"
    >
      <div className="w-full max-w-md rounded-xl2 border border-ink-200 bg-white p-6 shadow-xl">
        <h2 id="consent-title" className="text-lg font-semibold text-ink-900">
          Notification preferences
        </h2>
        <p id="consent-desc" className="mt-2 text-sm text-ink-600">
          BoroDesk uses push notifications and SMS to send you operational alerts
          from your building management. Standard messaging rates apply. You may
          opt out at any time in Settings.
        </p>

        <div className="mt-5 space-y-4">
          <ChannelChoice
            label="Push notifications"
            value={push}
            onChange={setPush}
          />
          <ChannelChoice label="SMS text messages" value={sms} onChange={setSms} />

          {smsAllowed && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">
                Mobile number (for SMS)
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
          )}
        </div>

        {error && (
          <div
            className="mt-4 rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!bothChosen || submitting}
          onClick={save}
          aria-label="Save notification choices"
          className="mt-6 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save choices"}
        </button>
        {!bothChosen && (
          <p className="mt-2 text-center text-xs text-ink-400">
            Choose Allow or No thanks for each to continue.
          </p>
        )}
      </div>
    </div>
  );
}

function ChannelChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Choice;
  onChange: (c: Choice) => void;
}) {
  return (
    <div className="rounded-md border border-ink-200 p-3">
      <div className="text-sm font-medium text-ink-900">{label}</div>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-2 inline-flex overflow-hidden rounded-md border border-ink-200"
      >
        <SegBtn
          selected={value === "allow"}
          onClick={() => onChange("allow")}
          tone="allow"
        >
          Allow
        </SegBtn>
        <SegBtn
          selected={value === "deny"}
          onClick={() => onChange("deny")}
          tone="deny"
        >
          No thanks
        </SegBtn>
      </div>
    </div>
  );
}

function SegBtn({
  selected,
  onClick,
  tone,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  tone: "allow" | "deny";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        "px-4 py-1.5 text-sm font-medium transition",
        selected && tone === "allow" && "bg-brand-600 text-white",
        selected && tone === "deny" && "bg-ink-600 text-white",
        !selected && "bg-white text-ink-600 hover:bg-ink-50"
      )}
    >
      {children}
    </button>
  );
}
