"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshViolationsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/violations/refresh", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setResult(`Error: ${data.error ?? "unknown"}`);
      return;
    }
    const total = Object.values(data.summary ?? {}).reduce(
      (s: number, v: any) => s + (v?.fetched ?? 0),
      0
    );
    const totalNew = Object.values(data.summary ?? {}).reduce(
      (s: number, v: any) => s + (v?.new ?? 0),
      0
    );
    setResult(
      totalNew > 0
        ? `Synced ${total} rows · ${totalNew} new`
        : `Synced ${total} rows · no new violations`
    );
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-60"
      >
        {busy ? "Syncing…" : "↻ Refresh from HPD"}
      </button>
      {result && <span className="text-xs text-ink-400">{result}</span>}
    </div>
  );
}
