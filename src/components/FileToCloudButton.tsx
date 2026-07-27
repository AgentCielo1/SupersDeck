"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Files the WO (summary PDF + photos) into the connected Dropbox at
// /<Building>/<Apt>/Work Orders. Optional feature — if no drive is connected
// the API answers 503 and we surface that gently.
export default function FileToCloudButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function file() {
    setBusy(true);
    try {
      const res = await fetch(`/api/work-orders/${id}/file-to-cloud`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Couldn't file this work order.");
        return;
      }
      alert(`Filed ${data.filed.length} file(s) to Dropbox:\n${data.folder}`);
      router.refresh();
    } catch {
      alert("Couldn't file this work order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={file}
      disabled={busy}
      className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-60"
    >
      {busy ? "Filing…" : "📁 File to Dropbox"}
    </button>
  );
}
