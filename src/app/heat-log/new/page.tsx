"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { SAMPLE_BUILDINGS } from "@/data/sample-data";
import type { Building } from "@/types";

// =============================================================================
//  Heat & hot-water reading entry
// =============================================================================
//  HPD thresholds: 68°F day / 62°F night when outdoor <55°F (Oct 1 – May 31).
//  Hot water ≥120°F year-round. Failing the threshold doesn't block the save —
//  it just flags the reading so it's easy to spot in the log later.
// =============================================================================

const HPD_HEAT_DAY = 68;
const HPD_HEAT_NIGHT = 62;
const HPD_HOT_WATER = 120;

interface Threshold {
  pass: boolean;
  message: string;
}

function evaluate(indoor: number, hotWater: number | null, outdoor: number | null): {
  heat: Threshold;
  water: Threshold;
} {
  const now = new Date();
  const hour = now.getHours();
  const isDay = hour >= 6 && hour < 22;
  const month = now.getMonth() + 1;
  const inHeatSeason = month >= 10 || month <= 5;
  const heatRelevant =
    inHeatSeason && (outdoor === null || outdoor < 55);
  const threshold = isDay ? HPD_HEAT_DAY : HPD_HEAT_NIGHT;

  const heat: Threshold = !heatRelevant
    ? { pass: true, message: "Heat threshold doesn't apply right now (off-season or outdoor ≥55°F)." }
    : indoor >= threshold
    ? { pass: true, message: `OK — at or above HPD ${isDay ? "day" : "night"} minimum of ${threshold}°F.` }
    : { pass: false, message: `BELOW HPD ${isDay ? "day" : "night"} minimum of ${threshold}°F. This is a violation if a tenant complains.` };

  const water: Threshold = hotWater === null
    ? { pass: true, message: "No hot-water reading entered." }
    : hotWater >= HPD_HOT_WATER
    ? { pass: true, message: `OK — at or above HPD year-round minimum of ${HPD_HOT_WATER}°F.` }
    : { pass: false, message: `BELOW HPD minimum of ${HPD_HOT_WATER}°F. Tenant complaints can become Class C violations fast.` };

  return { heat, water };
}

export default function NewHeatLogPage() {
  const router = useRouter();
  // In Supabase mode the buildings come from db, but the form is client-side
  // and we don't want an extra fetch round-trip. Use the local seed (which is
  // kept in sync with the actual building IDs).
  const [buildings] = useState<Building[]>(SAMPLE_BUILDINGS);

  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? "");
  const [unitLabel, setUnitLabel] = useState("");
  const [indoor, setIndoor] = useState<string>("");
  const [hotWater, setHotWater] = useState<string>("");
  const [outdoor, setOutdoor] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const indoorNum = Number(indoor);
  const hotWaterNum = hotWater === "" ? null : Number(hotWater);
  const outdoorNum = outdoor === "" ? null : Number(outdoor);
  const evaluation = Number.isFinite(indoorNum)
    ? evaluate(indoorNum, hotWaterNum, outdoorNum)
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(indoorNum)) {
      setError("Indoor temperature is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/heat-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        building_id: buildingId,
        unit_id: null, // could lookup by (building_id, label) in future
        indoor_temp_f: indoorNum,
        hot_water_temp_f: hotWaterNum,
        outdoor_temp_f: outdoorNum,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    router.push("/heat-log");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Log a heat & hot-water reading"
        subtitle="HPD heat season: Oct 1 – May 31. Day ≥68°F / night ≥62°F when outdoor <55°F. Hot water ≥120°F year-round."
        actions={
          <Link
            href="/heat-log"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Heat log
          </Link>
        }
      />

      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-5"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Building *">
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className={input}
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.address}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit (optional — leave blank for whole-building reading)">
            <input
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder="e.g. 7C"
              className={input}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Indoor temp (°F) *">
            <input
              type="number"
              step="0.1"
              value={indoor}
              onChange={(e) => setIndoor(e.target.value)}
              required
              className={input}
            />
          </Field>
          <Field label="Hot water temp (°F)">
            <input
              type="number"
              step="0.1"
              value={hotWater}
              onChange={(e) => setHotWater(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Outdoor temp (°F)">
            <input
              type="number"
              step="0.1"
              value={outdoor}
              onChange={(e) => setOutdoor(e.target.value)}
              className={input}
            />
          </Field>
        </div>

        {evaluation && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ThresholdBox
              label="Heat compliance"
              pass={evaluation.heat.pass}
              message={evaluation.heat.message}
            />
            <ThresholdBox
              label="Hot water compliance"
              pass={evaluation.water.pass}
              message={evaluation.water.message}
            />
          </div>
        )}

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Reading taken in living room. Boiler #2 running."
            className={input}
          />
        </Field>

        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save reading"}
          </button>
          <Link
            href="/heat-log"
            className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

const input =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function ThresholdBox({
  label,
  pass,
  message,
}: {
  label: string;
  pass: boolean;
  message: string;
}) {
  const cls = pass
    ? "border-ok-600/40 bg-ok-50 text-ok-800"
    : "border-danger-600/40 bg-danger-50 text-danger-800";
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${cls}`}>
      <div className="font-semibold">{label}</div>
      <div className="mt-0.5">{message}</div>
    </div>
  );
}
