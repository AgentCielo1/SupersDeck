"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { SAMPLE_BUILDINGS } from "@/data/sample-data";

// =============================================================================
//  Printable QR-code lobby poster
// =============================================================================
//  Renders a one-page 8.5×11 poster sized for tape-up in the lobby. The QR
//  encodes /intake/<building-id> so tenants land in the work-order intake
//  flow. `window.print()` produces a clean PDF on macOS / Windows / mobile.
//
//  Phase 1 reads the building from the bundled seed for instant rendering.
//  Phase 2 will swap to db.building(id) once auth + building edit screens
//  are in.
// =============================================================================

export default function PosterPage() {
  const params = useParams<{ id: string }>();
  const buildingId = params?.id ?? "";
  const building = SAMPLE_BUILDINGS.find((b) => b.id === buildingId);
  const [qrSrc, setQrSrc] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [superName, setSuperName] = useState("");
  const [superPhone, setSuperPhone] = useState("");
  const [language, setLanguage] = useState<"en" | "es" | "both">("both");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!origin || !buildingId) return;
    const url = `${origin}/intake/${buildingId}`;
    QRCode.toDataURL(url, {
      width: 720,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then(setQrSrc)
      .catch(() => setQrSrc(""));
  }, [origin, buildingId]);

  if (!building) {
    return (
      <div className="p-8 text-center text-sm text-ink-400">
        Unknown building.{" "}
        <Link href="/buildings" className="text-brand-600 underline">
          Back
        </Link>
      </div>
    );
  }

  const intakeUrl = `${origin}/intake/${buildingId}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .poster { margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; page-break-inside: avoid; }
          @page { size: letter; margin: 0.5in; }
        }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/buildings"
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          ← Buildings
        </Link>
        <div className="flex-1 text-sm text-ink-400">
          Print this page (Cmd/Ctrl-P) to make a poster for the {building.name}{" "}
          lobby.
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Print poster
        </button>
      </div>

      <div className="no-print mb-4 grid grid-cols-1 gap-3 rounded-xl2 border border-ink-200 bg-white p-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">
            Super name (optional)
          </span>
          <input
            value={superName}
            onChange={(e) => setSuperName(e.target.value)}
            className="w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">
            Super phone (optional)
          </span>
          <input
            value={superPhone}
            onChange={(e) => setSuperPhone(e.target.value)}
            placeholder="e.g. (347) 555-0100"
            className="w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">
            Language
          </span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm"
          >
            <option value="both">English + Español</option>
            <option value="en">English only</option>
            <option value="es">Español only</option>
          </select>
        </label>
      </div>

      <div className="poster mx-auto max-w-[8.5in] rounded-xl2 border border-ink-200 bg-white p-10 shadow-sm">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-ink-400">
            {building.name}
          </div>
          <div className="mt-1 text-sm text-ink-600">{building.address}</div>
        </div>

        <div className="mt-8 text-center">
          {(language === "en" || language === "both") && (
            <h1 className="text-[44px] font-bold leading-tight text-ink-900">
              Need a repair?
            </h1>
          )}
          {(language === "es" || language === "both") && (
            <h2 className="mt-1 text-[28px] font-semibold leading-tight text-ink-600">
              ¿Necesita una reparación?
            </h2>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR code for ${intakeUrl}`}
              className="h-72 w-72"
            />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center border border-dashed border-ink-200 text-xs text-ink-400">
              Generating QR…
            </div>
          )}
          <div className="mt-4 break-all rounded-md border border-ink-200 bg-ink-50 px-3 py-1.5 font-mono text-xs text-ink-600">
            {intakeUrl}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 text-center sm:grid-cols-2">
          {(language === "en" || language === "both") && (
            <div>
              <div className="text-lg font-semibold text-ink-900">
                Scan with your phone camera
              </div>
              <ol className="mx-auto mt-2 max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-ink-600">
                <li>Open your camera app.</li>
                <li>Point it at the square above.</li>
                <li>Tap the link that appears.</li>
                <li>Fill out the short form. Your super will get it.</li>
              </ol>
            </div>
          )}
          {(language === "es" || language === "both") && (
            <div>
              <div className="text-lg font-semibold text-ink-900">
                Escanee con la cámara de su teléfono
              </div>
              <ol className="mx-auto mt-2 max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-ink-600">
                <li>Abra la cámara.</li>
                <li>Apúntela al cuadrado de arriba.</li>
                <li>Toque el enlace que aparece.</li>
                <li>Llene el formulario. Su súper lo recibirá.</li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-md border-2 border-danger-600 bg-danger-50 p-4 text-center">
          <div className="text-sm font-semibold text-danger-800">
            Emergency? Call 911 or 311 first.
          </div>
          {(language === "es" || language === "both") && (
            <div className="text-xs text-danger-800">
              ¿Emergencia? Llame primero al 911 o al 311.
            </div>
          )}
          <div className="mt-1 text-xs text-danger-800">
            Fire · gas smell · flooding · lockout · no heat / no hot water
          </div>
        </div>

        {(superName || superPhone) && (
          <div className="mt-6 text-center text-sm text-ink-600">
            Super:{" "}
            {superName && <span className="font-medium">{superName}</span>}
            {superName && superPhone && " · "}
            {superPhone && <span className="font-mono">{superPhone}</span>}
          </div>
        )}

        <div className="mt-10 text-center text-[10px] uppercase tracking-widest text-ink-400">
          Powered by SupersDeck
        </div>
      </div>
    </>
  );
}
