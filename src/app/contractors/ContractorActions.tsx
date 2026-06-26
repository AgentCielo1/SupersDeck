"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Per-row Edit / Delete for a contractor (vendor). Reuses the vendor CRUD API.
export default function ContractorActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm(`Delete contractor "${name}"? This removes the company and its COI records.`)) return;
    setBusy(true);
    const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("Delete failed");
  }

  return (
    <div className="flex shrink-0 items-center gap-2 text-xs">
      <Link
        href={`/vendors/${id}/edit`}
        className="rounded-md border border-ink-200 px-2.5 py-1 font-medium text-ink-600 hover:bg-ink-50"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="rounded-md border border-ink-200 px-2.5 py-1 font-medium text-danger-800 hover:bg-danger-50 disabled:opacity-50"
      >
        {busy ? "…" : "Delete"}
      </button>
    </div>
  );
}
