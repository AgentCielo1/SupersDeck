"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { DOC_BUCKET, DOC_CATEGORIES } from "@/types/documents";

export type FileRow = {
  id: string;
  name: string;
  category: string;
  buildingId: string | null;
  building: string | null;
  unitId: string | null;
  apt: string | null;
  createdAt: string;
};
type Ref = { id: string; name: string };
type UnitRef = { id: string; building_id: string; label: string };

export default function FilesBrowser({
  rows,
  buildings,
  units,
}: {
  rows: FileRow[];
  buildings: Ref[];
  units: UnitRef[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<string>("Other");
  const [buildingId, setBuildingId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("all");
  const [fBldg, setFBldg] = useState("all");

  const unitOptions = useMemo(
    () => (buildingId ? units.filter((u) => u.building_id === buildingId) : []),
    [buildingId, units]
  );

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true);
    setErr("");
    try {
      const sb = getBrowserSupabase();
      for (const f of files) {
        const safe = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `up/${crypto.randomUUID()}-${safe}`;
        const { error } = await sb.storage
          .from(DOC_BUCKET)
          .upload(path, f, { upsert: false });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.name,
            path,
            category,
            building_id: buildingId || null,
            unit_id: unitId || null,
            mime: f.type || null,
            size: f.size,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Save failed");
        }
      }
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const presentCats = Array.from(new Set(rows.map((r) => r.category))).sort();
  const filtered = rows.filter((r) => {
    if (fCat !== "all" && r.category !== fCat) return false;
    if (fBldg !== "all" && r.buildingId !== fBldg) return false;
    if (words.length) {
      const s = `${r.name} ${r.category} ${r.building ?? ""} ${r.apt ?? ""}`.toLowerCase();
      if (!words.every((w) => s.includes(w))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Upload */}
      <form onSubmit={upload} className="rounded-xl2 border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-400">File(s)</span>
            <input
              ref={fileRef}
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-xs text-ink-600 file:mr-2 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-xs file:font-medium"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-400">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-40 rounded-md border border-ink-200 px-3 py-2 text-sm"
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-400">Building</span>
            <select
              value={buildingId}
              onChange={(e) => {
                setBuildingId(e.target.value);
                setUnitId("");
              }}
              className="w-40 rounded-md border border-ink-200 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-400">Apartment</span>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              disabled={!buildingId}
              className="w-28 rounded-md border border-ink-200 px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">—</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy || !files.length}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
        {files.length > 0 && (
          <p className="mt-2 text-xs text-ink-400">{files.length} file(s) selected</p>
        )}
        {err && <p className="mt-2 text-xs text-danger-800">{err}</p>}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search files (name, building, apartment…)"
          className="min-w-[220px] flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={fCat}
          onChange={(e) => setFCat(e.target.value)}
          className="rounded-md border border-ink-200 px-2 py-2 text-xs"
        >
          <option value="all">All categories</option>
          {presentCats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={fBldg}
          onChange={(e) => setFBldg(e.target.value)}
          className="rounded-md border border-ink-200 px-2 py-2 text-xs"
        >
          <option value="all">All buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-400">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Building</th>
              <th className="px-3 py-2">Apt</th>
              <th className="px-3 py-2">Added</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-400">
                  {rows.length === 0 ? "No files yet — upload above." : "No matches."}
                </td>
              </tr>
            )}
            {filtered.slice(0, 500).map((r) => (
              <tr
                key={r.id}
                className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50"
              >
                <td className="px-3 py-2">
                  <a
                    href={`/api/documents/${r.id}`}
                    className="text-brand hover:underline"
                  >
                    {r.name}
                  </a>
                </td>
                <td className="px-3 py-2 text-xs text-ink-600">{r.category}</td>
                <td className="px-3 py-2 text-xs text-ink-600">{r.building ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-ink-600">
                  {r.apt ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-ink-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => del(r.id)}
                    className="text-xs text-ink-400 hover:text-danger-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <div className="border-t border-ink-100 px-3 py-2 text-center text-xs text-ink-400">
            Showing first 500 — narrow your search to see more.
          </div>
        )}
      </div>
    </div>
  );
}
