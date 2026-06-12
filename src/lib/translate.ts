// =============================================================================
//  Language detection + translation to English (Anthropic Claude Haiku)
// =============================================================================
//  Used when a tenant submits a WO. If the text is already English, we
//  return source_language='en' and skip the translation cost. Otherwise we
//  ask Claude Haiku 4.5 to detect the language and translate both the title
//  and description in one round-trip.
//
//  Hard-fails to "english passthrough" if ANTHROPIC_API_KEY is missing or
//  the API call errors — better to ship the WO untranslated than to drop it.
// =============================================================================

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

export interface TranslationResult {
  source_language: string; // ISO 639-1 (e.g. 'en', 'es', 'zh', 'ru')
  title_en: string;
  description_en: string;
}

/**
 * Detect language + translate to English. If text is already English,
 * returns it unchanged with source_language='en' and no API call cost.
 */
export async function translateToEnglish(
  title: string,
  description: string
): Promise<TranslationResult> {
  const text = `${title}\n${description}`.trim();
  if (!text || !process.env.ANTHROPIC_API_KEY) {
    return {
      source_language: "en",
      title_en: title,
      description_en: description,
    };
  }

  // Cheap heuristic — if every word is plausibly English (ASCII letters,
  // common punctuation), skip the API call. Anything with non-Latin
  // characters or non-ASCII accents goes through Claude to be safe.
  if (/^[\x00-\x7F]+$/.test(text)) {
    return {
      source_language: "en",
      title_en: title,
      description_en: description,
    };
  }

  try {
    const prompt = `A tenant submitted the following work-order title and description in some language. Detect the language and translate to natural, neutral English.

Title: ${title}
Description: ${description}

Respond with ONLY a single JSON object (no prose, no code fences) with these exact keys:
{"source_language": "<ISO 639-1 code, e.g. en|es|zh|ru|fr>", "title_en": "<English title>", "description_en": "<English description>"}

If the text is already English, return source_language='en' with the original strings unchanged.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
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
    if (typeof raw !== "string") {
      return passthrough(title, description);
    }
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
  return {
    source_language: "en",
    title_en: title,
    description_en: description,
  };
}

/**
 * Pull a JSON object out of a string. Claude is good but occasionally
 * wraps in markdown fences or adds a sentence of preamble; we strip those.
 */
function parseJsonObject(s: string): Record<string, any> | null {
  // Strip code fences first.
  let clean = s.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  }
  // Find the first { and last } to clip prose around the JSON.
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
      en: "English",
      es: "Spanish",
      zh: "Chinese",
      ru: "Russian",
      fr: "French",
      pt: "Portuguese",
      ko: "Korean",
      vi: "Vietnamese",
      ar: "Arabic",
      bn: "Bengali",
      hi: "Hindi",
      ur: "Urdu",
      pl: "Polish",
      he: "Hebrew",
      yi: "Yiddish",
      it: "Italian",
      de: "German",
    }[c] ?? c.toUpperCase()
  );
}
