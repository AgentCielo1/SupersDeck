"use client";

import { useEffect, useState } from "react";
import { qrDataUrl } from "./qr";

// =============================================================================
//  Printable QR-code lobby poster (shared)
// =============================================================================
//  One-page 8.5×11 poster sized for tape-up in a lobby. The QR encodes
//  `intakeUrl` (the public tenant work-order intake). `window.print()` makes a
//  clean PDF. Backend-agnostic: building name/address + the canonical intake
//  URL come in as props — the app resolves those (it knows its own routing and
//  canonical base URL). EN / ES / ZH / RU each toggle independently.
// =============================================================================

type LangCode = "en" | "es" | "zh" | "ru";

const LANGUAGE_PACK: Record<
  LangCode,
  { name: string; title: string; scanHeading: string; steps: string[]; emergency: string }
> = {
  en: {
    name: "English",
    title: "Need a repair?",
    scanHeading: "Scan with your phone camera",
    steps: [
      "Open your camera app.",
      "Point it at the square above.",
      "Tap the link that appears.",
      "Fill out the short form. Your super will get it.",
    ],
    emergency: "Emergency? Call 911 or 311 first.",
  },
  es: {
    name: "Español",
    title: "¿Necesita una reparación?",
    scanHeading: "Escanee con la cámara de su teléfono",
    steps: [
      "Abra la cámara.",
      "Apúntela al cuadrado de arriba.",
      "Toque el enlace que aparece.",
      "Llene el formulario. Su súper lo recibirá.",
    ],
    emergency: "¿Emergencia? Llame primero al 911 o al 311.",
  },
  zh: {
    name: "中文",
    title: "需要维修吗？",
    scanHeading: "用手机相机扫描",
    steps: [
      "打开相机应用。",
      "对准上方的方块。",
      "点击出现的链接。",
      "填写简短表单。管理员会收到。",
    ],
    emergency: "紧急情况？请先拨打 911 或 311。",
  },
  ru: {
    name: "Русский",
    title: "Нужен ремонт?",
    scanHeading: "Отсканируйте камерой телефона",
    steps: [
      "Откройте приложение камеры.",
      "Наведите на квадрат выше.",
      "Нажмите на появившуюся ссылку.",
      "Заполните короткую форму. Управдом её получит.",
    ],
    emergency: "Экстренная ситуация? Сначала позвоните 911 или 311.",
  },
};

const ALL_LANGS: LangCode[] = ["en", "es", "zh", "ru"];

export interface QrPosterProps {
  building: { name: string; address: string };
  /** Canonical, public intake URL the QR encodes (app resolves this). */
  intakeUrl: string;
  /** Footer attribution, e.g. "BoroDesk". Hidden if omitted. */
  poweredBy?: string;
}

export function QrPoster({ building, intakeUrl, poweredBy }: QrPosterProps) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [superName, setSuperName] = useState("");
  const [superPhone, setSuperPhone] = useState("");
  const [enabledLangs, setEnabledLangs] = useState<Record<LangCode, boolean>>({
    en: true,
    es: true,
    zh: true,
    ru: true,
  });
  const activeLangs = ALL_LANGS.filter((l) => enabledLangs[l]);
  const compact = activeLangs.length >= 3;

  useEffect(() => {
    if (!intakeUrl) return;
    qrDataUrl(intakeUrl, { width: 720, margin: 1 })
      .then(setQrSrc)
      .catch(() => setQrSrc(""));
  }, [intakeUrl]);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .wo-poster { margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; page-break-inside: avoid; }
          @page { size: letter; margin: 0.5in; }
        }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 text-sm text-zinc-500">
          Print this page (Cmd/Ctrl-P) to make a poster for the {building.name} lobby.
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Print poster
        </button>
      </div>

      <div className="no-print mb-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Super name (optional)</span>
          <input
            value={superName}
            onChange={(e) => setSuperName(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Super phone (optional)</span>
          <input
            value={superPhone}
            onChange={(e) => setSuperPhone(e.target.value)}
            placeholder="e.g. (347) 555-0100"
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
        <div className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Languages</span>
          <div className="flex flex-wrap gap-2">
            {ALL_LANGS.map((code) => (
              <label
                key={code}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  checked={enabledLangs[code]}
                  onChange={(e) =>
                    setEnabledLangs((prev) => ({ ...prev, [code]: e.target.checked }))
                  }
                />
                <span>{LANGUAGE_PACK[code].name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="wo-poster mx-auto max-w-[8.5in] rounded-xl border border-zinc-200 bg-white p-10 text-black shadow-sm">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-zinc-500">{building.name}</div>
          <div className="mt-1 text-sm text-zinc-600">{building.address}</div>
        </div>

        <div className={compact ? "mt-5 text-center" : "mt-8 text-center"}>
          {activeLangs.map((code, idx) => {
            const isPrimary = idx === 0;
            const sizeCls = isPrimary
              ? compact
                ? "text-[32px]"
                : "text-[44px]"
              : compact
              ? "text-[20px]"
              : "text-[28px]";
            const colorCls = isPrimary ? "text-black" : "text-zinc-600";
            const weightCls = isPrimary ? "font-bold" : "font-semibold";
            return (
              <div key={code} className={`mt-1 leading-tight ${sizeCls} ${colorCls} ${weightCls}`} lang={code}>
                {LANGUAGE_PACK[code].title}
              </div>
            );
          })}
        </div>

        <div className={`${compact ? "mt-4" : "mt-6"} flex flex-col items-center`}>
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt={`QR code for ${intakeUrl}`} className={compact ? "h-56 w-56" : "h-72 w-72"} />
          ) : (
            <div
              className={`flex ${compact ? "h-56 w-56" : "h-72 w-72"} items-center justify-center border border-dashed border-zinc-300 text-xs text-zinc-400`}
            >
              Generating QR…
            </div>
          )}
          <div className="mt-4 break-all rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-xs text-zinc-600">
            {intakeUrl}
          </div>
        </div>

        <div
          className={`${compact ? "mt-5" : "mt-8"} grid gap-4 text-center sm:gap-6 ${
            activeLangs.length >= 2 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {activeLangs.map((code) => (
            <div key={code} lang={code}>
              <div className={`font-semibold text-black ${compact ? "text-sm" : "text-lg"}`}>
                {LANGUAGE_PACK[code].scanHeading}
              </div>
              <ol
                className={`mx-auto mt-1 max-w-xs list-decimal space-y-0.5 pl-5 text-left text-zinc-600 ${
                  compact ? "text-xs" : "text-sm"
                }`}
              >
                {LANGUAGE_PACK[code].steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className={`${compact ? "mt-5" : "mt-8"} rounded-md border-2 border-red-600 bg-red-50 p-3 text-center`}>
          {activeLangs.map((code, idx) => (
            <div
              key={code}
              lang={code}
              className={idx === 0 ? "text-sm font-semibold text-red-800" : "mt-0.5 text-xs text-red-800"}
            >
              {LANGUAGE_PACK[code].emergency}
            </div>
          ))}
          <div className="mt-1 text-xs text-red-800">
            Fire · gas smell · flooding · lockout · no heat / no hot water
          </div>
        </div>

        {(superName || superPhone) && (
          <div className="mt-6 text-center text-sm text-zinc-600">
            Super: {superName && <span className="font-medium">{superName}</span>}
            {superName && superPhone && " · "}
            {superPhone && <span className="font-mono">{superPhone}</span>}
          </div>
        )}

        {poweredBy && (
          <div className="mt-10 text-center text-[10px] uppercase tracking-widest text-zinc-400">
            Powered by {poweredBy}
          </div>
        )}
      </div>
    </>
  );
}
