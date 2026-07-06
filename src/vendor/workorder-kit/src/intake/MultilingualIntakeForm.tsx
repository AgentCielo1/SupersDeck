"use client";

import { useEffect, useRef, useState } from "react";
import {
  STRINGS,
  ALL_LANGS,
  CATEGORY_ICONS,
  detectInitialLanguage,
  type LangCode,
  type IntakeSubmit,
} from "./strings";
import { useVoiceCapture } from "./useVoiceCapture";
import { IntakeConfirmation } from "./IntakeConfirmation";

// =============================================================================
//  Multilingual tenant intake form (shared)
// =============================================================================
//  Speak OR type a work order in EN/ES/ZH/RU. Tap a "What's the problem?" quick
//  button to pick a category, optionally attach a photo, and the mic button
//  dictates straight into the description in the tenant's language (Web Speech
//  API). Backend-agnostic: the app supplies `onSubmit` (where the payload
//  goes), `trackUrlFor` (how to build the tracking URL), and `uploadPhoto`
//  (how a File becomes a stored path). On success it shows the confirmation +
//  tracking QR. Token-neutral (blue accents) so it looks right in any app.
// =============================================================================

const MAX_PHOTOS = 6;

type PhotoItem = {
  id: string;
  previewUrl: string;
  path?: string;
  status: "uploading" | "done" | "error";
};

export interface MultilingualIntakeFormProps {
  building: { id: string; name: string; address?: string };
  onSubmit: IntakeSubmit;
  /** Build the public tracking URL. Omit for a review-queue intake (no public
   *  tracking) — the confirmation then shows a simple "received" message. */
  trackUrlFor?: (ticketNumber: string) => string;
  /** Upload one photo File and resolve to the stored path. Omit to hide the
   *  photo picker entirely (e.g. an app with no storage bucket wired up). */
  uploadPhoto?: (file: File) => Promise<string>;
  /** Pin a language; if omitted, auto-detects from the browser. */
  initialLang?: LangCode;
}

const fieldClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function MultilingualIntakeForm({
  building,
  onSubmit,
  trackUrlFor,
  uploadPhoto,
  initialLang,
}: MultilingualIntakeFormProps) {
  const [lang, setLang] = useState<LangCode>(initialLang ?? "en");
  const t = STRINGS[lang];

  const [name, setName] = useState("");
  const [apt, setApt] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // "" = nothing picked yet; the buttons let the tenant tap their problem.
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track every object URL we mint so we can revoke them on unmount (removePhoto
  // revokes eagerly; this catches the ones still on screen when the form dies).
  const objectUrls = useRef<Set<string>>(new Set());
  useEffect(
    () => () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current.clear();
    },
    [],
  );

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

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file after a remove
    if (!uploadPhoto) return;

    const room = MAX_PHOTOS - photos.length;
    const files = picked.filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));

    for (const file of files) {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `p-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const previewUrl = URL.createObjectURL(file);
      objectUrls.current.add(previewUrl);
      setPhotos((prev) => [...prev, { id, previewUrl, status: "uploading" }]);
      try {
        const path = await uploadPhoto(file);
        setPhotos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, path, status: "done" } : p)),
        );
      } catch {
        setPhotos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)),
        );
      }
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrls.current.delete(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }

  const uploading = photos.some((p) => p.status === "uploading");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (voice.listening) voice.stop();
    if (uploading) return; // wait for photos to finish before sending
    setSubmitting(true);
    setError(null);

    const effectiveCategory = category || "other";
    const categoryLabel = t.categories[effectiveCategory] ?? t.categories.other;
    const titlePieces = [categoryLabel];
    if (apt) titlePieces.push(`Apt ${apt}`);

    const photoPaths = photos
      .filter((p) => p.status === "done" && p.path)
      .map((p) => p.path as string);

    const res = await onSubmit({
      building_id: building.id,
      reporter_name: name,
      unit_label: apt,
      reporter_phone: phone || undefined,
      reporter_email: email || undefined,
      category: effectiveCategory,
      description,
      title: titlePieces.join(" — "),
      language: lang,
      photos: photoPaths.length ? photoPaths : undefined,
    });

    if (res.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    setTicket(res.ticket_number ?? "");
  }

  if (ticket !== null) {
    return (
      <IntakeConfirmation
        ticketNumber={ticket || undefined}
        trackUrl={trackUrlFor && ticket ? trackUrlFor(ticket) : undefined}
        strings={t}
      />
    );
  }

  return (
    <div
      className="mx-auto max-w-md px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      {/* Language pills — tap to switch; the whole form re-renders in that lang. */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {ALL_LANGS.map((code) => {
          const active = code === lang;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {STRINGS[code].name}
            </button>
          );
        })}
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

        {/* "What's the problem?" quick-tap buttons (replaces the old dropdown). */}
        <div>
          <span className="mb-1 block text-xs font-medium text-zinc-600">{t.issue}</span>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(t.categories).map(([key, label]) => {
              const active = key === category;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(active ? "" : key)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {CATEGORY_ICONS[key] ?? "•"}
                  </span>
                  <span className="leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

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

        {/* Optional photo picker — only rendered when the app wires up upload. */}
        {uploadPhoto && (
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-600">{t.photoSection}</span>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                  {p.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] font-medium text-zinc-600">
                      {t.photoUploading}
                    </div>
                  )}
                  {p.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50/85 px-1 text-center text-[10px] font-medium text-red-700">
                      {t.photoError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label={t.removePhotoLabel}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 bg-white text-[11px] font-medium text-zinc-500 hover:border-blue-400 hover:text-blue-600"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    📷
                  </span>
                  {t.addPhoto}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoPick}
            />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? t.sending : uploading ? t.photoUploading : t.send}
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
