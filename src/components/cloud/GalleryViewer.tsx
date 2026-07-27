"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PdfViewer from "./PdfViewer";
import { viewerKindFor, type ViewerKind } from "@/lib/cloud/provider";

// =============================================================================
//  GalleryViewer — full-screen, swipe-through viewer for a whole folder
// =============================================================================
//  The fix for the old Super Logbook flow (open → back → tap next file):
//  the ORDERED file list of the current folder is loaded once, and prev/next
//  arrows, ← → keys, and touch swipes move through every file in place —
//  images, video, audio, PDFs, and Office docs (via the server's PDF
//  rendition) all render inline; nothing is downloaded to the device.
//  Neighbor images are preloaded so swiping feels instant.
// =============================================================================

export interface GalleryItem {
  path: string;
  name: string;
}

const streamSrc = (path: string) => `/api/cloud/stream?path=${encodeURIComponent(path)}`;
const previewSrc = (path: string) => `/api/cloud/preview?path=${encodeURIComponent(path)}`;

export default function GalleryViewer({
  items,
  startIndex,
  onClose,
}: {
  items: GalleryItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const item = items[index];
  const kind: ViewerKind = item ? viewerKindFor(item.name) : "other";

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta;
        return next < 0 || next >= items.length ? i : next;
      });
    },
    [items.length]
  );

  // Keyboard: ← → navigate, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Preload neighboring images so swiping is instant.
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => {
      const n = items[i];
      if (n && viewerKindFor(n.name) === "image") {
        const img = new Image();
        img.src = streamSrc(n.path);
      }
    });
  }, [index, items]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(dx) > 60) go(dx > 0 ? -1 : 1);
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
        >
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{item.name}</div>
          <div className="text-xs text-white/50">
            {index + 1} of {items.length}
          </div>
        </div>
        <a
          href={streamSrc(item.path)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
        >
          Open ↗
        </a>
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1">
        {kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.path}
            src={streamSrc(item.path)}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        )}
        {kind === "video" && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={item.path}
            src={streamSrc(item.path)}
            controls
            autoPlay={false}
            playsInline
            className="h-full w-full object-contain"
          />
        )}
        {kind === "audio" && (
          <div className="flex h-full items-center justify-center px-6">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio key={item.path} src={streamSrc(item.path)} controls className="w-full max-w-lg" />
          </div>
        )}
        {/* PDFs go through the same-origin proxy — the redirect-to-Dropbox
            stream URL is unusable for pdf.js (credentialed CORS vs ACAO:*). */}
        {kind === "pdf" && <PdfViewer key={item.path} url={previewSrc(item.path)} />}
        {kind === "office" && <PdfViewer key={item.path} url={previewSrc(item.path)} />}
        {kind === "other" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
            <div className="text-4xl">📄</div>
            <div className="text-sm">No inline viewer for this file type yet.</div>
            <a
              href={streamSrc(item.path)}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              Open original ↗
            </a>
          </div>
        )}

        {/* Prev / next arrows */}
        {index > 0 && (
          <button
            onClick={() => go(-1)}
            aria-label="Previous file"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3.5 py-2.5 text-xl text-white hover:bg-white/25"
          >
            ‹
          </button>
        )}
        {index < items.length - 1 && (
          <button
            onClick={() => go(1)}
            aria-label="Next file"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3.5 py-2.5 text-xl text-white hover:bg-white/25"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
