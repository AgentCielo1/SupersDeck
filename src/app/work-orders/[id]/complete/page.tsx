"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";
import PageHeader from "@/components/PageHeader";
import { SAMPLE_WORK_ORDERS } from "@/data/sample-data";

// =============================================================================
//  Tenant completion-signature flow
// =============================================================================
//  Handyman opens this on their phone, hands phone to tenant. Tenant types
//  their name and signs. Submit marks the work order completed in the DB.
// =============================================================================

export default function CompleteWorkOrderPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  // Best-effort lookup so we can show the WO title. Live mode could re-fetch.
  const wo = SAMPLE_WORK_ORDERS.find((w) => w.id === id || w.ticket_number === id);

  const padRef = useRef<SignaturePadHandle | null>(null);
  const [signerName, setSignerName] = useState("");
  const [notes, setNotes] = useState("");
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Prefill signer with tenant name if known.
  useEffect(() => {
    if (wo?.reporter_name && !signerName) setSignerName(wo.reporter_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wo?.id]);

  async function submit() {
    if (empty || !padRef.current) {
      setError("Please sign before submitting.");
      return;
    }
    if (!signerName.trim()) {
      setError("Please enter the tenant's name.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/work-orders/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signature: padRef.current.toDataURL(),
        signed_by_name: signerName.trim(),
        internal_notes: notes.trim() || null,
      }),
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
            Thanks {signerName}.
          </div>
          <div className="mt-1 text-sm text-ok-800">
            The job is marked complete and the signature is on file.
          </div>
          <Link
            href="/work-orders"
            className="mt-4 inline-block rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Back to work orders
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={wo?.title ?? "Complete work order"}
        subtitle={wo ? `${wo.ticket_number} · ${wo.reporter_name}` : id}
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
        <div className="rounded-md border border-brand-400/30 bg-brand-50 p-3 text-sm text-brand-800">
          <div className="font-semibold">Hand the phone to the tenant.</div>
          <p className="mt-1 text-xs">
            They'll confirm the job is done by signing below. Their signature
            becomes the proof of completion on file.
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">
            Tenant name
          </span>
          <input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-base"
            placeholder="Print your name"
          />
        </label>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-600">
              Sign with your finger
            </span>
            <button
              type="button"
              onClick={() => padRef.current?.clear()}
              className="text-xs text-brand-600 hover:underline"
            >
              Clear
            </button>
          </div>
          <SignaturePad ref={padRef} height={200} onChange={setEmpty} />
          <p className="mt-1 text-xs text-ink-400">
            By signing you confirm the work described above was completed to
            your satisfaction.
          </p>
        </div>

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
          disabled={saving || empty || !signerName.trim()}
          className="w-full rounded-md bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Mark complete with signature"}
        </button>
      </div>
    </>
  );
}
