// =============================================================================
//  Language detection + translation to English (Anthropic Claude Haiku)
// =============================================================================
//  When a tenant submits a work order in any language, detect it and translate
//  the title + description to English in one round-trip. ASCII fast-path skips
//  the API for plain-English text. Hard-fails to "english passthrough" if no
//  API key or the call errors — better to ship the WO untranslated than drop it.
//
//  Backend-agnostic: the caller injects { apiKey, model } — the kit reads no
//  process.env of its own.
// =============================================================================

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

export interface TranslationResult {
  source_language: string; // ISO 639-1 (e.g. 'en', 'es', 'zh', 'ru')
  title_en: string;
  description_en: string;
}

export interface TranslateOptions {
  apiKey?: string;
  model?: string;
}

export async function translateToEnglish(
  title: string,
  description: string,
  opts: TranslateOptions = {}
): Promise<TranslationResult> {
  const apiKey = opts.apiKey;
  const model = opts.model ?? DEFAULT_MODEL;
  const text = `${title}\n${description}`.trim();

  // No text or no key → passthrough (no cost, never drop a ticket).
  if (!text || !apiKey) return passthrough(title, description);

  // Cheap heuristic — pure-ASCII text is treated as English, skipping the API.
  if (/^[\x00-\x7F]+$/.test(text)) return passthrough(title, description);

  try {
    const prompt = `A tenant submitted the following work-order title and description in some language. Detect the language and translate to natural, neutral English.

Title: ${title}
Description: ${description}

Respond with ONLY a single JSON object (no prose, no code fences) with these exact keys:
{"source_language": "<ISO 639-1 code, e.g. en|es|zh|ru|fr>", "title_en": "<English title>", "description_en": "<English description>"}

If the text is already English, return source_language='en' with the original strings unchanged.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      signal: AbortSignal.timeout(15_000), // tenant intake runs this inline — never hang the ticket
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("[translate] non-OK:", res.status, await res.text());
      return passthrough(title, description);
    }
    const data: any = await res.json();
    const raw = data?.content?.[0]?.text;
    if (typeof raw !== "string") return passthrough(title, description);

    const parsed = parseJsonObject(raw);
    if (!parsed) return passthrough(title, description);

    const lang = String(parsed.source_language || "en").toLowerCase().slice(0, 5);
    const titleEn = String(parsed.title_en ?? title);
    const descEn = String(parsed.description_en ?? description);
    return { source_language: lang, title_en: titleEn, description_en: descEn };
  } catch (e) {
    console.error("[translate] exception:", e);
    return passthrough(title, description);
  }
}

function passthrough(title: string, description: string): TranslationResult {
  return { source_language: "en", title_en: title, description_en: description };
}

// Claude occasionally wraps JSON in markdown fences or a sentence of preamble;
// strip those and clip to the first {...last }.
function parseJsonObject(s: string): Record<string, any> | null {
  let clean = s.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  }
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Human-readable label for a 2-letter language code. */
export function languageLabel(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const c = code.toLowerCase();
  return (
    {
      en: "English", es: "Spanish", zh: "Chinese", ru: "Russian", fr: "French",
      pt: "Portuguese", ko: "Korean", vi: "Vietnamese", ar: "Arabic", bn: "Bengali",
      hi: "Hindi", ur: "Urdu", pl: "Polish", he: "Hebrew", yi: "Yiddish",
      it: "Italian", de: "German",
    }[c] ?? c.toUpperCase()
  );
}
