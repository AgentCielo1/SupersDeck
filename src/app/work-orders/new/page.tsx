"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import VoiceNoteRecorder from "@/components/VoiceNoteRecorder";
import { useVoiceCapture } from "@workorder/kit/intake/useVoiceCapture";
import type { LangCode } from "@workorder/kit/intake/strings";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { SAMPLE_BUILDINGS } from "@/data/sample-data";

// Live private bucket for WO photos + attachments (see PHOTO_BUCKET in lib/storage).
const WO_BUCKET = "work-orders";

const CATEGORIES = [
  "no-heat",
  "no-hot-water",
  "leak",
  "electrical",
  "appliance",
  "lock-key",
  "pest",
  "mold",
  "elevator",
  "intercom",
  "common-area",
  "lead-concern",
  "other",
];

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speak-or-type: dictate into Title or Description via the mic (Web Speech).
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voiceField, setVoiceField] = useState<null | "title" | "description">(null);
  const [voiceLang, setVoiceLang] = useState<LangCode>("en");
  const [photos, setPhotos] = useState<File[]>([]);
  const [memo, setMemo] = useState<Blob | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const baseRef = useRef("");

  const voice = useVoiceCapture(voiceLang, (text) => {
    const combined = (baseRef.current ? baseRef.current.trim() + " " : "") + text;
    if (voiceField === "title") setTitle(combined);
    else if (voiceField === "description") setDescription(combined);
  });

  function toggleVoice(field: "title" | "description") {
    if (voice.listening && voiceField === field) {
      voice.stop();
      setVoiceField(null);
      return;
    }
    if (voice.listening) voice.stop();
    baseRef.current = field === "title" ? title : description;
    setVoiceField(field);
    voice.start();
  }

  const micClass = (on: boolean) =>
    `inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
      on ? "bg-danger-50 text-danger-800" : "text-brand hover:bg-ink-100"
    }`;

  return (
    <>
      <PageHeader
        title="New work order"
        subtitle="Internal entry. (Tenant-facing intake lives at /intake/[building].)"
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          try {
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = Object.fromEntries(fd.entries());

            // Upload photos + voice memo to the WO bucket; store their paths in
            // the work order's photos[] (rendered as images/audio on the detail).
            const sb = getBrowserSupabase();
            const paths: string[] = [];
            for (const f of photos) {
              const safe = f.name.replace(/[^\w.\-]+/g, "_");
              const path = `wo/${crypto.randomUUID()}-${safe}`;
              const { error: upErr } = await sb.storage
                .from(WO_BUCKET)
                .upload(path, f, { upsert: false });
              if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
              paths.push(path);
            }
            if (memo) {
              const ext = /mp4|mpeg|aac/.test(memo.type)
                ? "m4a"
                : memo.type.includes("ogg")
                ? "ogg"
                : "webm";
              const path = `wo/${crypto.randomUUID()}-voice-note.${ext}`;
              const { error: upErr } = await sb.storage
                .from(WO_BUCKET)
                .upload(path, memo, { contentType: memo.type || "audio/webm" });
              if (upErr) throw new Error(`Voice memo upload failed: ${upErr.message}`);
              paths.push(path);
            }
            if (paths.length) body.photos = paths;

            const res = await fetch("/api/work-orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(data.error ?? "Save failed");
              setSubmitting(false);
              return;
            }
            router.push(`/work-orders/${data.id}`);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
            setSubmitting(false);
          }
        }}
        className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-5"
      >
        <Field label="Building">
          <select name="building_id" required className={fieldClass}>
            {SAMPLE_BUILDINGS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit (leave blank if common area)">
          <input name="unit_label" placeholder="e.g. 7C" className={fieldClass} />
        </Field>
        {voice.supported && (
          <Field label="🎤 Dictation language — spoken text is auto-translated to English on save">
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value as LangCode)}
              className={fieldClass}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
              <option value="ru">Русский</option>
            </select>
          </Field>
        )}
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-ink-600">
            Title
            {voice.supported && (
              <button
                type="button"
                onClick={() => toggleVoice("title")}
                className={micClass(voice.listening && voiceField === "title")}
              >
                {voice.listening && voiceField === "title" ? "● Stop" : "🎤 Speak"}
              </button>
            )}
          </span>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "No heat in living room"'
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-ink-600">
            Description
            {voice.supported && (
              <button
                type="button"
                onClick={() => toggleVoice("description")}
                className={micClass(voice.listening && voiceField === "description")}
              >
                {voice.listening && voiceField === "description" ? "● Stop" : "🎤 Speak"}
              </button>
            )}
          </span>
          <textarea
            name="description"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type, or tap 🎤 Speak to dictate…"
            className={fieldClass}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">
              Photos
            </span>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="block w-full text-xs text-ink-600 file:mr-2 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-xs file:font-medium"
            />
            {photos.length > 0 && (
              <span className="mt-1 block text-xs text-ink-400">
                {photos.length} photo(s)
              </span>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">
              Voice memo
            </span>
            <VoiceNoteRecorder onChange={setMemo} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select name="category" defaultValue="other" className={fieldClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue="normal" className={fieldClass}>
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </Field>
        </div>
        <Field label="Reporter name">
          <input name="reporter_name" required className={fieldClass} />
        </Field>
        <Field label="Reporter phone (optional)">
          <input name="reporter_phone" className={fieldClass} />
        </Field>

        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save work order"}
        </button>
      </form>
    </>
  );
}

const fieldClass =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
