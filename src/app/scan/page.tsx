"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

// =============================================================================
//  /scan — photograph a printed work order → OCR → review → create WO
// =============================================================================
//  Ported from Super Logbook's scan module. Tesseract.js runs ENTIRELY on the
//  device (bundled, no CDN): the photo never leaves the phone; only the fields
//  you approve are saved, via the normal POST /api/work-orders flow.
//  First scan downloads the ~3MB OCR model once; the browser caches it.
// =============================================================================

const CATEGORIES = [
  "no-heat", "no-hot-water", "leak", "electrical", "appliance", "lock-key",
  "pest", "mold", "elevator", "intercom", "common-area", "other",
] as const;

// Keyword → category heuristics (from Super Logbook's parser, condensed).
const CATEGORY_HINTS: Array<[RegExp, (typeof CATEGORIES)[number]]> = [
  [/no\s*heat|radiator|heat\b/i, "no-heat"],
  [/hot\s*water/i, "no-hot-water"],
  [/leak|drip|water\s*damage|flood/i, "leak"],
  [/electric|outlet|breaker|light|power/i, "electrical"],
  [/fridge|stove|oven|dishwasher|appliance|washer|dryer/i, "appliance"],
  [/lock|key|cylinder|door\s*knob/i, "lock-key"],
  [/roach|mice|mouse|rat|pest|bug|exterminat/i, "pest"],
  [/mold|mildew/i, "mold"],
  [/elevator/i, "elevator"],
  [/intercom|buzzer/i, "intercom"],
  [/hallway|lobby|stairwell|basement|common/i, "common-area"],
];

type Building = { id: string; name: string };

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [phase, setPhase] = useState<"idle" | "ocr" | "review" | "saving">("idle");
  const [progress, setProgress] = useState("");
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const [buildingId, setBuildingId] = useState("");
  const [apt, setApt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/buildings")
      .then((r) => r.json())
      .then((d) => {
        const list: Building[] = Array.isArray(d) ? d : d.buildings ?? [];
        setBuildings(list);
        if (list[0]) setBuildingId(list[0].id);
      })
      .catch(() => {});
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function extractFields(text: string) {
    const apt = text.match(/\b(?:apt|apartment|unit)\.?\s*#?\s*([0-9]{1,2}\s?-?\s?[A-Za-z])\b/i)?.[1];
    if (apt) setApt(apt.replace(/[\s-]/g, "").toUpperCase());
    const phone = text.match(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/)?.[1];
    if (phone) setPhone(phone);
    const nm = text.match(/(?:name|tenant|resident)\s*[:.]?\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/)?.[1];
    if (nm) setName(nm);
    for (const [re, cat] of CATEGORY_HINTS) {
      if (re.test(text)) {
        setCategory(cat);
        break;
      }
    }
    const firstLine = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 8)[0];
    if (firstLine) setTitle(firstLine.slice(0, 120));
    setDescription(text.trim().slice(0, 4000));
  }

  async function handlePick(file: File | null) {
    if (!file) return;
    setError(null);
    setPhase("ocr");
    setProgress("Loading OCR engine…");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    try {
      const T = await import("tesseract.js");
      const worker = await T.createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(`Reading… ${Math.round(m.progress * 100)}%`);
          } else {
            setProgress(m.status);
          }
        },
      });
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      setRawText(text);
      extractFields(text);
      setPhase("review");
    } catch (e) {
      console.error("[scan]", e);
      setError("OCR failed — try a sharper, well-lit photo. (First scan needs internet once to fetch the engine.)");
      setPhase("idle");
    }
  }

  async function save() {
    if (!buildingId || !name.trim()) {
      setError("Building and reporter name are required.");
      return;
    }
    setPhase("saving");
    setError(null);
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: buildingId,
          unit_label: apt || undefined,
          reporter_name: name.trim(),
          reporter_phone: phone || undefined,
          category,
          title: title || undefined,
          description: `${description}\n\n[Scanned from paper]`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push(`/work-orders/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setPhase("review");
    }
  }

  const input =
    "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <>
      <PageHeader
        title="Scan a paper work order"
        subtitle="Photograph a printed work order or note — OCR runs on your device, you review the fields, then it becomes a normal work order."
      />

      {phase === "idle" && (
        <div className="mx-auto max-w-md rounded-xl2 border border-ink-200 bg-white p-6 text-center">
          <div className="text-3xl">📷</div>
          <p className="mt-2 text-sm text-ink-600">
            Take a clear, well-lit photo. Nothing is uploaded — the text is read
            on this device.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Photograph document
          </button>
          <p className="mt-3 text-xs text-ink-400">
            First scan downloads the OCR engine (~3MB) once.
          </p>
          {error && <p className="mt-3 text-sm text-danger-800">{error}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handlePick(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {phase === "ocr" && (
        <div className="mx-auto max-w-md rounded-xl2 border border-ink-200 bg-white p-6 text-center">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Scanned document" className="mx-auto mb-4 max-h-48 rounded-md" />
          )}
          <div className="text-sm font-medium text-ink-900">{progress}</div>
        </div>
      )}

      {(phase === "review" || phase === "saving") && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl2 border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Review the extracted fields</h2>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">Building *</span>
              <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className={input}>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">Apartment</span>
                <input value={apt} onChange={(e) => setApt(e.target.value)} className={input} placeholder="7C" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/-/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">Reporter name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className={input}
              />
            </label>
            {error && <p className="text-sm text-danger-800">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void save()}
                disabled={phase === "saving"}
                className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {phase === "saving" ? "Saving…" : "Create work order"}
              </button>
              <button
                onClick={() => {
                  setPhase("idle");
                  setRawText("");
                }}
                className="rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100"
              >
                Rescan
              </button>
            </div>
          </div>

          <div className="rounded-xl2 border border-ink-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold">Raw scanned text</h2>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Scanned document" className="mb-3 max-h-40 rounded-md" />
            )}
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-ink-50 p-3 text-xs text-ink-600">
              {rawText || "(nothing extracted)"}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
