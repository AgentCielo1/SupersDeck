"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { resolvePrefillBuilding } from "@/lib/wo-prefill";
import {
  clearWoDraft,
  loadWoDraft,
  mergeDraftWithPrefill,
  saveWoDraft,
} from "@/lib/wo-draft";
import VoiceNoteRecorder from "@/components/VoiceNoteRecorder";
import { useVoiceCapture } from "@workorder/kit/intake/useVoiceCapture";
import type { LangCode } from "@workorder/kit/intake/strings";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { SAMPLE_BUILDINGS } from "@/data/sample-data";

// Live private bucket for WO photos + attachments (see PHOTO_BUCKET in lib/storage).
import { PHOTO_BUCKET as WO_BUCKET } from "@/lib/buckets";

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
  // useSearchParams needs a Suspense boundary to prerender in Next 14.
  return (
    <Suspense fallback={null}>
      <NewWorkOrderForm />
    </Suspense>
  );
}

function NewWorkOrderForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the tenant directory ("New WO" on a row) — see lib/wo-prefill.
  const params = useSearchParams();
  const prefillBuildingId = resolvePrefillBuilding(
    SAMPLE_BUILDINGS,
    params.get("building_id"),
    params.get("building"),
  );
  const prefillUnit = params.get("unit_label") ?? "";
  const prefillReporter = params.get("reporter_name") ?? "";
  const prefillPhone = params.get("reporter_phone") ?? "";

  // Speak-or-type: dictate into Title or Description via the mic (Web Speech).
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Controlled so the draft autosave (below) can capture and restore them.
  const [buildingId, setBuildingId] = useState(
    prefillBuildingId ?? SAMPLE_BUILDINGS[0]?.id ?? "",
  );
  const [unitLabel, setUnitLabel] = useState(prefillUnit);
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("normal");
  const [reporterName, setReporterName] = useState(prefillReporter);
  const [reporterPhone, setReporterPhone] = useState(prefillPhone);

  // Draft autosave: typed text survives the phone OS killing the backgrounded
  // tab, refreshes, and mid-form navigation. Restore happens once on mount
  // (behind a visible banner); every field change re-saves; a successful
  // submit clears it. Photos/voice memos can't be persisted (picked files
  // can't be stashed), so only text is protected. See src/lib/wo-draft.ts.
  const [draftRestored, setDraftRestored] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const draft = loadWoDraft(window.localStorage);
      if (!draft) return;
      const merged = mergeDraftWithPrefill(
        draft,
        {
          building_id: prefillBuildingId,
          unit_label: prefillUnit,
          reporter_name: prefillReporter,
          reporter_phone: prefillPhone,
        },
        SAMPLE_BUILDINGS.map((b) => b.id),
      );
      if (merged.building_id) setBuildingId(merged.building_id);
      setUnitLabel(merged.unit_label);
      setTitle(merged.title);
      setDescription(merged.description);
      if (merged.category) setCategory(merged.category);
      if (merged.priority) setPriority(merged.priority);
      setReporterName(merged.reporter_name);
      setReporterPhone(merged.reporter_phone);
      setDraftRestored(true);
    } catch {
      // Storage unavailable (private mode, blocked site data) — start fresh.
    }
  }, [prefillBuildingId, prefillUnit, prefillReporter, prefillPhone]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      saveWoDraft(window.localStorage, {
        building_id: buildingId,
        unit_label: unitLabel,
        title,
        description,
        category,
        priority,
        reporter_name: reporterName,
        reporter_phone: reporterPhone,
      });
    } catch {
      // Best-effort — never let a storage failure break typing.
    }
  }, [buildingId, unitLabel, title, description, category, priority, reporterName, reporterPhone]);

  function discardDraft() {
    try {
      clearWoDraft(window.localStorage);
    } catch {}
    setBuildingId(prefillBuildingId ?? SAMPLE_BUILDINGS[0]?.id ?? "");
    setUnitLabel(prefillUnit);
    setTitle("");
    setDescription("");
    setCategory("other");
    setPriority("normal");
    setReporterName(prefillReporter);
    setReporterPhone(prefillPhone);
    setDraftRestored(false);
  }
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
            try {
              clearWoDraft(window.localStorage);
            } catch {}
            router.push(`/work-orders/${data.id}`);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
            setSubmitting(false);
          }
        }}
        className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-5"
      >
        {draftRestored && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-ink-200 bg-brand-50/40 px-3 py-2 text-xs text-ink-600">
            <span>Restored your unsaved draft from last time.</span>
            <button
              type="button"
              onClick={discardDraft}
              className="whitespace-nowrap font-medium text-brand hover:underline"
            >
              Clear draft
            </button>
          </div>
        )}
        <Field label="Building">
          <select
            name="building_id"
            required
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className={fieldClass}
          >
            {SAMPLE_BUILDINGS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit (leave blank if common area)">
          <input
            name="unit_label"
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="e.g. 7C"
            className={fieldClass}
          />
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
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              name="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={fieldClass}
            >
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </Field>
        </div>
        <Field label="Reporter name">
          <input
            name="reporter_name"
            required
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Reporter phone (optional)">
          <input
            name="reporter_phone"
            value={reporterPhone}
            onChange={(e) => setReporterPhone(e.target.value)}
            className={fieldClass}
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
