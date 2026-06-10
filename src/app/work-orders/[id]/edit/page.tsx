"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { WorkOrder } from "@/types";

// Inline here (not imported from @/lib/storage) — that file uses next/headers
// for server-only photo signing, which can't be imported by client components.
const PHOTO_BUCKET = "wo-photos";

const CATEGORIES = [
  "no-heat", "no-hot-water", "leak", "electrical", "appliance",
  "lock-key", "pest", "mold", "elevator", "intercom",
  "common-area", "lead-concern", "other",
];

const STATUSES = [
  "new", "triaged", "assigned", "in-progress",
  "waiting-on-vendor", "waiting-on-parts", "completed", "cancelled",
];

const MAX_PHOTOS = 5;

export default function EditWorkOrderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [priority, setPriority] = useState<string>("normal");
  const [status, setStatus] = useState<string>("new");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedVendorId, setAssignedVendorId] = useState<string>("");
  const [vendorOptions, setVendorOptions] = useState<
    Array<{ id: string; name: string; phone: string | null }>
  >([]);
  const [internalNotes, setInternalNotes] = useState("");
  const [hpdRisk, setHpdRisk] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/work-orders/${id}`);
        if (!res.ok) {
          setLoadError(`Work order not found (${res.status})`);
          return;
        }
        const w: WorkOrder = await res.json();
        if (cancelled) return;
        setWo(w);
        setTitle(w.title ?? "");
        setDescription(w.description ?? "");
        setCategory(w.category ?? "other");
        setPriority(w.priority ?? "normal");
        setStatus(w.status ?? "new");
        setAssignedTo(w.assigned_to ?? "");
        setAssignedVendorId(w.assigned_vendor_id ?? "");
        setInternalNotes(w.internal_notes ?? "");
        setHpdRisk(Boolean(w.hpd_risk));
        setPhotos(Array.isArray(w.photos) ? w.photos : []);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  // Vendor dropdown options — fetched once on mount. Falls back to empty if
  // the user has no vendors on file yet (dropdown still renders, just blank).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/vendors")
      .then((r) => r.ok ? r.json() : [])
      .then((rows: Array<{ id: string; name: string; phone: string | null }>) => {
        if (!cancelled && Array.isArray(rows)) setVendorOptions(rows);
      })
      .catch(() => { /* ok — leave empty */ });
    return () => { cancelled = true; };
  }, []);

  // Track signed URLs for already-uploaded photos so we can render thumbnails.
  // Keyed by the photos[] entry (data URL or storage path).
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Whenever the photos list changes, fetch signed URLs for any new storage
  // paths. Data URLs are usable directly.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const paths = photos.filter((p) => !p.startsWith("data:") && !(p in photoUrls));
    if (paths.length === 0) return;
    supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600).then(({ data }: { data: { signedUrl: string; path: string }[] | null }) => {
      if (!data) return;
      const update: Record<string, string> = {};
      data.forEach((d, i) => {
        if (d.signedUrl) update[paths[i]] = d.signedUrl;
      });
      setPhotoUrls((cur) => ({ ...cur, ...update }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  function displaySrc(p: string): string {
    return p.startsWith("data:") ? p : photoUrls[p] ?? "";
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";  // allow re-pick same file
    setPhotoError(null);
    setUploading(true);
    const supabase = getBrowserSupabase();

    for (const f of files) {
      if (photos.length >= MAX_PHOTOS) {
        setPhotoError(`Max ${MAX_PHOTOS} photos per work order`);
        break;
      }
      // Upload to Supabase Storage. Phase 4+ moved off base64 — phones can
      // shoot 3–5 MB photos and we don't want them in the DB.
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) {
        setPhotoError(`Upload failed for ${f.name}: ${upErr.message}`);
        continue;
      }
      setPhotos((p) => [...p, path]);
    }
    setUploading(false);
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        priority,
        status,
        assigned_to: assignedTo.trim() || null,
        assigned_vendor_id: assignedVendorId || null,
        internal_notes: internalNotes.trim() || null,
        hpd_risk: hpdRisk,
        photos,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    router.push(`/work-orders/${id}`);
    router.refresh();
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Work order" />
        <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
          {loadError}{" "}
          <Link href="/work-orders" className="underline">Back</Link>
        </div>
      </>
    );
  }

  if (!wo) {
    return (
      <>
        <PageHeader title="Loading…" />
        <div className="rounded-md border border-ink-200 bg-white p-4 text-sm text-ink-400">Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit ${wo.ticket_number}`}
        subtitle={wo.title}
        actions={
          <Link
            href={`/work-orders/${id}`}
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Back to detail
          </Link>
        }
      />

      <form onSubmit={submit} className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-5">
        <Field label="Title *">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={input} />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={input} />
        </Field>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, " ")}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={input}>
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/-/g, " ")}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Assigned to (internal staff)">
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Hector (porter)"
              className={input}
            />
          </Field>
          <Field label="Vendor (from My Vendors)">
            <select
              value={assignedVendorId}
              onChange={(e) => setAssignedVendorId(e.target.value)}
              className={input}
            >
              <option value="">— No vendor —</option>
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}{v.phone ? ` · ${v.phone}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Internal notes (super-only)">
          <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className={input} />
        </Field>
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-ink-200 bg-white p-2 hover:bg-ink-50">
          <input type="checkbox" checked={hpdRisk} onChange={(e) => setHpdRisk(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-ink-900">HPD risk flag</span>
            <span className="block text-xs text-ink-400">Surface this on the dashboard as a tenant-complaint risk (no heat, no hot water, mold, lead, leak).</span>
          </span>
        </label>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Photos ({photos.length}/{MAX_PHOTOS})</h2>
          <p className="mb-2 text-xs text-ink-400">
            Before/after pics for the record. Full-resolution phone photos
            are fine — they're stored in private Supabase Storage and rendered
            via short-lived signed URLs.
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPickPhoto}
            disabled={photos.length >= MAX_PHOTOS || uploading}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800 disabled:opacity-60"
          />
          {uploading && (
            <div className="mt-2 text-xs text-ink-400">Uploading…</div>
          )}
          {photoError && (
            <div className="mt-2 rounded-md border border-warn-600/40 bg-warn-50 px-3 py-2 text-xs text-warn-800">{photoError}</div>
          )}
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((p, i) => {
                const src = displaySrc(p);
                return (
                  <div key={i} className="relative">
                    {src ? (
                      <img src={src} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md border border-ink-200 object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-ink-200 bg-ink-50 text-xs text-ink-400">
                        Loading…
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-ink-200 bg-white text-xs text-ink-600 shadow"
                      aria-label="Remove photo"
                    >×</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">{error}</div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link href={`/work-orders/${id}`} className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

const input = "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
