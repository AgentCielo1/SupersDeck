"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { DOC_BUCKET, DOC_CATEGORIES } from "@/types/documents";
import { putOffline, getOffline, removeOffline, listOffline } from "@/lib/offline-files";

export type FileRow = {
  id: string;
  name: string;
  category: string;
  buildingId: string | null;
  building: string | null;
  unitId: string | null;
  apt: string | null;
  size: number | null;
  subfolder: string;
  createdAt: string;
};
type Ref = { id: string; name: string };
type UnitRef = { id: string; building_id: string; label: string };

const BLDG_LEVEL = "__building__";
function aptKey(label: string): [number, string] {
  const m = label.match(/^(\d+)\s*(.*)$/);
  return m ? [parseInt(m[1], 10), m[2]] : [9999, label];
}
function fmtBytes(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (isNaN(d)) return "";
  const day = 86400000;
  if (d < 3600000) return "just now";
  if (d < day) return `${Math.floor(d / 3600000)}h ago`;
  const days = Math.floor(d / day);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ---- per-file row + kebab menu (top-level so menu state survives re-renders) ----
function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`block w-full px-3 py-1.5 text-left hover:bg-ink-50 ${danger ? "text-danger-800" : "text-ink-700"}`}>
      {children}
    </button>
  );
}

type FileActions = {
  preview: (r: FileRow) => void;
  share: (r: FileRow) => void;
  download: (r: FileRow) => void;
  offline: (r: FileRow) => void;
  rename: (r: FileRow) => void;
  duplicate: (r: FileRow) => void;
  move: (r: FileRow) => void;
  del: (r: FileRow) => void;
};

function FileItem({
  r,
  showLoc,
  isOffline,
  on,
}: {
  r: FileRow;
  showLoc?: boolean;
  isOffline: boolean;
  on: FileActions;
}) {
  const [open, setOpen] = useState(false);
  const meta = [
    fmtBytes(r.size),
    ago(r.createdAt),
    showLoc ? `${r.building ?? ""}${r.apt ? ` · ${r.apt}` : ""}` : "",
    isOffline ? "offline ✓" : "",
  ].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-ink-50/50">
      <button type="button" onClick={() => on.preview(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-ink-300" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5" />
        </svg>
        <span className="min-w-0">
          <span className="block truncate font-medium text-brand">{r.name}</span>
          <span className="block text-xs text-ink-400">{meta}</span>
        </span>
      </button>
      <div className="relative shrink-0">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Actions" className="rounded-md px-2 py-1 text-lg leading-none text-ink-400 hover:bg-ink-100">⋯</button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-ink-200 bg-white py-1 text-sm shadow-lg">
              <MenuItem onClick={() => { setOpen(false); on.share(r); }}>Share</MenuItem>
              <MenuItem onClick={() => { setOpen(false); on.download(r); }}>Download</MenuItem>
              <MenuItem onClick={() => { setOpen(false); on.offline(r); }}>{isOffline ? "Remove offline copy" : "Make available offline"}</MenuItem>
              <MenuItem onClick={() => { setOpen(false); on.rename(r); }}>Rename</MenuItem>
              <MenuItem onClick={() => { setOpen(false); on.duplicate(r); }}>Duplicate</MenuItem>
              <MenuItem onClick={() => { setOpen(false); on.move(r); }}>Move…</MenuItem>
              <div className="my-1 border-t border-ink-100" />
              <MenuItem danger onClick={() => { setOpen(false); on.del(r); }}>Delete</MenuItem>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function FileList({ list, showLoc, offlineIds, on }: { list: FileRow[]; showLoc?: boolean; offlineIds: Set<string>; on: FileActions }) {
  return (
    <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl2 border border-ink-200 bg-white">
      {list.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-400">No files here.</li>}
      {list.slice(0, 500).map((r) => (
        <FileItem key={r.id} r={r} showLoc={showLoc} isOffline={offlineIds.has(r.id)} on={on} />
      ))}
      {list.length > 500 && <li className="px-3 py-2 text-center text-xs text-ink-400">Showing first 500 — narrow your search.</li>}
    </ul>
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
  const [note, setNote] = useState("");

  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("all");
  const [navB, setNavB] = useState<string | null>(null);
  const [navA, setNavA] = useState<string | null>(null);
  const [navS, setNavS] = useState<string | null>(null);

  const [preview, setPreview] = useState<FileRow | null>(null);
  const [previewSrc, setPreviewSrc] = useState("");
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());
  const [moveDoc, setMoveDoc] = useState<FileRow | null>(null);
  const [moveB, setMoveB] = useState("");
  const [moveU, setMoveU] = useState("");

  useEffect(() => { listOffline().then((ids) => setOfflineIds(new Set(ids))); }, []);

  // Resolve the preview source — from the offline cache if saved, else the API.
  useEffect(() => {
    let revoke: string | null = null;
    if (!preview) { setPreviewSrc(""); return; }
    (async () => {
      if (offlineIds.has(preview.id)) {
        const o = await getOffline(preview.id);
        if (o) { revoke = URL.createObjectURL(o.blob); setPreviewSrc(revoke); return; }
      }
      setPreviewSrc(`/api/documents/${preview.id}`);
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [preview, offlineIds]);

  // Opening an apartment folder pre-targets the upload form to that apartment.
  useEffect(() => {
    if (navB && navA && navA !== BLDG_LEVEL) {
      const u = units.find((x) => x.building_id === navB && x.label === navA);
      setBuildingId(navB);
      setUnitId(u?.id ?? "");
    }
  }, [navB, navA, units]);

  const uploadUnits = useMemo(() => (buildingId ? units.filter((u) => u.building_id === buildingId) : []), [buildingId, units]);
  const moveUnits = useMemo(() => (moveB ? units.filter((u) => u.building_id === moveB) : []), [moveB, units]);
  const bName = useMemo(() => Object.fromEntries(buildings.map((b) => [b.id, b.name])), [buildings]);

  function flash(m: string) { setNote(m); window.setTimeout(() => setNote(""), 2500); }

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
          body: JSON.stringify({ name: f.name, path, category, building_id: buildingId || null, unit_id: unitId || null, mime: f.type || null, size: f.size }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Save failed"); }
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

  const on: FileActions = {
    preview: (r: FileRow) => setPreview(r),
    download: (r: FileRow) => window.open(`/api/documents/${r.id}?download=1`, "_blank"),
    del: async (r: FileRow) => {
      if (!confirm(`Delete "${r.name}"?`)) return;
      const res = await fetch(`/api/documents/${r.id}`, { method: "DELETE" });
      if (res.ok) router.refresh(); else flash("Delete failed");
    },
    share: async (r: FileRow) => {
      try {
        const res = await fetch(`/api/documents/${r.id}?share=1`);
        const d = await res.json();
        if (!res.ok || !d.url) throw new Error();
        if (typeof navigator.share === "function") await navigator.share({ title: r.name, url: d.url });
        else { await navigator.clipboard.writeText(d.url); flash("Share link copied (valid 7 days)"); }
      } catch { flash("Couldn't create a share link"); }
    },
    offline: async (r: FileRow) => {
      if (offlineIds.has(r.id)) {
        await removeOffline(r.id);
        setOfflineIds((s) => { const n = new Set(s); n.delete(r.id); return n; });
        flash("Removed offline copy");
        return;
      }
      flash("Saving for offline…");
      try {
        const res = await fetch(`/api/documents/${r.id}`);
        const blob = await res.blob();
        await putOffline(r.id, r.name, blob);
        setOfflineIds((s) => new Set(s).add(r.id));
        flash("Available offline ✓");
      } catch { flash("Couldn't save offline"); }
    },
    rename: async (r: FileRow) => {
      const name = window.prompt("Rename file", r.name);
      if (!name || !name.trim() || name.trim() === r.name) return;
      const res = await fetch(`/api/documents/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      if (res.ok) router.refresh(); else flash("Rename failed");
    },
    duplicate: async (r: FileRow) => {
      const res = await fetch(`/api/documents/${r.id}/duplicate`, { method: "POST" });
      if (res.ok) router.refresh(); else flash("Duplicate failed");
    },
    move: (r: FileRow) => { setMoveDoc(r); setMoveB(r.buildingId ?? ""); setMoveU(r.unitId ?? ""); },
  };

  async function submitMove() {
    if (!moveDoc) return;
    const res = await fetch(`/api/documents/${moveDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ building_id: moveB || null, unit_id: moveU || null }),
    });
    setMoveDoc(null);
    if (res.ok) router.refresh(); else flash("Move failed");
  }

  const base = fCat === "all" ? rows : rows.filter((r) => r.category === fCat);
  const presentCats = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = words.length > 0;
  const searchResults = searching
    ? base.filter((r) => words.every((w) => `${r.name} ${r.category} ${r.building ?? ""} ${r.apt ?? ""}`.toLowerCase().includes(w)))
    : [];

  // Doc counts per building, then per apartment within a building.
  const docCountByBldg = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of base) { const k = r.buildingId ?? "__none__"; m.set(k, (m.get(k) ?? 0) + 1); }
    return m;
  }, [base]);
  // ALL buildings show as folders (even with 0 files), + "Unfiled" if any.
  const buildingFolders = useMemo(() => {
    const list = buildings
      .map((b) => [b.id, docCountByBldg.get(b.id) ?? 0] as [string, number])
      .sort((a, b) => (bName[a[0]] ?? "").localeCompare(bName[b[0]] ?? ""));
    const unfiled = docCountByBldg.get("__none__") ?? 0;
    if (unfiled > 0) list.push(["__none__", unfiled]);
    return list;
  }, [buildings, docCountByBldg, bName]);
  // EVERY apartment in the building shows as a folder (even empty), + any
  // building-level docs, + any orphan apt labels found only in documents.
  const aptFolders = useMemo(() => {
    if (!navB) return [];
    const cnt = new Map<string, number>();
    for (const r of base) {
      if (r.buildingId !== navB) continue;
      cnt.set(r.apt ?? BLDG_LEVEL, (cnt.get(r.apt ?? BLDG_LEVEL) ?? 0) + 1);
    }
    const labels = new Set<string>();
    const out: [string, number][] = [];
    for (const u of units) {
      if (u.building_id !== navB) continue;
      labels.add(u.label);
      out.push([u.label, cnt.get(u.label) ?? 0]);
    }
    for (const [k, n] of cnt) if (k !== BLDG_LEVEL && !labels.has(k)) out.push([k, n]);
    out.sort((a, b) => {
      const [af, al] = aptKey(a[0]); const [bf, bl] = aptKey(b[0]);
      return af - bf || al.localeCompare(bl);
    });
    const bl = cnt.get(BLDG_LEVEL) ?? 0;
    if (bl > 0) out.push([BLDG_LEVEL, bl]);
    return out;
  }, [base, navB, units]);
  // Inside a real apartment: split docs into Dropbox subfolders + loose files.
  const aptDocs = useMemo(() => {
    if (!navB || !navA || navA === BLDG_LEVEL) return [];
    return base.filter((r) => r.buildingId === navB && r.apt === navA);
  }, [base, navB, navA]);
  const subFolders = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of aptDocs) if (d.subfolder) m.set(d.subfolder, (m.get(d.subfolder) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [aptDocs]);
  const rootFiles = useMemo(() => aptDocs.filter((d) => !d.subfolder), [aptDocs]);
  const subfolderFiles = useMemo(() => (navS ? aptDocs.filter((d) => d.subfolder === navS) : []), [aptDocs, navS]);
  const buildingLevelFiles = useMemo(
    () => (navB && navA === BLDG_LEVEL ? base.filter((r) => r.buildingId === navB && !r.apt) : []),
    [base, navB, navA]
  );

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

      {/* Search + category */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all files (name, building, apartment…)" className="min-w-[220px] flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm" />
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="rounded-md border border-ink-200 px-2 py-2 text-xs">
          <option value="all">All categories</option>
          {presentCats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {note && <span className="text-xs text-brand">{note}</span>}
      </div>

      {searching ? (
        <>
          <div className="text-xs text-ink-400">{searchResults.length} result(s)</div>
          <FileList list={searchResults} showLoc offlineIds={offlineIds} on={on} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <button type="button" onClick={() => { setNavB(null); setNavA(null); setNavS(null); }} className={navB ? "text-brand hover:underline" : "font-medium text-ink-900"}>All files</button>
            {navB && (<><span className="text-ink-300">/</span><button type="button" onClick={() => { setNavA(null); setNavS(null); }} className={navA ? "text-brand hover:underline" : "font-medium text-ink-900"}>{bName[navB] ?? navB}</button></>)}
            {navB && navA && (<><span className="text-ink-300">/</span><button type="button" onClick={() => setNavS(null)} className={navS ? "text-brand hover:underline" : "font-medium text-ink-900"}>{navA === BLDG_LEVEL ? "Building-level" : navA}</button></>)}
            {navB && navA && navS && (<><span className="text-ink-300">/</span><span className="font-medium text-ink-900">{navS}</span></>)}
          </div>
          {!navB && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {buildingFolders.map(([bid, n]) => <Folder key={bid} label={bid === "__none__" ? "Unfiled" : bName[bid] ?? bid} count={n} onClick={() => { setNavB(bid); setNavA(null); setNavS(null); }} />)}
            </div>
          )}
          {navB && !navA && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {aptFolders.map(([apt, n]) => <Folder key={apt} label={apt === BLDG_LEVEL ? "Building-level" : apt} count={n} onClick={() => { setNavA(apt); setNavS(null); }} />)}
            </div>
          )}
          {navB && navA === BLDG_LEVEL && <FileList list={buildingLevelFiles} offlineIds={offlineIds} on={on} />}
          {navB && navA && navA !== BLDG_LEVEL && !navS && (
            <div className="space-y-3">
              {subFolders.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {subFolders.map(([s, n]) => <Folder key={s} label={s} count={n} onClick={() => setNavS(s)} />)}
                </div>
              )}
              {rootFiles.length > 0 && <FileList list={rootFiles} offlineIds={offlineIds} on={on} />}
              {subFolders.length === 0 && rootFiles.length === 0 && (
                <div className="rounded-xl2 border border-dashed border-ink-200 bg-white px-4 py-10 text-center text-sm text-ink-400">
                  No files in this apartment yet — upload above (it&apos;s pre-targeted to this folder).
                </div>
              )}
            </div>
          )}
          {navB && navA && navA !== BLDG_LEVEL && navS && <FileList list={subfolderFiles} offlineIds={offlineIds} on={on} />}
        </>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreview(null)}>
          <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl2 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-2">
              <span className="truncate text-sm font-medium text-ink-900">{preview.name}</span>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <button type="button" onClick={() => on.download(preview)} className="text-brand hover:underline">Download</button>
                <button type="button" onClick={() => setPreview(null)} aria-label="Close" className="text-ink-400 hover:text-ink-900">✕</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-ink-100">
              {!previewSrc ? (
                <div className="flex h-full items-center justify-center text-sm text-ink-400">Loading…</div>
              ) : /\.pdf$/i.test(preview.name) ? (
                <iframe src={previewSrc} title={preview.name} className="h-full w-full" />
              ) : /\.(jpe?g|png|heic|gif|webp)$/i.test(preview.name) ? (
                <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSrc} alt={preview.name} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-ink-500">
                  <p>No in-browser preview for this file type.</p>
                  <button type="button" onClick={() => on.download(preview)} className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white">Download</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Move dialog */}
      {moveDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setMoveDoc(null)}>
          <div className="w-full max-w-sm rounded-xl2 bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-sm font-semibold text-ink-900">Move file</h3>
            <p className="mb-3 truncate text-xs text-ink-400">{moveDoc.name}</p>
            <label className="mb-2 block text-xs text-ink-500"><span className="mb-1 block">Building</span>
              <select value={moveB} onChange={(e) => { setMoveB(e.target.value); setMoveU(""); }} className="w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm"><option value="">— (unfiled)</option>{buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label className="mb-4 block text-xs text-ink-500"><span className="mb-1 block">Apartment</span>
              <select value={moveU} onChange={(e) => setMoveU(e.target.value)} disabled={!moveB} className="w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm disabled:opacity-50"><option value="">— (building-level)</option>{moveUnits.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMoveDoc(null)} className="px-3 py-1.5 text-sm text-ink-400">Cancel</button>
              <button type="button" onClick={submitMove} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white">Move</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
