"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";
import PageHeader from "@/components/PageHeader";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { PHOTO_BUCKET as WO_BUCKET } from "@/lib/buckets";
import { compressImage } from "@workorder/kit/intake/compressImage";

// =============================================================================
//  Work-order completion — three ways to close
// =============================================================================
//  1. Sign on phone   — tenant signs the pad (original flow).
//  2. Signed paper    — most jobs are signed on the PRINTED work order:
//                       photograph it; it attaches as the signed record and
//                       Claude vision crops the handwritten signature into the
//                       app's signature field (best-effort — the photo is
//                       always the authoritative proof).
//  3. No signature    — explicit close-out with a confirm, for jobs with no
//                       signable paper and no tenant present.
// =============================================================================

type Mode = "pad" | "paper" | "none";

type PaperState = {
  previewUrl: string;
  uploadedPath?: string;
  extracted?: string; // cropped signature data URL
  extractNote?: string;
  busy: boolean;
  error?: string;
};

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/** Crop the signature region out of the photographed page (client-side). */
async function cropSignature(
  dataUrl: string,
  box: { x: number; y: number; w: number; h: number }
): Promise<string | null> {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = dataUrl;
  });
  const pad = 0.04; // breathing room around the stroke
  const sx = Math.max(0, (box.x - pad * box.w) * img.naturalWidth);
  const sy = Math.max(0, (box.y - pad * box.h) * img.naturalHeight);
  const sw = Math.min(img.naturalWidth - sx, box.w * (1 + 2 * pad) * img.naturalWidth);
  const sh = Math.min(img.naturalHeight - sy, box.h * (1 + 2 * pad) * img.naturalHeight);
  if (sw < 20 || sh < 8) return null;

  const targetW = Math.min(600, sw);
  const scale = targetW / sw;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/png");
  return out.length <= 240_000 ? out : canvas.toDataURL("image/jpeg", 0.8);
}

export default function CompleteWorkOrderPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [wo, setWo] = useState<{
    title?: string;
    ticket_number?: string;
    reporter_name?: string;
  } | null>(null);

  const [mode, setMode] = useState<Mode>("paper");
  const padRef = useRef<SignaturePadHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [signerName, setSignerName] = useState("");
  const [notes, setNotes] = useState("");
  const [padEmpty, setPadEmpty] = useState(true);
  const [paper, setPaper] = useState<PaperState | null>(null);
  const [useExtracted, setUseExtracted] = useState(true);
  const [noSigConfirm, setNoSigConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Real WO for the header + signer prefill (falls back to the bare id).
  useEffect(() => {
    if (!id) return;
    let gone = false;
    fetch(`/api/work-orders/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (gone || !d) return;
        setWo(d);
        if (d.reporter_name) setSignerName((s) => s || d.reporter_name);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [id]);

  async function onPickPaper(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);

    const compressed = await compressImage(f);
    const dataUrl = await fileToDataURL(compressed);
    setPaper({ previewUrl: dataUrl, busy: true });

    // Upload the paper photo + locate the signature, concurrently.
    const sb = getBrowserSupabase();
    const path = `wo/${crypto.randomUUID()}-signed-paper.jpg`;
    const [up, ex] = await Promise.allSettled([
      sb.storage.from(WO_BUCKET).upload(path, compressed, { upsert: false }),
      fetch(`/api/work-orders/${id}/extract-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      }).then((r) => r.json()),
    ]);

    if (up.status === "rejected" || up.value.error) {
      setPaper({
        previewUrl: dataUrl,
        busy: false,
        error: "Couldn't upload the photo — check your connection and retake it.",
      });
      return;
    }

    let extracted: string | undefined;
    let extractNote = "Signature not auto-detected — the photo itself is the signed record.";
    if (ex.status === "fulfilled" && ex.value?.found && ex.value.box) {
      const crop = await cropSignature(dataUrl, ex.value.box).catch(() => null);
      if (crop) {
        extracted = crop;
        extractNote = "Signature found on the paper — attaching it digitally too.";
      }
    }
    setPaper({ previewUrl: dataUrl, uploadedPath: path, extracted, extractNote, busy: false });
  }

  async function submit() {
    setError(null);

    const payload: Record<string, unknown> = {
      internal_notes: notes.trim() || null,
    };
    if (mode === "pad") {
      if (padEmpty || !padRef.current) return setError("Please sign before submitting.");
      if (!signerName.trim()) return setError("Please enter the tenant's name.");
      payload.signature = padRef.current.toDataURL();
      payload.signed_by_name = signerName.trim();
    } else if (mode === "paper") {
      if (!paper?.uploadedPath) return setError("Photograph the signed paper work order first.");
      payload.paper_photo_path = paper.uploadedPath;
      if (signerName.trim()) payload.signed_by_name = signerName.trim();
      if (useExtracted && paper.extracted) payload.signature = paper.extracted;
    } else {
      if (!noSigConfirm) return setError("Tick the confirmation to close without a signature.");
      payload.no_signature = true;
    }

    setSaving(true);
    const res = await fetch(`/api/work-orders/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    setDone(true);
    setSaving(false);
  }

  if (done) {
    return (
      <>
        <PageHeader title="Work order completed" />
        <div className="rounded-xl2 border border-ok-600/40 bg-ok-50 p-6 text-center">
          <div className="text-base font-semibold text-ok-800">
            {mode === "none" ? "Closed out." : `Thanks${signerName ? ` ${signerName}` : ""}.`}
          </div>
          <div className="mt-1 text-sm text-ok-800">
            {mode === "paper"
              ? "The job is complete and the signed paper work order is on file."
              : mode === "pad"
              ? "The job is marked complete and the signature is on file."
              : "The job is marked complete (no signature)."}
          </div>
          <Link
            href={`/work-orders/${id}`}
            className="mt-4 inline-block rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            View work order
          </Link>
        </div>
      </>
    );
  }

  const modeBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError(null);
      }}
      className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold ${
        mode === m ? "bg-white text-ink-900 shadow-sm" : "text-ink-400 hover:text-ink-600"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        title={wo?.title ?? "Complete work order"}
        subtitle={wo ? `${wo.ticket_number}${wo.reporter_name ? ` · ${wo.reporter_name}` : ""}` : id}
        actions={
          <Link
            href={`/work-orders/${id}`}
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Back
          </Link>
        }
      />

      <div className="space-y-5 rounded-xl2 border border-ink-200 bg-white p-5">
        <div className="flex rounded-md border border-ink-200 bg-ink-50 p-0.5">
          {modeBtn("paper", "📄 Signed paper")}
          {modeBtn("pad", "✍️ Sign on phone")}
          {modeBtn("none", "No signature")}
        </div>

        {mode === "paper" && (
          <>
            <div className="rounded-md border border-brand-400/30 bg-brand-50 p-3 text-sm text-brand-800">
              <div className="font-semibold">Photograph the signed paper work order.</div>
              <p className="mt-1 text-xs">
                The photo becomes the signed record on this ticket, and the
                signature is lifted off the page into the app automatically.
              </p>
            </div>

            {!paper && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-md border-2 border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center text-sm font-medium text-ink-600 hover:border-brand-400 hover:text-brand-800"
              >
                📷 Photograph signed work order
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPickPaper}
            />

            {paper && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paper.previewUrl}
                    alt="Signed paper work order"
                    className="h-32 w-24 rounded-md border border-ink-200 object-cover"
                  />
                  <div className="flex-1 text-sm">
                    {paper.busy ? (
                      <span className="text-ink-400">Uploading & finding the signature…</span>
                    ) : paper.error ? (
                      <span className="text-danger-800">{paper.error}</span>
                    ) : (
                      <span className="text-ink-600">{paper.extractNote}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="mt-2 block text-xs text-brand-600 hover:underline"
                    >
                      Retake photo
                    </button>
                  </div>
                </div>

                {paper.extracted && (
                  <label className="flex items-center gap-3 rounded-md border border-ink-200 bg-ink-50 p-3">
                    <input
                      type="checkbox"
                      checked={useExtracted}
                      onChange={(e) => setUseExtracted(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs font-medium text-ink-600">
                      Use as digital signature
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paper.extracted}
                      alt="Extracted signature"
                      className="ml-auto h-12 rounded border border-ink-200 bg-white px-2"
                    />
                  </label>
                )}
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">
                Signed by (optional)
              </span>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-base"
                placeholder="Tenant name on the paper"
              />
            </label>
          </>
        )}

        {mode === "pad" && (
          <>
            <div className="rounded-md border border-brand-400/30 bg-brand-50 p-3 text-sm text-brand-800">
              <div className="font-semibold">Hand the phone to the tenant.</div>
              <p className="mt-1 text-xs">
                They&apos;ll confirm the job is done by signing below.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">Tenant name</span>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-base"
                placeholder="Print your name"
              />
            </label>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-600">Sign with your finger</span>
                <button
                  type="button"
                  onClick={() => padRef.current?.clear()}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Clear
                </button>
              </div>
              <SignaturePad ref={padRef} height={200} onChange={setPadEmpty} />
              <p className="mt-1 text-xs text-ink-400">
                By signing you confirm the work described above was completed to
                your satisfaction.
              </p>
            </div>
          </>
        )}

        {mode === "none" && (
          <>
            <div className="rounded-md border border-warn-600/30 bg-warn-50 p-3 text-sm text-warn-800">
              <div className="font-semibold">Closing without any signature.</div>
              <p className="mt-1 text-xs">
                Use this only when there&apos;s no signed paper and no tenant
                present — the ticket will show no proof-of-completion signature.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={noSigConfirm}
                onChange={(e) => setNoSigConfirm(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>I confirm the work is done and I&apos;m closing this without a signature.</span>
            </label>
          </>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">
            Handyman notes (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Replaced steam trap on living room radiator."
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
        </label>

        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={
            saving ||
            (mode === "pad" && (padEmpty || !signerName.trim())) ||
            (mode === "paper" && (!paper?.uploadedPath || paper.busy)) ||
            (mode === "none" && !noSigConfirm)
          }
          className="w-full rounded-md bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : mode === "paper"
            ? "Mark complete — signed paper on file"
            : mode === "pad"
            ? "Mark complete with signature"
            : "Mark complete without signature"}
        </button>
      </div>
    </>
  );
}
