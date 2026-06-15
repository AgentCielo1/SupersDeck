"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { publicBaseUrl } from "@/lib/format";

// =============================================================================
//  PUBLIC tenant intake page — reachable via QR code in each lobby.
//  URL: /intake/<building-id>
// =============================================================================
//  Multilingual labels (EN / ES / ZH / RU). Auto-picks the language from
//  `navigator.language` on first render; a top-right picker lets the tenant
//  override. The TEXT the tenant types (description) stays in their language
//  on submit — the server auto-translates it to English for the super-side
//  views.
//
//  After submit:
//    • Shows a QR code that links to /track/<ticket>.
//    • Big tracking URL + copy button.
//    • If reporter_email was filled in, server emails them the same link.
// =============================================================================

type LangCode = "en" | "es" | "zh" | "ru";

const STRINGS: Record<
  LangCode,
  {
    name: string;
    headerEyebrow: string;
    title: string;
    subtitle: string;
    yourName: string;
    apartment: string;
    apartmentPlaceholder: string;
    phone: string;
    email: string;
    issue: string;
    describe: string;
    describePlaceholder: string;
    send: string;
    sending: string;
    sendError: string;
    emergency: string;
    bookmark: string;
    track: string;
    copy: string;
    copied: string;
    thanks: string;
    saved: string;
    ticketNumber: string;
    loading: string;
    invalidCode: string;
    invalidCodeBody: string;
    categories: Record<string, string>;
  }
> = {
  en: {
    name: "English",
    headerEyebrow: "Building",
    title: "Report an issue",
    subtitle: "Fill this out and your super will see it right away.",
    yourName: "Your name",
    apartment: "Apartment",
    apartmentPlaceholder: "e.g. 7C",
    phone: "Phone (so we can update you)",
    email: "Email (optional — we'll send your tracking link)",
    issue: "What's the issue?",
    describe: "Describe what's happening",
    describePlaceholder:
      "Where, when it started, anything you tried...",
    send: "Send to my super",
    sending: "Sending…",
    sendError: "Couldn't send. Try again or call your super.",
    emergency: "Emergency (no heat, leak, gas, fire, lockout)? Call 311 or 911.",
    bookmark:
      "Save this so you can check status anytime — no login needed.",
    track: "Track this ticket →",
    copy: "Copy tracking link",
    copied: "Copied!",
    thanks: "Got it — thanks.",
    saved:
      "Save this QR (long-press → Save Image) or copy the link below. Reopen anytime to see status updates.",
    ticketNumber: "Ticket",
    loading: "Loading…",
    invalidCode: "Invalid building code",
    invalidCodeBody: "Check the QR code in the lobby or ask your super.",
    categories: {
      "no-heat": "No heat",
      "no-hot-water": "No hot water",
      leak: "Leak / water damage",
      electrical: "Electrical",
      appliance: "Appliance broken",
      "lock-key": "Lock / key",
      pest: "Pest / bug",
      mold: "Mold",
      elevator: "Elevator",
      intercom: "Intercom",
      "common-area": "Common area (hallway, lobby)",
      other: "Other",
    },
  },
  es: {
    name: "Español",
    headerEyebrow: "Edificio",
    title: "Reportar un problema",
    subtitle: "Llene esto y su súper lo verá enseguida.",
    yourName: "Su nombre",
    apartment: "Apartamento",
    apartmentPlaceholder: "ej. 7C",
    phone: "Teléfono (para mantenerlo informado)",
    email: "Correo (opcional — le enviaremos el enlace de seguimiento)",
    issue: "¿Cuál es el problema?",
    describe: "Describa lo que está pasando",
    describePlaceholder:
      "Dónde, cuándo empezó, qué ha intentado...",
    send: "Enviar a mi súper",
    sending: "Enviando…",
    sendError: "No se pudo enviar. Intente de nuevo o llame a su súper.",
    emergency: "¿Emergencia (sin calefacción, fuga, gas, fuego, encerrado)? Llame al 311 o 911.",
    bookmark:
      "Guárdelo para revisar el estado en cualquier momento — sin necesidad de cuenta.",
    track: "Seguir este ticket →",
    copy: "Copiar enlace de seguimiento",
    copied: "¡Copiado!",
    thanks: "Recibido — gracias.",
    saved:
      "Guarde este QR (mantenga presionado → Guardar imagen) o copie el enlace abajo. Vuelva a abrirlo para ver actualizaciones.",
    ticketNumber: "Ticket",
    loading: "Cargando…",
    invalidCode: "Código de edificio inválido",
    invalidCodeBody: "Revise el código QR del vestíbulo o pregunte a su súper.",
    categories: {
      "no-heat": "Sin calefacción",
      "no-hot-water": "Sin agua caliente",
      leak: "Fuga / daño por agua",
      electrical: "Eléctrico",
      appliance: "Electrodoméstico roto",
      "lock-key": "Cerradura / llave",
      pest: "Plaga / insecto",
      mold: "Moho",
      elevator: "Ascensor",
      intercom: "Intercomunicador",
      "common-area": "Área común (pasillo, vestíbulo)",
      other: "Otro",
    },
  },
  zh: {
    name: "中文",
    headerEyebrow: "建筑",
    title: "报告问题",
    subtitle: "填写此表格，您的管理员会立即看到。",
    yourName: "您的姓名",
    apartment: "公寓",
    apartmentPlaceholder: "例如 7C",
    phone: "电话（以便我们更新您）",
    email: "电子邮件（可选 — 我们将发送您的跟踪链接）",
    issue: "是什么问题？",
    describe: "描述发生了什么",
    describePlaceholder: "地点、开始时间、您尝试过什么...",
    send: "发送给我的管理员",
    sending: "发送中…",
    sendError: "无法发送。请重试或致电管理员。",
    emergency: "紧急情况（没有暖气、漏水、煤气、火灾、锁外）？请先拨打 311 或 911。",
    bookmark: "保存此页面，您可以随时查看状态 — 无需登录。",
    track: "跟踪此工单 →",
    copy: "复制跟踪链接",
    copied: "已复制！",
    thanks: "收到 — 谢谢。",
    saved:
      "保存此二维码（长按 → 保存图像）或复制下方链接。随时重新打开以查看状态更新。",
    ticketNumber: "工单",
    loading: "加载中…",
    invalidCode: "无效的建筑代码",
    invalidCodeBody: "请检查大厅的二维码或询问您的管理员。",
    categories: {
      "no-heat": "没有暖气",
      "no-hot-water": "没有热水",
      leak: "漏水 / 水损坏",
      electrical: "电气问题",
      appliance: "家电损坏",
      "lock-key": "门锁 / 钥匙",
      pest: "害虫",
      mold: "霉菌",
      elevator: "电梯",
      intercom: "对讲机",
      "common-area": "公共区域（走廊、大厅）",
      other: "其他",
    },
  },
  ru: {
    name: "Русский",
    headerEyebrow: "Здание",
    title: "Сообщить о проблеме",
    subtitle: "Заполните форму, и ваш управдом сразу её увидит.",
    yourName: "Ваше имя",
    apartment: "Квартира",
    apartmentPlaceholder: "например 7C",
    phone: "Телефон (чтобы мы могли вам сообщать)",
    email: "Email (необязательно — мы отправим ссылку для отслеживания)",
    issue: "В чём проблема?",
    describe: "Опишите, что происходит",
    describePlaceholder:
      "Где, когда началось, что вы пробовали...",
    send: "Отправить управдому",
    sending: "Отправка…",
    sendError: "Не удалось отправить. Попробуйте снова или позвоните управдому.",
    emergency:
      "Экстренная ситуация (нет отопления, протечка, газ, пожар, заблокировано)? Сначала позвоните 311 или 911.",
    bookmark:
      "Сохраните это, чтобы проверять статус в любое время — без входа в систему.",
    track: "Отслеживать заявку →",
    copy: "Копировать ссылку отслеживания",
    copied: "Скопировано!",
    thanks: "Получено — спасибо.",
    saved:
      "Сохраните этот QR-код (долгое нажатие → Сохранить изображение) или скопируйте ссылку ниже.",
    ticketNumber: "Номер заявки",
    loading: "Загрузка…",
    invalidCode: "Неверный код здания",
    invalidCodeBody: "Проверьте QR-код в вестибюле или спросите управдома.",
    categories: {
      "no-heat": "Нет отопления",
      "no-hot-water": "Нет горячей воды",
      leak: "Протечка / повреждение водой",
      electrical: "Электрика",
      appliance: "Сломана бытовая техника",
      "lock-key": "Замок / ключ",
      pest: "Вредители",
      mold: "Плесень",
      elevator: "Лифт",
      intercom: "Домофон",
      "common-area": "Общая зона (коридор, вестибюль)",
      other: "Другое",
    },
  },
};

const ALL_LANGS: LangCode[] = ["en", "es", "zh", "ru"];

function detectInitialLanguage(): LangCode {
  if (typeof navigator === "undefined") return "en";
  const candidates = [
    navigator.language,
    ...(navigator.languages ?? []),
  ].filter(Boolean);
  for (const c of candidates) {
    const code = c.toLowerCase().slice(0, 2);
    if (ALL_LANGS.includes(code as LangCode)) return code as LangCode;
  }
  return "en";
}

export default function TenantIntakePage() {
  const params = useParams<{ buildingCode: string }>();
  const buildingId = params?.buildingCode ?? "";
  const [building, setBuilding] = useState<{ id: string; name: string; address: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<{ ticket_number: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<LangCode>("en");
  const t = STRINGS[lang];

  useEffect(() => {
    setLang(detectInitialLanguage());
  }, []);

  useEffect(() => {
    if (!buildingId) return;
    let cancelled = false;
    fetch(`/api/buildings/${buildingId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((b) => {
        if (!cancelled) setBuilding(b);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold">{t.invalidCode}</h1>
        <p className="mt-2 text-sm text-ink-400">{t.invalidCodeBody}</p>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-ink-400">
        {t.loading}
      </div>
    );
  }

  if (ticket) {
    return <ConfirmationView ticket={ticket} t={t} />;
  }

  return (
    <div className="mx-auto max-w-md p-5">
      <div className="mb-3 flex items-center justify-end">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangCode)}
          aria-label="Language"
          className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-600"
        >
          {ALL_LANGS.map((code) => (
            <option key={code} value={code}>
              {STRINGS[code].name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5 text-center">
        <div className="text-xs uppercase tracking-wide text-ink-400">
          {building.name}
        </div>
        <h1 className="mt-1 text-lg font-semibold" lang={lang}>
          {t.title}
        </h1>
        <p className="mt-1 text-xs text-ink-400" lang={lang}>
          {t.subtitle}
        </p>
      </div>

      <form
        className="space-y-3"
        lang={lang}
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          const fd = new FormData(e.currentTarget);
          const body = Object.fromEntries(fd.entries()) as Record<string, string>;

          // Title: category label in tenant's language + apartment. The
          // server will translate it to English on insert.
          const categoryLabel =
            t.categories[body.category ?? "other"] ?? t.categories.other;
          const titlePieces = [categoryLabel];
          if (body.unit_label) titlePieces.push(`Apt ${body.unit_label}`);
          (body as any).title = titlePieces.join(" — ");

          const res = await fetch("/api/work-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(data.error ?? t.sendError);
            setSubmitting(false);
            return;
          }
          setTicket({ ticket_number: data.ticket_number });
        }}
      >
        <input type="hidden" name="building_id" value={building.id} />
        <Field label={t.yourName}>
          <input name="reporter_name" required className={fieldClass} />
        </Field>
        <Field label={t.apartment}>
          <input
            name="unit_label"
            required
            placeholder={t.apartmentPlaceholder}
            className={fieldClass}
          />
        </Field>
        <Field label={t.phone}>
          <input
            name="reporter_phone"
            type="tel"
            inputMode="tel"
            className={fieldClass}
          />
        </Field>
        <Field label={t.email}>
          <input
            name="reporter_email"
            type="email"
            inputMode="email"
            className={fieldClass}
          />
        </Field>
        <Field label={t.issue}>
          <select name="category" defaultValue="other" className={fieldClass}>
            {Object.entries(t.categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.describe}>
          <textarea
            name="description"
            rows={4}
            required
            className={fieldClass}
            placeholder={t.describePlaceholder}
          />
        </Field>
        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {submitting ? t.sending : t.send}
        </button>
        <p className="text-center text-xs text-ink-400">{t.emergency}</p>
      </form>
    </div>
  );
}

function ConfirmationView({
  ticket,
  t,
}: {
  ticket: { ticket_number: string };
  t: (typeof STRINGS)[LangCode];
}) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const base = publicBaseUrl();
  const trackUrl = base
    ? `${base}/track/${ticket.ticket_number}`
    : `/track/${ticket.ticket_number}`;

  useEffect(() => {
    QRCode.toDataURL(trackUrl, { width: 480, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrSrc)
      .catch(() => setQrSrc(""));
  }, [trackUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-50 text-ok-800">
        <svg
          className="h-7 w-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1 className="mt-4 text-lg font-semibold">{t.thanks}</h1>
      <p className="mt-2 text-sm text-ink-600">{t.bookmark}</p>

      <div className="mt-3 inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 font-mono text-base font-semibold">
        {ticket.ticket_number}
      </div>

      {qrSrc && (
        <div className="mt-4 flex flex-col items-center">
          <img
            src={qrSrc}
            alt={`QR code for ${trackUrl}`}
            className="h-48 w-48 rounded-md border border-ink-200"
          />
          <p className="mt-2 text-xs text-ink-400">{t.saved}</p>
        </div>
      )}

      <div className="mt-4">
        <a
          href={`/track/${ticket.ticket_number}`}
          className="block w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800"
        >
          {t.track}
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="mt-2 block w-full rounded-md border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>

      <p className="mt-4 text-xs text-ink-400">{t.emergency}</p>
    </div>
  );
}

const fieldClass =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
