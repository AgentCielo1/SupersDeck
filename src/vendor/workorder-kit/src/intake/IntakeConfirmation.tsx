"use client";

import { useEffect, useState } from "react";
import { qrDataUrl } from "../qr/qr";
import type { IntakeStrings } from "./strings";

export interface IntakeConfirmationProps {
  /** Shown only when a trackable ticket exists. */
  ticketNumber?: string;
  /** Canonical public tracking URL. When omitted (e.g. a review-queue intake
   *  with no public tracking), a simple "received" confirmation is shown. */
  trackUrl?: string;
  strings: IntakeStrings;
}

export function IntakeConfirmation({
  ticketNumber,
  trackUrl,
  strings: t,
}: IntakeConfirmationProps) {
  const [qrSrc, setQrSrc] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!trackUrl) return;
    qrDataUrl(trackUrl, { width: 480 })
      .then(setQrSrc)
      .catch(() => setQrSrc(""));
  }, [trackUrl]);

  async function copyLink() {
    if (!trackUrl) return;
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
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
      <h1 className="mt-4 text-lg font-semibold text-zinc-900">{t.thanks}</h1>

      {trackUrl && <p className="mt-2 text-sm text-zinc-600">{t.bookmark}</p>}

      {trackUrl && ticketNumber && (
        <div className="mt-3 inline-block rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-base font-semibold">
          {ticketNumber}
        </div>
      )}

      {trackUrl && qrSrc && (
        <div className="mt-4 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR code for ${trackUrl}`}
            className="h-48 w-48 rounded-md border border-zinc-300"
          />
          <p className="mt-2 text-xs text-zinc-500">{t.saved}</p>
        </div>
      )}

      {trackUrl && (
        <div className="mt-4">
          <a
            href={trackUrl}
            className="block w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t.track}
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500">{t.emergency}</p>
    </div>
  );
}
