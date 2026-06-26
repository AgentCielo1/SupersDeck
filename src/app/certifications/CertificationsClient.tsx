"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { DOC_BUCKET } from "@/types/documents";

// =============================================================================
//  CertificationsClient — upload + auto-classify a cert, plus cards showing a
//  thumbnail of the actual certificate, expiry status, a renewal link, inline
//  edit, full-image preview, and delete.
// =============================================================================

export type CertRow = {
  id: string;
  holder_name: string;
  type: string;
  number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  agency: string | null;
  notes: string | null;
  cert_key: string | null;
  photoUrl: string | null;
  renewUrl: string | null;
  infoUrl: string | null;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function status(expires: string | null): { label: string; cls: string } {
  if (!expires) return { label: "No expiration", cls: "bg-ink-100 text-ink-500" };
  const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
  if (isNaN(days)) return { label: "No expiration", cls: "bg-ink-100 text-ink-500" };
  if (days < 0) return { label: `Expired ${fmtDate(expires)}`, cls: "bg-danger-50 text-danger-800" };
  if (days <= 90) return { label: `Expires in ${days}d`, cls: "bg-amber-50 text-amber-800" };
  return { label: `Valid · exp ${fmtDate(expires)}`, cls: "bg-ok-50 text-ok-800" };
}

export default function CertificationsClient({ certs }: { certs: CertRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CertRow | null>(null);
  const [edit, setEdit] = useState<CertRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState("");

  function flashFor(msg: string, ms = 5000) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), ms);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setUploading(true);
    setFlash("Uploading…");
    try {
      const sb = getBrowserSupabase();
      if (!sb) throw new Error("Storage unavailable");
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `certs/upload/${crypto.randomUUID()}-${safe}`;
      const up = await sb.storage.from(DOC_BUCKET).upload(path, file, { upsert: false });
      if (up.error) throw new Error(up.error.message);
      setFlash("Reading certificate…");
      const res = await fetch("/api/certifications/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, name: file.name, mime: file.type || "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      flashFor(
        data.classified
          ? `Added “${data.cert?.type}” — tap Edit to verify the details.`
          : "Saved — couldn't auto-read it, please fill in the details."
      );
      router.refresh();
    } catch (err) {
      flashFor(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function del(c: CertRow) {
    if (!confirm(`Delete "${c.type}"? This removes the record and its photo.`)) return;
    const res = await fetch(`/api/certifications/${c.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else flashFor("Delete failed");
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const body = {
      type: f.get("type"), number: f.get("number"), issued_at: f.get("issued_at"),
      expires_at: f.get("expires_at"), agency: f.get("agency"), notes: f.get("notes"),
    };
    const res = await fetch(`/api/certifications/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) { setEdit(null); router.refresh(); }
    else flashFor("Save failed");
  }

  return (
    <div className="space-y-4">
      {/* Upload + auto-classify */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl2 border border-ink-200 bg-white p-3">
        <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={onUpload} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {uploading ? "Working…" : "📷 Upload certificate"}
        </button>
        <span className="text-xs text-ink-400">Snap or upload a card — it&apos;s read and filed automatically.</span>
        {flash && <span className="text-xs font-medium text-brand">{flash}</span>}
      </div>

      {certs.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-ink-200 bg-white px-4 py-10 text-center text-sm text-ink-400">
          No certifications yet — upload one above and it&apos;ll be read and filed for you.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {certs.map((c) => {
            const st = status(c.expires_at);
            return (
              <div key={c.id} className="flex gap-3 rounded-xl2 border border-ink-200 bg-white p-3">
                <button
                  type="button"
                  onClick={() => c.photoUrl && setPreview(c)}
                  className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md border border-ink-200 bg-ink-50"
                  aria-label="Preview certificate"
                >
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photoUrl} alt={c.type} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-300">No photo</span>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink-900">{c.type}</div>
                      <div className="truncate text-xs text-ink-400">
                        {c.holder_name}{c.number ? ` · #${c.number}` : ""}{c.agency ? ` · ${c.agency}` : ""}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                  </div>

                  <div className="mt-1 text-xs text-ink-500">{c.issued_at ? `Issued ${fmtDate(c.issued_at)}` : ""}</div>
                  {c.notes && <div className="mt-1 line-clamp-2 text-xs text-ink-400">{c.notes}</div>}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {c.renewUrl && <a href={c.renewUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">Renew online ↗</a>}
                    {c.infoUrl && <a href={c.infoUrl} target="_blank" rel="noreferrer" className="text-ink-500 hover:underline">Official info ↗</a>}
                    {c.photoUrl && <button type="button" onClick={() => setPreview(c)} className="text-ink-500 hover:underline">Preview</button>}
                    <button type="button" onClick={() => setEdit(c)} className="text-ink-500 hover:underline">Edit</button>
                    <button type="button" onClick={() => del(c)} className="text-danger-800 hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview?.photoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl2 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-2">
              <span className="truncate text-sm font-medium text-ink-900">{preview.type}</span>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <a href={preview.photoUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Download</a>
                <button type="button" onClick={() => setPreview(null)} aria-label="Close" className="text-ink-400 hover:text-ink-900">✕</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-ink-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.photoUrl} alt={preview.type} className="mx-auto max-h-[78vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEdit(null)}>
          <form onSubmit={saveEdit} className="w-full max-w-md space-y-3 rounded-xl2 bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-ink-900">Edit certification</h3>
            <L label="Type"><input name="type" defaultValue={edit.type} className={inp} /></L>
            <div className="grid grid-cols-2 gap-3">
              <L label="Number"><input name="number" defaultValue={edit.number ?? ""} className={inp} /></L>
              <L label="Agency"><input name="agency" defaultValue={edit.agency ?? ""} className={inp} /></L>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <L label="Issued"><input type="date" name="issued_at" defaultValue={edit.issued_at ?? ""} className={inp} /></L>
              <L label="Expires"><input type="date" name="expires_at" defaultValue={edit.expires_at ?? ""} className={inp} /></L>
            </div>
            <L label="Notes"><textarea name="notes" defaultValue={edit.notes ?? ""} rows={2} className={inp} /></L>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEdit(null)} className="px-3 py-1.5 text-sm text-ink-400">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inp = "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none";
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
      {children}
    </label>
  );
}
