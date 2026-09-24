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
    const count = (obj: unknown, key: "fetched" | "new") =>
      Object.values((obj ?? {}) as Record<string, any>).reduce(
        (s: number, v: any) => s + (v?.[key] ?? 0),
        0
      );
    // HPD per-building counts + OATH/ECB per-lot counts, one honest line —
    // and a failed or skipped ECB pull is NAMED, never hidden behind a happy
    // HPD total (that hiding cost a debugging round on 2026-09-24).
    const total = count(data.summary, "fetched") + count(data.ecb, "fetched");
    const totalNew = count(data.summary, "new") + count(data.ecb, "new");
    const ecbEntries = Object.values(
      (data.ecb ?? {}) as Record<string, any>
    ) as any[];
    const ecbFail = ecbEntries.find((e) => e?.status === "failed");
    const ecbSkip = ecbEntries.find((e) => e?.status === "skipped");
    const base =
      totalNew > 0
        ? `Synced ${total} rows · ${totalNew} new`
        : `Synced ${total} rows · nothing new`;
    setResult(
      ecbFail
        ? `${base} — ECB FAILED: ${ecbFail.reason}${ecbFail.detail ? ` (${ecbFail.detail})` : ""}`
        : ecbSkip
        ? `${base} — ECB skipped: ${ecbSkip.reason}`
        : base
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
        {busy ? "Syncing…" : "↻ Refresh from NYC Open Data"}
      </button>
      {result && <span className="text-xs text-ink-400">{result}</span>}
    </div>
  );
}
