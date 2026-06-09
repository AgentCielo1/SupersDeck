"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { COMPLIANCE_TEMPLATES } from "@/data/compliance-templates";

// =============================================================================
//  Add a certification
// =============================================================================
//  The "type" field is free text but we suggest the FDNY / EPA / OSHA names
//  from the compliance templates so the user can pick a known one quickly.
// =============================================================================

const SUGGESTED_TYPES = COMPLIANCE_TEMPLATES.filter(
  (t) => t.category === "Certifications"
).map((t) => ({ value: t.name, agency: t.agency }));

export default function NewCertificationPage() {
  const router = useRouter();
  const [holderName, setHolderName] = useState("");
  const [type, setType] = useState(SUGGESTED_TYPES[0]?.value ?? "");
  const [number, setNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [agency, setAgency] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holder_name: holderName,
        type,
        number,
        issued_at: issuedAt || null,
        expires_at: expiresAt,
        agency: agency || null,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    router.push("/certifications");
    router.refresh();
  }

  // Auto-fill agency when picking a known type
  function onTypeChange(v: string) {
    setType(v);
    const known = SUGGESTED_TYPES.find((s) => s.value === v);
    if (known) setAgency(known.agency);
  }

  return (
    <>
      <PageHeader
        title="Add a certification"
        subtitle="Track your own and your staff's FDNY Certs of Fitness, EPA RRP, OSHA, etc. Reminds you before any expire."
        actions={
          <Link
            href="/certifications"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Certifications
          </Link>
        }
      />

      <form onSubmit={submit} className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-5">
        <Field label="Holder name *">
          <input value={holderName} onChange={(e) => setHolderName(e.target.value)} required placeholder="e.g. Candiany Rodriguez" className={input} />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Certificate type *">
            <input
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              list="cert-suggestions"
              required
              className={input}
            />
            <datalist id="cert-suggestions">
              {SUGGESTED_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.agency}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Certificate / license number *">
            <input value={number} onChange={(e) => setNumber(e.target.value)} required className={input} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Issued">
            <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className={input} />
          </Field>
          <Field label="Expires *">
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required className={input} />
          </Field>
          <Field label="Agency">
            <input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="FDNY / EPA / OSHA" className={input} />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Renewal class scheduled for Sept 10." className={input} />
        </Field>

        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">{error}</div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
            {saving ? "Saving…" : "Add certification"}
          </button>
          <Link href="/certifications" className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

const input = "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
