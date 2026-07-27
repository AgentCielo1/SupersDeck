"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GalleryViewer from "./GalleryViewer";
import { viewerKindFor } from "@/lib/cloud/provider";

// =============================================================================
//  CloudBrowser — browse the org's connected cloud drive (Dropbox)
// =============================================================================
//  Live folder browsing: files stay in the cloud, stream on tap, nothing is
//  copied to the device. Tapping any file opens the GalleryViewer pre-loaded
//  with EVERY file in the folder, so you scroll freely file-to-file.
//  Optional feature: when no drive is connected, admins see a Connect button
//  and everyone else a friendly note.
// =============================================================================

type Entry = {
  kind: "folder" | "file";
  path: string;
  name: string;
  size?: number;
  modified?: string;
  hasThumbnail?: boolean;
};

type Status =
  | { state: "loading" }
  | { state: "disconnected"; isAdmin: boolean }
  | { state: "connected"; account: string; isAdmin: boolean }
  | { state: "error"; message: string };

const ICONS: Record<string, string> = {
  image: "🖼", video: "🎞", audio: "🎧", pdf: "📕", office: "📄", other: "📄",
};
function iconFor(name: string): string {
  return ICONS[viewerKindFor(name)] ?? "📄";
}
function fmtSize(n?: number): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export default function CloudBrowser() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [listing, setListing] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection status + surface ?connected=1 / ?error= from the OAuth bounce.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) setNotice("Dropbox connected.");
    const err = q.get("error");
    if (err) setNotice(`Connection failed: ${err}`);

    fetch("/api/cloud/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setStatus({
            state: "connected",
            account: d.account_name || d.account_email || "Dropbox",
            isAdmin: !!d.isAdmin,
          });
        } else {
          setStatus({ state: "disconnected", isAdmin: !!d.isAdmin });
        }
      })
      .catch(() => setStatus({ state: "error", message: "Couldn't check the connection." }));
  }, []);

  const load = useCallback(async (p: string) => {
    setListing(true);
    try {
      const r = await fetch(`/api/cloud/list?path=${encodeURIComponent(p)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "list failed");
      setPath(p);
      setEntries(d.entries as Entry[]);
    } catch {
      setNotice("Couldn't open that folder.");
    } finally {
      setListing(false);
    }
  }, []);

  useEffect(() => {
    if (status.state === "connected") void load("");
  }, [status.state, load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("folder", path);
    Array.from(files).forEach((f) => fd.append("file", f));
    try {
      const r = await fetch("/api/cloud/upload", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error);
      setNotice(`${d.uploaded.length} file(s) uploaded.`);
      void load(path);
    } catch (e) {
      setNotice(e instanceof Error && e.message ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (status.state === "loading") {
    return <div className="py-12 text-center text-sm text-ink-400">Checking cloud connection…</div>;
  }

  if (status.state === "error") {
    return <div className="py-12 text-center text-sm text-danger-800">{status.message}</div>;
  }

  if (status.state === "disconnected") {
    return (
      <div className="mx-auto max-w-md rounded-xl2 border border-ink-200 bg-white p-6 text-center">
        <div className="text-3xl">☁️</div>
        <h2 className="mt-2 text-base font-semibold">Connect a cloud drive</h2>
        <p className="mt-2 text-sm text-ink-600">
          Optional: connect the company Dropbox to browse, view, and file documents
          right here — files stay in Dropbox, nothing is copied to devices.
        </p>
        {status.isAdmin ? (
          <a
            href="/api/cloud/connect"
            className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Connect Dropbox
          </a>
        ) : (
          <p className="mt-4 text-xs text-ink-400">Ask an admin to connect it.</p>
        )}
        {notice && <p className="mt-3 text-xs text-danger-800">{notice}</p>}
      </div>
    );
  }

  const files = entries.filter((e) => e.kind === "file");
  const crumbs = path ? path.replace(/^\//, "").split("/") : [];

  return (
    <div>
      {/* Toolbar: breadcrumbs + upload */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
          <button onClick={() => load("")} className="font-medium text-brand-600 hover:underline">
            ☁ {status.account}
          </button>
          {crumbs.map((seg, i) => {
            const p = "/" + crumbs.slice(0, i + 1).join("/");
            const last = i === crumbs.length - 1;
            return (
              <span key={p} className="flex items-center gap-1">
                <span className="text-ink-300">/</span>
                {last ? (
                  <span className="font-medium text-ink-900">{seg}</span>
                ) : (
                  <button onClick={() => load(p)} className="text-brand-600 hover:underline">
                    {seg}
                  </button>
                )}
              </span>
            );
          })}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "⬆ Upload here"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleUpload(e.target.files)}
        />
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
          {notice}{" "}
          <button onClick={() => setNotice(null)} className="text-brand-600 hover:underline">
            dismiss
          </button>
        </div>
      )}

      {listing ? (
        <div className="py-12 text-center text-sm text-ink-400">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-400">Empty folder.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((e) => {
            if (e.kind === "folder") {
              return (
                <button
                  key={e.path}
                  onClick={() => load(e.path)}
                  className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-3 text-left hover:border-brand-400 hover:bg-brand-50/40"
                >
                  <span className="text-xl">📁</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                    {e.name}
                  </span>
                </button>
              );
            }
            const fileIdx = files.findIndex((f) => f.path === e.path);
            return (
              <button
                key={e.path}
                onClick={() => setGalleryIndex(fileIdx)}
                className="overflow-hidden rounded-lg border border-ink-200 bg-white text-left hover:border-brand-400"
              >
                <div className="flex aspect-square items-center justify-center bg-ink-50">
                  {e.hasThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/cloud/thumb?path=${encodeURIComponent(e.path)}&size=medium`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-3xl">{iconFor(e.name)}</span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <div className="truncate text-xs font-medium text-ink-900">{e.name}</div>
                  <div className="text-[10px] text-ink-400">{fmtSize(e.size)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {galleryIndex !== null && files[galleryIndex] && (
        <GalleryViewer
          items={files.map((f) => ({ path: f.path, name: f.name }))}
          startIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </div>
  );
}
