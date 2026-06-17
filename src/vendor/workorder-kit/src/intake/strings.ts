// Multilingual strings + helpers for the shared tenant intake form.
// EN / ES / ZH / RU. The tenant's typed/spoken text stays in their language on
// submit; the backend translates to English for the super-side views.

export type LangCode = "en" | "es" | "zh" | "ru";

export interface IntakeStrings {
  name: string;
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
  speak: string;
  listening: string;
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

export const STRINGS: Record<LangCode, IntakeStrings> = {
  en: {
    name: "English",
    title: "Report an issue",
    subtitle: "Fill this out and your super will see it right away.",
    yourName: "Your name",
    apartment: "Apartment",
    apartmentPlaceholder: "e.g. 7C",
    phone: "Phone (so we can update you)",
    email: "Email (optional — we'll send your tracking link)",
    issue: "What's the issue?",
    describe: "Describe what's happening",
    describePlaceholder: "Where, when it started, anything you tried…",
    speak: "🎤 Speak",
    listening: "Listening… tap to stop",
    send: "Send to my super",
    sending: "Sending…",
    sendError: "Couldn't send. Try again or call your super.",
    emergency: "Emergency (no heat, leak, gas, fire, lockout)? Call 311 or 911.",
    bookmark: "Save this so you can check status anytime — no login needed.",
    track: "Track this ticket →",
    copy: "Copy tracking link",
    copied: "Copied!",
    thanks: "Got it — thanks.",
    saved: "Save this QR (long-press → Save Image) or copy the link below. Reopen anytime to see status updates.",
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
    title: "Reportar un problema",
    subtitle: "Llene esto y su súper lo verá enseguida.",
    yourName: "Su nombre",
    apartment: "Apartamento",
    apartmentPlaceholder: "ej. 7C",
    phone: "Teléfono (para mantenerlo informado)",
    email: "Correo (opcional — le enviaremos el enlace de seguimiento)",
    issue: "¿Cuál es el problema?",
    describe: "Describa lo que está pasando",
    describePlaceholder: "Dónde, cuándo empezó, qué ha intentado…",
    speak: "🎤 Hablar",
    listening: "Escuchando… toque para parar",
    send: "Enviar a mi súper",
    sending: "Enviando…",
    sendError: "No se pudo enviar. Intente de nuevo o llame a su súper.",
    emergency: "¿Emergencia (sin calefacción, fuga, gas, fuego, encerrado)? Llame al 311 o 911.",
    bookmark: "Guárdelo para revisar el estado en cualquier momento — sin necesidad de cuenta.",
    track: "Seguir este ticket →",
    copy: "Copiar enlace de seguimiento",
    copied: "¡Copiado!",
    thanks: "Recibido — gracias.",
    saved: "Guarde este QR (mantenga presionado → Guardar imagen) o copie el enlace abajo. Vuelva a abrirlo para ver actualizaciones.",
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
    title: "报告问题",
    subtitle: "填写此表格，您的管理员会立即看到。",
    yourName: "您的姓名",
    apartment: "公寓",
    apartmentPlaceholder: "例如 7C",
    phone: "电话（以便我们更新您）",
    email: "电子邮件（可选 — 我们将发送您的跟踪链接）",
    issue: "是什么问题？",
    describe: "描述发生了什么",
    describePlaceholder: "地点、开始时间、您尝试过什么…",
    speak: "🎤 说话",
    listening: "正在聆听…点击停止",
    send: "发送给我的管理员",
    sending: "发送中…",
    sendError: "无法发送。请重试或致电管理员。",
    emergency: "紧急情况（没有暖气、漏水、煤气、火灾、锁外）？请先拨打 311 或 911。",
    bookmark: "保存此页面，您可以随时查看状态 — 无需登录。",
    track: "跟踪此工单 →",
    copy: "复制跟踪链接",
    copied: "已复制！",
    thanks: "收到 — 谢谢。",
    saved: "保存此二维码（长按 → 保存图像）或复制下方链接。随时重新打开以查看状态更新。",
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
    title: "Сообщить о проблеме",
    subtitle: "Заполните форму, и ваш управдом сразу её увидит.",
    yourName: "Ваше имя",
    apartment: "Квартира",
    apartmentPlaceholder: "например 7C",
    phone: "Телефон (чтобы мы могли вам сообщать)",
    email: "Email (необязательно — мы отправим ссылку для отслеживания)",
    issue: "В чём проблема?",
    describe: "Опишите, что происходит",
    describePlaceholder: "Где, когда началось, что вы пробовали…",
    speak: "🎤 Говорить",
    listening: "Слушаю… нажмите, чтобы остановить",
    send: "Отправить управдому",
    sending: "Отправка…",
    sendError: "Не удалось отправить. Попробуйте снова или позвоните управдому.",
    emergency: "Экстренная ситуация (нет отопления, протечка, газ, пожар, заблокировано)? Сначала позвоните 311 или 911.",
    bookmark: "Сохраните это, чтобы проверять статус в любое время — без входа в систему.",
    track: "Отслеживать заявку →",
    copy: "Копировать ссылку отслеживания",
    copied: "Скопировано!",
    thanks: "Получено — спасибо.",
    saved: "Сохраните этот QR-код (долгое нажатие → Сохранить изображение) или скопируйте ссылку ниже.",
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

export const ALL_LANGS: LangCode[] = ["en", "es", "zh", "ru"];

export function detectInitialLanguage(): LangCode {
  if (typeof navigator === "undefined") return "en";
  const candidates = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  for (const c of candidates) {
    const code = c.toLowerCase().slice(0, 2);
    if (ALL_LANGS.includes(code as LangCode)) return code as LangCode;
  }
  return "en";
}

// BCP-47 tags for the Web Speech API, per supported language.
export const SPEECH_LOCALE: Record<LangCode, string> = {
  en: "en-US",
  es: "es-ES",
  zh: "zh-CN",
  ru: "ru-RU",
};

export interface IntakePayload {
  building_id: string;
  reporter_name: string;
  unit_label: string;
  reporter_phone?: string;
  reporter_email?: string;
  category: string;
  description: string;
  /** Built from the category label (in the tenant's language) + apartment. */
  title: string;
  /** The tenant's selected language (ISO 639-1). */
  language: LangCode;
}

/** App-provided submit handler. Returns the ticket number or an error message. */
export type IntakeSubmit = (
  payload: IntakePayload
) => Promise<{ ticket_number?: string; error?: string }>;
