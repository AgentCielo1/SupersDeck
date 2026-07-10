"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Confirm-gated hard delete for a work order. Calls DELETE /api/work-orders/:id
// (admin-only server-side) and returns to the list on success. SupersDeck is the
// master, so this is the authoritative delete; the SupersDeck→FHI sync layer
// mirrors the removal to Forest Hills.
export default function DeleteWorkOrderButton({
  id,
  ticket,
}: {
  id: string;
  ticket: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (
      !window.confirm(
        `Delete work order ${ticket}?\n\nThis permanently removes it — including from Forest Hills once sync is live — and cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Couldn't delete this work order.");
        setBusy(false);
        return;
      }
      router.push("/work-orders");
      router.refresh();
    } catch {
      alert("Couldn't delete this work order.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="rounded-md border border-danger-600/40 bg-white px-3 py-2 text-sm font-medium text-danger-800 hover:bg-danger-50 disabled:opacity-60"
    >
      {busy ? "Deleting…" : "🗑 Delete"}
    </button>
  );
}
