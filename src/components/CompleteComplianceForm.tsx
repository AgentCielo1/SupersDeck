"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteComplianceForm({
  building_id,
  template_id,
}: {
  building_id: string;
  template_id: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [lastCompleted, setLastCompleted] = useState(today);
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/compliance-items/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        building_id,
        template_id,
        last_completed: lastCompleted,
        vendor_id: vendor.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    router.push("/compliance");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-5"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">
          Last completed date *
        </span>
        <input
          type="date"
          value={lastCompleted}
          onChange={(e) => setLastCompleted(e.target.value)}
          required
          max={today}
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-ink-400">
          The next deadline is computed from this date (e.g. annual items → +1
          year, 5-yr items → +5 years).
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">
          Vendor used (optional)
        </span>
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="e.g. Reliable Plumbing & Heat Co."
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-ink-400">
          Free text for now — phase 4 will link to a vendor from My Vendors.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">
          Notes (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Passed inspection. Cert filed with DOB."
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
        />
      </label>

      {error && (
        <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Mark complete"}
        </button>
      </div>
    </form>
  );
}
