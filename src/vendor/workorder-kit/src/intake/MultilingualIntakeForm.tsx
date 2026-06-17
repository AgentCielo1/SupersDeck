"use client";

import { useEffect, useRef, useState } from "react";
import {
  STRINGS,
  ALL_LANGS,
  detectInitialLanguage,
  type LangCode,
  type IntakeSubmit,
} from "./strings";
import { useVoiceCapture } from "./useVoiceCapture";
import { IntakeConfirmation } from "./IntakeConfirmation";

// =============================================================================
//  Multilingual tenant intake form (shared)
// =============================================================================
//  Speak OR type a work order in EN/ES/ZH/RU. The mic button dictates straight
//  into the description in the tenant's language (Web Speech API). Backend-
//  agnostic: the app supplies `onSubmit` (where the payload goes) and
//  `trackUrlFor` (how to build the tracking URL). On success it shows the
//  confirmation + tracking QR. Token-neutral so it looks right in any app.
// =============================================================================

export interface MultilingualIntakeFormProps {
  building: { id: string; name: string; address?: string };
  onSubmit: IntakeSubmit;
  trackUrlFor: (ticketNumber: string) => string;
  /** Pin a language; if omitted, auto-detects from the browser. */
  initialLang?: LangCode;
}

const fieldClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function MultilingualIntakeForm({
  building,
  onSubmit,
  trackUrlFor,
  initialLang,
}: MultilingualIntakeFormProps) {
  const [lang, setLang] = useState<LangCode>(initialLang ?? "en");
  const t = STRINGS[lang];

  const [name, setName] = useState("");
  const [apt, setApt] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  // Voice dictation appends to whatever was in the description when the mic
  // was tapped, so typing + speaking combine.
  const voiceBase = useRef("");
  const voice = useVoiceCapture(lang, (transcript) => {
    setDescription((voiceBase.current ? voiceBase.current + " " : "") + transcript);
  });

  useEffect(() => {
    if (!initialLang) setLang(detectInitialLanguage());
  }, [initialLang]);

  function toggleVoice() {
    if (voice.listening) {
      voice.stop();
    } else {
      voiceBase.current = description.trim();
      voice.start();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (voice.listening) voice.stop();
    setSubmitting(true);
    setError(null);

    const categoryLabel = t.categories[category] ?? t.categories.other;
    const titlePieces = [categoryLabel];
    if (apt) titlePieces.push(`Apt ${apt}`);

    const res = await onSubmit({
      building_id: building.id,
      reporter_name: name,
      unit_label: apt,
      reporter_phone: phone || undefined,
      reporter_email: email || undefined,
      category,
      description,
      title: titlePieces.join(" — "),
      language: lang,
    });

    if (res.error || !res.ticket_number) {
      setError(res.error ?? t.sendError);
      setSubmitting(false);
      return;
    }
    setTicket(res.ticket_number);
  }

  if (ticket) {
    return (
      <IntakeConfirmation
        ticketNumber={ticket}
        trackUrl={trackUrlFor(ticket)}
        strings={t}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md p-5">
      <div className="mb-3 flex items-center justify-end">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangCode)}
          aria-label="Language"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600"
        >
          {ALL_LANGS.map((code) => (
            <option key={code} value={code}>
              {STRINGS[code].name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5 text-center">
        <div className="text-xs uppercase tracking-wide text-zinc-400">{building.name}</div>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900" lang={lang}>
          {t.title}
        </h1>
        <p className="mt-1 text-xs text-zinc-400" lang={lang}>
          {t.subtitle}
        </p>
      </div>

      <form className="space-y-3" lang={lang} onSubmit={handleSubmit}>
        <Field label={t.yourName}>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={fieldClass} />
        </Field>
        <Field label={t.apartment}>
          <input
            value={apt}
            onChange={(e) => setApt(e.target.value)}
            required
            placeholder={t.apartmentPlaceholder}
            className={fieldClass}
          />
        </Field>
        <Field label={t.phone}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" className={fieldClass} />
        </Field>
        <Field label={t.email}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" className={fieldClass} />
        </Field>
        <Field label={t.issue}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
            {Object.entries(t.categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.describe}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            className={fieldClass}
            placeholder={t.describePlaceholder}
          />
          {voice.supported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voice.listening}
              className={`mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                voice.listening
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {voice.listening ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                  {t.listening}
                </>
              ) : (
                t.speak
              )}
            </button>
          )}
        </Field>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? t.sending : t.send}
        </button>
        <p className="text-center text-xs text-zinc-400">{t.emergency}</p>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}
