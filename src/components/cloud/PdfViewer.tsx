"use client";

import { useEffect, useRef, useState } from "react";

// =============================================================================
//  PdfViewer — in-app PDF rendering via pdf.js (no download, no plugins)
// =============================================================================
//  Renders every page as a canvas in a continuous scroll, sized to the
//  container width (devicePixelRatio-aware so text stays crisp on phones).
//  Used for real PDFs AND for Office docs via the server's PDF rendition.
// =============================================================================

export default function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setStatus("loading");

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Worker served statically from /public (kept in sync by the postinstall
        // script) — bundling the ESM worker through webpack/Terser breaks the
        // Next 14 production build.
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const doc = await pdfjs.getDocument({ url, withCredentials: true }).promise;
        if (cancelled) return;
        setPageCount(doc.numPages);

        const width = container.clientWidth || 800;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.marginBottom = "12px";
          canvas.style.background = "#fff";
          canvas.style.borderRadius = "4px";
          container.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        if (!cancelled) setStatus("ready");
      } catch (e) {
        console.error("[PdfViewer]", e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="h-full w-full overflow-auto p-3">
      {status === "loading" && (
        <div className="py-16 text-center text-sm text-white/70">
          Rendering document…
        </div>
      )}
      {status === "error" && (
        <div className="py-16 text-center text-sm text-white/70">
          Couldn&apos;t render this document.{" "}
          <a href={url} target="_blank" rel="noreferrer" className="underline">
            Open it directly
          </a>
          .
        </div>
      )}
      <div ref={containerRef} className="mx-auto max-w-3xl" />
      {status === "ready" && pageCount > 1 && (
        <div className="pb-4 text-center text-xs text-white/50">{pageCount} pages</div>
      )}
    </div>
  );
}
