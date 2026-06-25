"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useVoiceCapture } from "@workorder/kit/intake/useVoiceCapture";
import { SAMPLE_BUILDINGS } from "@/data/sample-data";

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
  const baseRef = useRef("");

  const voice = useVoiceCapture("en", (text) => {
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
          const fd = new FormData(e.currentTarget);
          const body = Object.fromEntries(fd.entries());
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
