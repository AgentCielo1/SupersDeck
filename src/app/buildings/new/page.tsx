"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const DEFAULT_LINES = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M"];

export default function NewBuildingPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [borough, setBorough] = useState<typeof BOROUGHS[number]>("Queens");
  const [yearBuilt, setYearBuilt] = useState<string>("");
  const [numFloors, setNumFloors] = useState<string>("12");
  const [squareFootage, setSquareFootage] = useState<string>("");
  const [bin, setBin] = useState("");
  const [bbl, setBbl] = useState("");
  const [hpdId, setHpdId] = useState("");
  const [communityDistrict, setCommunityDistrict] = useState("");
  const [hasSection8, setHasSection8] = useState(false);
  const [isPactRad, setIsPactRad] = useState(false);
  const [hasOilHeat, setHasOilHeat] = useState(false);
  const [hasCoolingTower, setHasCoolingTower] = useState(false);
  const [hasSprinkler, setHasSprinkler] = useState(true);
  const [hasKnownLead, setHasKnownLead] = useState(false);
  const [heatNotes, setHeatNotes] = useState("");
  const [generateUnits, setGenerateUnits] = useState(true);
  const [lineLayout, setLineLayout] = useState(DEFAULT_LINES.join(","));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const floors = Number(numFloors) || 0;
  const lines = lineLayout.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const projectedUnits = generateUnits ? floors * lines.length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        address,
        borough,
        year_built: yearBuilt ? Number(yearBuilt) : null,
        num_floors: Number(numFloors),
        num_units: generateUnits ? projectedUnits : 0,
        square_footage: squareFootage ? Number(squareFootage) : null,
        bin: bin.trim() || null,
        bbl: bbl.trim() || null,
        hpd_id: hpdId.trim() || null,
        community_district: communityDistrict.trim() || null,
        has_section8: hasSection8,
        is_pact_rad: isPactRad,
        has_oil_heat: hasOilHeat,
        has_cooling_tower: hasCoolingTower,
        has_sprinkler: hasSprinkler,
        has_known_lead: hasKnownLead,
        heat_notes: heatNotes.trim() || null,
        generate_units: generateUnits,
        line_layout: lines,
      }),
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
    <>
      <PageHeader
        title="Add a building"
        subtitle="A new property to track. Units are auto-generated from the line layout if you want."
        actions={
          <Link
            href="/buildings"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Buildings
          </Link>
        }
      />

      <form
        onSubmit={submit}
        className="space-y-5 rounded-xl2 border border-ink-200 bg-white p-5"
      >
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Identity</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} required className={input} placeholder="e.g. Building 4" />
            </Field>
            <Field label="Borough *">
              <select value={borough} onChange={(e) => setBorough(e.target.value as any)} className={input}>
                {BOROUGHS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Address *" className="md:col-span-2">
              <input value={address} onChange={(e) => setAddress(e.target.value)} required className={input} placeholder="e.g. 110-15 62nd Drive, Queens, NY 11375" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">City identifiers</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="BIN"><input value={bin} onChange={(e) => setBin(e.target.value)} className={input} /></Field>
            <Field label="BBL"><input value={bbl} onChange={(e) => setBbl(e.target.value)} className={input} /></Field>
            <Field label="HPD ID"><input value={hpdId} onChange={(e) => setHpdId(e.target.value)} className={input} /></Field>
            <Field label="CD"><input value={communityDistrict} onChange={(e) => setCommunityDistrict(e.target.value)} placeholder="QN-06" className={input} /></Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Physical</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label="Year built"><input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} className={input} /></Field>
            <Field label="Floors *"><input type="number" value={numFloors} onChange={(e) => setNumFloors(e.target.value)} required className={input} /></Field>
            <Field label="Square footage"><input type="number" value={squareFootage} onChange={(e) => setSquareFootage(e.target.value)} className={input} /></Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Building flags</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Toggle label="PACT/RAD conversion" value={isPactRad} onChange={setIsPactRad} />
            <Toggle label="Has Section 8 units" value={hasSection8} onChange={setHasSection8} />
            <Toggle label="Sprinkler / standpipe system" value={hasSprinkler} onChange={setHasSprinkler} />
            <Toggle label="Cooling tower (LL77 applies)" value={hasCoolingTower} onChange={setHasCoolingTower} />
            <Toggle label="Oil heat (current — includes temporary)" sub="Triggers FDNY Q-99 + PBS tank reg." value={hasOilHeat} onChange={setHasOilHeat} />
            <Toggle label="Documented lead paint" sub="Required for LL1 / LL31 in 1960-78 buildings." value={hasKnownLead} onChange={setHasKnownLead} />
          </div>
          <Field label="Heat notes (optional)" className="mt-3">
            <textarea value={heatNotes} onChange={(e) => setHeatNotes(e.target.value)} rows={2} className={input} />
          </Field>
        </section>

        <section className="rounded-md border border-ink-200 bg-ink-50 p-4">
          <Toggle label="Auto-generate units" sub={`Will insert ${projectedUnits} units (${floors} floors × ${lines.length} lines per floor) using the standard line-bedroom layout (C/K = 3BR, A/B/J/L/M = 2BR, D/E/G/H = 1BR, F = studio).`} value={generateUnits} onChange={setGenerateUnits} />
          {generateUnits && (
            <Field label="Line layout (comma-separated; default is A,B,C,D,E,F,G,H,J,K,L,M — NYC convention skips I)" className="mt-3">
              <input value={lineLayout} onChange={(e) => setLineLayout(e.target.value)} className={input} />
            </Field>
          )}
        </section>

        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
            {saving ? "Creating…" : "Create building"}
          </button>
          <Link href="/buildings" className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

const input =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-ink-200 bg-white p-2 hover:bg-ink-50">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {sub && <span className="block text-xs text-ink-400">{sub}</span>}
      </span>
    </label>
  );
}
