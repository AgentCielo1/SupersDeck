"use client";

import { useState } from "react";

// =============================================================================
//  Printable voice-line lobby poster (shared)
// =============================================================================
//  A phone-first sibling of <QrPoster>: one-page 8.5×11 poster whose whole point
//  is the 24/7 AI voice assistant number. For tenants who won't/can't scan a QR
//  — elderly, no smartphone camera, or just prefer to talk. Calling captures the
//  same work order as the QR intake. EN / ES / ZH / RU toggle independently.
// =============================================================================

type LangCode = "en" | "es" | "zh" | "ru";

const LANGUAGE_PACK: Record<
  LangCode,
  { name: string; title: string; callHeading: string; steps: string[]; available: string; emergency: string }
> = {
  en: {
    name: "English",
    title: "Report a repair by phone",
    callHeading: "Call this number",
    steps: [
      "Call the number above.",
      "Describe the problem — in your language.",
      "Say your name, apartment, and a callback number.",
      "Your super gets a work order, automatically.",
    ],
    available: "Answered 24/7 · any language",
    emergency: "Emergency? Call 911 or 311 first.",
  },
  es: {
    name: "Español",
    title: "Reporte una reparación por teléfono",
    callHeading: "Llame a este número",
    steps: [
      "Llame al número de arriba.",
      "Describa el problema — en su idioma.",
      "Diga su nombre, apartamento y un número de devolución.",
      "Su súper recibirá una orden de trabajo, automáticamente.",
    ],
    available: "Atendido 24/7 · cualquier idioma",
    emergency: "¿Emergencia? Llame primero al 911 o al 311.",
  },
  zh: {
    name: "中文",
    title: "电话报修",
    callHeading: "拨打此号码",
    steps: [
      "拨打上方号码。",
      "用您的语言描述问题。",
      "说出您的姓名、公寓和回电号码。",
      "管理员会自动收到工单。",
    ],
    available: "全天候 24/7 · 任何语言",
    emergency: "紧急情况？请先拨打 911 或 311。",
  },
  ru: {
    name: "Русский",
    title: "Сообщить о ремонте по телефону",
    callHeading: "Позвоните по номеру",
    steps: [
      "Позвоните по номеру выше.",
      "Опишите проблему — на вашем языке.",
      "Назовите имя, квартиру и номер для обратного звонка.",
      "Управдом автоматически получит заявку.",
    ],
    available: "Отвечаем круглосуточно · любой язык",
    emergency: "Экстренная ситуация? Сначала позвоните 911 или 311.",
  },
};

const ALL_LANGS: LangCode[] = ["en", "es", "zh", "ru"];

function telHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `tel:+1${d}` : `tel:${d}`;
}

export interface VoicePosterProps {
  building: { name: string; address: string };
  /** The 24/7 voice-assistant number, e.g. "959-224-9331". */
  voicePhone: string;
  poweredBy?: string;
}

export function VoicePoster({ building, voicePhone, poweredBy }: VoicePosterProps) {
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
          Print this page (Cmd/Ctrl-P) to make a phone-line poster for the {building.name} lobby.
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
          <input value={superName} onChange={(e) => setSuperName(e.target.value)} className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Super phone (optional)</span>
          <input value={superPhone} onChange={(e) => setSuperPhone(e.target.value)} placeholder="e.g. (347) 555-0100" className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm" />
        </label>
        <div className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Languages</span>
          <div className="flex flex-wrap gap-2">
            {ALL_LANGS.map((code) => (
              <label key={code} className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm hover:bg-zinc-50">
                <input type="checkbox" checked={enabledLangs[code]} onChange={(e) => setEnabledLangs((prev) => ({ ...prev, [code]: e.target.checked }))} />
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
            const sizeCls = isPrimary ? (compact ? "text-[30px]" : "text-[40px]") : compact ? "text-[18px]" : "text-[26px]";
            const colorCls = isPrimary ? "text-black" : "text-zinc-600";
            const weightCls = isPrimary ? "font-bold" : "font-semibold";
            return (
              <div key={code} className={`mt-1 leading-tight ${sizeCls} ${colorCls} ${weightCls}`} lang={code}>
                {LANGUAGE_PACK[code].title}
              </div>
            );
          })}
        </div>

        <div className={`${compact ? "mt-6" : "mt-8"} flex flex-col items-center rounded-xl border-2 border-blue-600 bg-blue-50 px-6 py-6`}>
          <div className="text-sm font-semibold text-blue-900">
            {activeLangs.map((code) => LANGUAGE_PACK[code].callHeading).join("  ·  ")}
          </div>
          <a href={telHref(voicePhone)} className={`mt-2 block font-extrabold tracking-tight text-blue-800 ${compact ? "text-[46px]" : "text-[60px]"} leading-none`}>
            {voicePhone}
          </a>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {LANGUAGE_PACK[activeLangs[0]].available}
          </div>
        </div>

        <div className={`${compact ? "mt-6" : "mt-8"} grid gap-4 text-center sm:gap-6 ${activeLangs.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {activeLangs.map((code) => (
            <div key={code} lang={code}>
              <ol className={`mx-auto mt-1 max-w-xs list-decimal space-y-0.5 pl-5 text-left text-zinc-600 ${compact ? "text-xs" : "text-sm"}`}>
                {LANGUAGE_PACK[code].steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className={`${compact ? "mt-6" : "mt-8"} rounded-md border-2 border-red-600 bg-red-50 p-3 text-center`}>
          {activeLangs.map((code, idx) => (
            <div key={code} lang={code} className={idx === 0 ? "text-sm font-semibold text-red-800" : "mt-0.5 text-xs text-red-800"}>
              {LANGUAGE_PACK[code].emergency}
            </div>
          ))}
          <div className="mt-1 text-xs text-red-800">Fire · gas smell · flooding · lockout · no heat / no hot water</div>
        </div>

        {(superName || superPhone) && (
          <div className="mt-6 text-center text-sm text-zinc-600">
            Super: {superName && <span className="font-medium">{superName}</span>}
            {superName && superPhone && " · "}
            {superPhone && <span className="font-mono">{superPhone}</span>}
          </div>
        )}

        {poweredBy && (
          <div className="mt-8 text-center text-[10px] uppercase tracking-widest text-zinc-400">Powered by {poweredBy}</div>
        )}
      </div>
    </>
  );
}
