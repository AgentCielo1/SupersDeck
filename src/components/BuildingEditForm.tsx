"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Building } from "@/types";

// =============================================================================
//  Building edit form (client)
// =============================================================================
//  Pre-filled with the current Building. On submit, PATCHes the API and
//  redirects back to the buildings page. Validation is light — we trust the
//  super (no public form). The whitelist lives server-side in the API route.
// =============================================================================

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

export default function BuildingEditForm({ building }: { building: Building }) {
  const router = useRouter();
  const [b, setB] = useState<Building>(building);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Building>(k: K, v: Building[K]) {
    setB((cur) => ({ ...cur, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/buildings/${building.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    router.push("/buildings");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl2 border border-ink-200 bg-white p-5"
    >
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Identity</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Name">
            <input
              value={b.name}
              onChange={(e) => set("name", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Borough">
            <select
              value={b.borough}
              onChange={(e) => set("borough", e.target.value as Building["borough"])}
              className={input}
            >
              {BOROUGHS.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address" className="md:col-span-2">
            <input
              value={b.address}
              onChange={(e) => set("address", e.target.value)}
              className={input}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">City identifiers</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="BIN">
            <input
              value={b.bin ?? ""}
              onChange={(e) => set("bin", e.target.value)}
              placeholder="e.g. 4012345"
              className={input}
            />
          </Field>
          <Field label="BBL">
            <input
              value={b.bbl ?? ""}
              onChange={(e) => set("bbl", e.target.value)}
              placeholder="e.g. 4-04567-0001"
              className={input}
            />
          </Field>
          <Field label="HPD ID">
            <input
              value={b.hpd_id ?? ""}
              onChange={(e) => set("hpd_id", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Community District">
            <input
              value={b.community_district ?? ""}
              onChange={(e) => set("community_district", e.target.value)}
              placeholder="e.g. QN-06"
              className={input}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Physical</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Year built">
            <input
              type="number"
              value={b.year_built}
              onChange={(e) => set("year_built", Number(e.target.value))}
              className={input}
            />
          </Field>
          <Field label="Floors">
            <input
              type="number"
              value={b.num_floors}
              onChange={(e) => set("num_floors", Number(e.target.value))}
              className={input}
            />
          </Field>
          <Field label="Units">
            <input
              type="number"
              value={b.num_units}
              onChange={(e) => set("num_units", Number(e.target.value))}
              className={input}
            />
          </Field>
          <Field label="Sq ft">
            <input
              type="number"
              value={b.square_footage ?? ""}
              onChange={(e) =>
                set("square_footage", e.target.value === "" ? undefined : Number(e.target.value))
              }
              className={input}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">
          Building flags
        </h2>
        <p className="mb-3 text-xs text-ink-400">
          These drive which compliance items appear for this building.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Toggle label="PACT/RAD conversion" value={b.is_pact_rad} onChange={(v) => set("is_pact_rad", v)} />
          <Toggle label="Has Section 8 units" value={b.has_section8} onChange={(v) => set("has_section8", v)} />
          <Toggle label="Sprinkler / standpipe system" value={b.has_sprinkler} onChange={(v) => set("has_sprinkler", v)} />
          <Toggle label="Cooling tower (LL77 applies)" value={b.has_cooling_tower} onChange={(v) => set("has_cooling_tower", v)} />
          <Toggle
            label="Oil heat (currently — incl. temporary)"
            sub="Triggers FDNY Q-99 and PBS tank registration."
            value={b.has_oil_heat}
            onChange={(v) => set("has_oil_heat", v)}
          />
          <Toggle
            label="Documented lead paint"
            sub="Required for LL1 / LL31 in 1960-1978 buildings."
            value={b.has_known_lead}
            onChange={(v) => set("has_known_lead", v)}
          />
        </div>
        <Field label="Heat notes (optional)" className="mt-3">
          <textarea
            value={b.heat_notes ?? ""}
            onChange={(e) => set("heat_notes", e.target.value)}
            rows={2}
            placeholder='e.g. "Temporary oil — main gas boiler offline pending repair."'
            className={input}
          />
        </Field>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">
          Management contact
        </h2>
        <p className="mb-3 text-xs text-ink-400">
          The monthly owner report is emailed here on the 1st of every month —
          WO summary, overdue compliance, new HPD violations. Leave email
          blank to skip this building.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Manager name">
            <input
              value={b.manager_name ?? ""}
              onChange={(e) => set("manager_name", e.target.value)}
              placeholder="e.g. Lisa Park"
              className={input}
            />
          </Field>
          <Field label="Manager email">
            <input
              type="email"
              value={b.manager_email ?? ""}
              onChange={(e) => set("manager_email", e.target.value)}
              placeholder="e.g. lisa@yourmgmt.com"
              className={input}
            />
          </Field>
        </div>
      </section>

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
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/buildings")}
          className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const input =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-ink-200 p-2 hover:bg-ink-50">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {sub && <span className="block text-xs text-ink-400">{sub}</span>}
      </span>
    </label>
  );
}
