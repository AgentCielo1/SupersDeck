// Thin SupersDeck wrapper over the shared @workorder/kit translator. Keeps the
// existing call sites unchanged while delegating to the kit (one source of
// truth) and injecting SupersDeck's ANTHROPIC_API_KEY.
import {
  translateToEnglish as kitTranslateToEnglish,
  type TranslationResult,
} from "@workorder/kit/translate/translate";

export { languageLabel } from "@workorder/kit/translate/translate";
export type { TranslationResult };

export function translateToEnglish(
  title: string,
  description: string
): Promise<TranslationResult> {
  return kitTranslateToEnglish(title, description, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-haiku-4-5-20251001",
  });
}
