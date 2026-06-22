"use client";

import { useEffect, useState } from "react";
import { qrDataUrl } from "@workorder/kit/qr/qr";

// Per-door "Contractor sign-in" QR poster (client). Encodes /sign-in/:buildingId
// so a contractor scans with their own phone — no app install. (NN/g: label the
// code explicitly and deep-link straight to the sign-in screen.)

type B = { id: string; name: string; address?: string | null };

export default function QrPosterClient({ buildings }: { buildings: B[] }) {
  const [sel, setSel] = useState(buildings[0]?.id ?? "");
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const url = sel && origin ? `${origin}/sign-in/${sel}` : "";
  useEffect(() => {
    if (!url) {
      setQr("");
      return;
    }
    qrDataUrl(url, { width: 720, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  const b = buildings.find((x) => x.id === sel);
  const smsBody = b
    ? `Sign in before starting work at ${b.name}: ${url}`
    : url;
  const smsHref = `sms:?&body=${encodeURIComponent(smsBody)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is still visible on the poster */
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Contractor sign-in", text: smsBody, url });
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <div className="space-y-5">
      <style>{`@media print { .no-print { display:none !important } @page { size: letter; margin: 0.5in } }`}</style>

      <div className="no-print">
        <h1 className="text-2xl font-semibold">Contractor sign-in QR</h1>
        <p className="mt-1 text-sm text-ink-400">
          Print and tape by each building&apos;s service entrance. Contractors scan to sign in.
        </p>
      </div>

      <div className="no-print flex flex-wrap items-center gap-3">
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="rounded-md border border-ink-200 px-3 py-2 text-sm"
        >
          {buildings.length === 0 && <option value="">No buildings found</option>}
          {buildings.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!qr}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Print poster
        </button>
      </div>

      {url && (
        <div className="no-print flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-400">Send to a contractor:</span>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-ink-200 px-3 py-1.5 font-medium text-ink-600 hover:bg-ink-100"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <a
            href={smsHref}
            className="rounded-md border border-ink-200 px-3 py-1.5 font-medium text-ink-600 hover:bg-ink-100"
          >
            Text link
          </a>
          {canShare && (
            <button
              type="button"
              onClick={share}
              className="rounded-md border border-ink-200 px-3 py-1.5 font-medium text-ink-600 hover:bg-ink-100"
            >
              Share…
            </button>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[8.5in] rounded-xl border border-ink-200 bg-white p-10 text-center text-black shadow-sm">
        <div className="text-xs uppercase tracking-widest text-ink-400">{b?.name ?? "—"}</div>
        {b?.address && <div className="mt-1 text-sm text-ink-500">{b.address}</div>}
        <div className="mt-6 text-[40px] font-bold leading-tight">Contractor sign-in</div>
        <div className="mt-1 text-lg text-ink-500">Scan before you start work</div>
        <div className="mt-6 flex flex-col items-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`Sign-in QR for ${b?.name ?? "building"}`} className="h-72 w-72" />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center border border-dashed border-ink-200 text-xs text-ink-400">
              Generating QR…
            </div>
          )}
          {url && (
            <div className="mt-4 break-all rounded-md border border-ink-200 bg-ink-50 px-3 py-1.5 font-mono text-xs text-ink-500">
              {url}
            </div>
          )}
        </div>
        <ol className="mx-auto mt-6 max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-ink-600">
          <li>Open your phone camera.</li>
          <li>Point it at the square above.</li>
          <li>Tap the link, pick your company, sign in.</li>
        </ol>
        <div className="mt-6 rounded-md border-2 border-danger bg-danger/5 p-3 text-sm font-medium text-danger">
          Uninsured contractors will be turned away. Keep your company&apos;s COI current.
        </div>
      </div>
    </div>
  );
}
