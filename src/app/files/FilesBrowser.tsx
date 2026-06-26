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

const BLDG_LEVEL = "__building__";
function aptKey(label: string): [number, string] {
  const m = label.match(/^(\d+)\s*(.*)$/);
  return m ? [parseInt(m[1], 10), m[2]] : [9999, label];
}

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
  // folder navigation
  const [navB, setNavB] = useState<string | null>(null); // buildingId
  const [navA, setNavA] = useState<string | null>(null); // apt label or BLDG_LEVEL

  const uploadUnits = useMemo(
    () => (buildingId ? units.filter((u) => u.building_id === buildingId) : []),
    [buildingId, units]
  );
  const bName = useMemo(
    () => Object.fromEntries(buildings.map((b) => [b.id, b.name])),
    [buildings]
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
        const { error } = await sb.storage.from(DOC_BUCKET).upload(path, f, { upsert: false });
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

  // category filter applies everywhere
  const base = fCat === "all" ? rows : rows.filter((r) => r.category === fCat);
  const presentCats = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = words.length > 0;

  // --- search mode: flat results across everything ---
  const searchResults = searching
    ? base.filter((r) => {
        const s = `${r.name} ${r.category} ${r.building ?? ""} ${r.apt ?? ""}`.toLowerCase();
        return words.every((w) => s.includes(w));
      })
    : [];

  // --- folder mode data ---
  const buildingFolders = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of base) {
      const k = r.buildingId ?? "__none__";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => (bName[a[0]] ?? a[0]).localeCompare(bName[b[0]] ?? b[0]));
  }, [base, bName]);

  const aptFolders = useMemo(() => {
    if (!navB) return [];
    const m = new Map<string, number>();
    for (const r of base) {
      if (r.buildingId !== navB) continue;
      const k = r.apt ?? BLDG_LEVEL;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => {
      if (a[0] === BLDG_LEVEL) return 1;
      if (b[0] === BLDG_LEVEL) return -1;
      const [af, al] = aptKey(a[0]);
      const [bf, bl] = aptKey(b[0]);
      return af - bf || al.localeCompare(bl);
    });
  }, [base, navB]);

  const folderFiles = useMemo(() => {
    if (!navB || !navA) return [];
    return base.filter(
      (r) => r.buildingId === navB && (navA === BLDG_LEVEL ? !r.apt : r.apt === navA)
    );
  }, [base, navB, navA]);

  function FileTable({ list, showLoc }: { list: FileRow[]; showLoc?: boolean }) {
    return (
      <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              {showLoc && <th className="px-3 py-2">Location</th>}
              <th className="px-3 py-2">Added</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={showLoc ? 5 : 4} className="px-3 py-8 text-center text-sm text-ink-400">No files here.</td></tr>
            )}
            {list.slice(0, 500).map((r) => (
              <tr key={r.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                <td className="px-3 py-2"><a href={`/api/documents/${r.id}`} className="text-brand hover:underline">{r.name}</a></td>
                <td className="px-3 py-2 text-xs text-ink-600">{r.category}</td>
                {showLoc && <td className="px-3 py-2 text-xs text-ink-600">{r.building ?? "—"}{r.apt ? ` · ${r.apt}` : ""}</td>}
                <td className="px-3 py-2 text-xs text-ink-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right"><button type="button" onClick={() => del(r.id)} className="text-xs text-ink-400 hover:text-danger-800">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length > 500 && <div className="border-t border-ink-100 px-3 py-2 text-center text-xs text-ink-400">Showing first 500 — narrow your search.</div>}
      </div>
    );
  }

  function Folder({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-4 py-3 text-left hover:border-brand-400 hover:bg-ink-50">
        <span className="flex items-center gap-2 font-medium text-ink-900">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-600" fill="currentColor"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
          {label}
        </span>
        <span className="text-xs text-ink-400">{count}</span>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Upload */}
      <form onSubmit={upload} className="rounded-xl2 border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-400">File(s)</span>
            <input ref={fileRef} type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="block w-full text-xs text-ink-600 file:mr-2 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-xs file:font-medium" />
          </label>
          <label><span className="mb-1 block text-xs font-medium text-ink-400">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-40 rounded-md border border-ink-200 px-3 py-2 text-sm">{DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-medium text-ink-400">Building</span>
            <select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setUnitId(""); }} className="w-40 rounded-md border border-ink-200 px-3 py-2 text-sm"><option value="">—</option>{buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-medium text-ink-400">Apartment</span>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!buildingId} className="w-28 rounded-md border border-ink-200 px-3 py-2 text-sm disabled:opacity-50"><option value="">—</option>{uploadUnits.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
          <button type="submit" disabled={busy || !files.length} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{busy ? "Uploading…" : "Upload"}</button>
        </div>
        {files.length > 0 && <p className="mt-2 text-xs text-ink-400">{files.length} file(s) selected</p>}
        {err && <p className="mt-2 text-xs text-danger-800">{err}</p>}
      </form>

      {/* Search + category + breadcrumb */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all files (name, building, apartment…)" className="min-w-[220px] flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm" />
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="rounded-md border border-ink-200 px-2 py-2 text-xs">
          <option value="all">All categories</option>
          {presentCats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {searching ? (
        <>
          <div className="text-xs text-ink-400">{searchResults.length} result(s)</div>
          <FileTable list={searchResults} showLoc />
        </>
      ) : (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            <button type="button" onClick={() => { setNavB(null); setNavA(null); }} className={navB ? "text-brand hover:underline" : "font-medium text-ink-900"}>All files</button>
            {navB && (<><span className="text-ink-300">/</span>
              <button type="button" onClick={() => setNavA(null)} className={navA ? "text-brand hover:underline" : "font-medium text-ink-900"}>{bName[navB] ?? navB}</button></>)}
            {navB && navA && (<><span className="text-ink-300">/</span>
              <span className="font-medium text-ink-900">{navA === BLDG_LEVEL ? "Building-level" : navA}</span></>)}
          </div>

          {!navB && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {buildingFolders.map(([bid, n]) => (
                <Folder key={bid} label={bid === "__none__" ? "Unfiled" : bName[bid] ?? bid} count={n} onClick={() => { setNavB(bid); setNavA(null); }} />
              ))}
            </div>
          )}
          {navB && !navA && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {aptFolders.map(([apt, n]) => (
                <Folder key={apt} label={apt === BLDG_LEVEL ? "Building-level" : apt} count={n} onClick={() => setNavA(apt)} />
              ))}
            </div>
          )}
          {navB && navA && <FileTable list={folderFiles} />}
        </>
      )}
    </div>
  );
}
