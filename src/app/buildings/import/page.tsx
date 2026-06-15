"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import PageHeader from "@/components/PageHeader";

// =============================================================================
//  CSV Building Importer
// =============================================================================
//  Paste rows from a spreadsheet or drop a CSV exported from property-management
//  software; the app parses, validates, previews, then bulk-imports to Supabase.
//
//  Required columns: name, address, borough
//  Optional:         id, year_built, num_floors, num_units, square_footage,
//                    bin, bbl, hpd_id, community_district, has_section8,
//                    is_pact_rad, has_oil_heat, has_cooling_tower,
//                    has_sprinkler, has_known_lead, heat_notes,
//                    generate_units, line_layout
//
//  Re-importing the same file is safe — buildings are upserted by id (derived
//  from `id` or the slugged name).
// =============================================================================

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const BOROUGH_ALIASES: Record<string, string> = {
  manhattan: "Manhattan", mn: "Manhattan", "new york": "Manhattan", nyc: "Manhattan",
  brooklyn: "Brooklyn", bk: "Brooklyn", bklyn: "Brooklyn", kings: "Brooklyn",
  queens: "Queens", qn: "Queens", qns: "Queens",
  bronx: "Bronx", bx: "Bronx", "the bronx": "Bronx",
  "staten island": "Staten Island", si: "Staten Island", richmond: "Staten Island",
};

function normalizeBorough(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return BOROUGH_ALIASES[v.trim().toLowerCase()];
}

function parseBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return undefined;
}

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

interface ParsedBuilding {
  id?: string;
  name: string;
  address: string;
  borough?: string;
  year_built?: number;
  num_floors?: number;
  num_units?: number;
  square_footage?: number;
  bin?: string;
  bbl?: string;
  hpd_id?: string;
  community_district?: string;
  has_section8?: boolean;
  is_pact_rad?: boolean;
  has_oil_heat?: boolean;
  has_cooling_tower?: boolean;
  has_sprinkler?: boolean;
  has_known_lead?: boolean;
  heat_notes?: string;
  generate_units?: boolean;
  line_layout?: string[];
  _row: number;
  _warnings: string[];
}

function normalizeRow(raw: Record<string, string>, rowNumber: number): ParsedBuilding {
  const warnings: string[] = [];
  const name = (raw.name ?? raw.building ?? "").trim();
  const address = (raw.address ?? "").trim();
  const rawBorough = (raw.borough ?? raw.boro ?? "").trim();
  const borough = normalizeBorough(rawBorough);

  if (!name) warnings.push("missing name");
  if (!address) warnings.push("missing address");
  if (!rawBorough) warnings.push("missing borough");
  else if (!borough) warnings.push(`unknown borough "${rawBorough}"`);

  const lineLayout = (raw.line_layout ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return {
    id: raw.id?.trim() || undefined,
    name,
    address,
    borough,
    year_built: parseNum(raw.year_built),
    num_floors: parseNum(raw.num_floors),
    num_units: parseNum(raw.num_units),
    square_footage: parseNum(raw.square_footage),
    bin: raw.bin?.trim() || undefined,
    bbl: raw.bbl?.trim() || undefined,
    hpd_id: raw.hpd_id?.trim() || undefined,
    community_district: raw.community_district?.trim() || undefined,
    has_section8: parseBool(raw.has_section8),
    is_pact_rad: parseBool(raw.is_pact_rad),
    has_oil_heat: parseBool(raw.has_oil_heat),
    has_cooling_tower: parseBool(raw.has_cooling_tower),
    has_sprinkler: parseBool(raw.has_sprinkler),
    has_known_lead: parseBool(raw.has_known_lead),
    heat_notes: raw.heat_notes?.trim() || undefined,
    generate_units: parseBool(raw.generate_units),
    line_layout: lineLayout.length > 0 ? lineLayout : undefined,
    _row: rowNumber,
    _warnings: warnings,
  };
}

const COLUMNS =
  "name, address, borough, year_built, num_floors, num_units, square_footage, bin, bbl, hpd_id, community_district, has_section8, is_pact_rad, has_oil_heat, has_cooling_tower, has_sprinkler, has_known_lead, heat_notes, generate_units, line_layout";

export default function BuildingImportPage() {
  const [rows, setRows] = useState<ParsedBuilding[]>([]);
  const [source, setSource] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; inserted: number; skipped: number; unitsInserted: number; errors: string[] }
    | { ok: false; error: string }
    | null
  >(null);

  function ingest(csv: string, label: string) {
    setResult(null);
    Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (res) => {
        const parsed = res.data.map((r, i) => normalizeRow(r, i + 2));
        setRows(parsed);
        setSource(label);
      },
      error: (err: Error) => setResult({ ok: false, error: `CSV parse error: ${err.message}` }),
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result ?? ""), f.name);
    reader.readAsText(f);
  }

  const validRows = rows.filter((r) => r.name && r.address && r.borough);
  const warnRows = rows.filter((r) => r._warnings.length > 0);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/buildings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildings: validRows.map(({ _row, _warnings, ...b }) => b),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? (data.errors ?? []).join("; ") ?? "Import failed" });
      } else {
        setResult({
          ok: true,
          inserted: data.inserted ?? 0,
          skipped: data.skipped ?? 0,
          unitsInserted: data.unitsInserted ?? 0,
          errors: data.errors ?? [],
        });
      }
    } catch (err: unknown) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Import buildings"
        subtitle="Bulk-load your whole portfolio from a spreadsheet — paste rows or upload a CSV."
        actions={
          <Link
            href="/buildings"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Buildings
          </Link>
        }
      />

      <div className="rounded-xl2 border border-brand-400/30 bg-brand-50 p-4 text-sm text-brand-800">
        <div className="font-semibold">CSV format</div>
        <p className="mt-1">
          Required columns:{" "}
          <code className="rounded bg-white px-1">name</code>,{" "}
          <code className="rounded bg-white px-1">address</code>,{" "}
          <code className="rounded bg-white px-1">borough</code> (full name or
          BK/QN/BX/MN/SI). Optional: <code className="rounded bg-white px-1">{COLUMNS}</code>.
          Boolean columns accept true/false/yes/no/1/0. Set{" "}
          <code className="rounded bg-white px-1">generate_units</code> to{" "}
          <code>true</code> (with <code>num_floors</code>) to auto-create the unit
          roster. Re-uploading the same file is safe — buildings are upserted by id.
        </p>
        <p className="mt-2">
          <a
            href="/templates/buildings-sample.csv"
            download
            className="inline-block rounded-md bg-white px-2 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100"
          >
            Download sample template ↓
          </a>
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl2 border border-ink-200 bg-white p-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Upload CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800"
            />
          </label>
        </div>
        <div className="rounded-xl2 border border-ink-200 bg-white p-5">
          <span className="mb-1 block text-xs font-medium text-ink-600">…or paste rows (with header)</span>
          <textarea
            rows={3}
            placeholder="name,address,borough&#10;Riverside Gardens,110-15 62nd Dr Queens NY,Queens"
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 font-mono text-xs focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v.includes("\n") || v.includes(",")) ingest(e.target.value, "pasted rows");
              else if (!v) setRows([]);
            }}
          />
        </div>
      </div>

      {source && (
        <div className="mt-2 text-xs text-ink-400">
          Loaded <span className="font-mono">{source}</span> · {rows.length} rows (
          {validRows.length} valid, {warnRows.length} with warnings)
        </div>
      )}

      {rows.length > 0 && (
        <section className="mt-6 rounded-xl2 border border-ink-200 bg-white">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <h2 className="text-base font-semibold">Preview</h2>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || validRows.length === 0}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {submitting ? "Importing…" : `Import ${validRows.length} buildings`}
            </button>
          </div>
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-3 py-2 text-left">Row</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Address</th>
                  <th className="px-3 py-2 text-left">Borough</th>
                  <th className="px-3 py-2 text-right">Floors</th>
                  <th className="px-3 py-2 text-right">Units</th>
                  <th className="px-3 py-2 text-left">Flags</th>
                  <th className="px-3 py-2 text-left">Notes / warnings</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t border-ink-100 ${r._warnings.length ? "bg-warn-50" : ""}`}
                  >
                    <td className="px-3 py-2 text-xs text-ink-400">{r._row}</td>
                    <td className="px-3 py-2 font-medium">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-xs text-ink-600">{r.address || "—"}</td>
                    <td className="px-3 py-2">{r.borough ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.num_floors ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {r.generate_units && r.num_floors
                        ? `${r.num_units ?? r.num_floors * (r.line_layout?.length ?? 12)} ✨`
                        : r.num_units ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.is_pact_rad ? "PACT " : ""}
                      {r.has_section8 ? "S8 " : ""}
                      {r.has_oil_heat ? "Oil " : ""}
                      {r.has_known_lead ? "Lead " : ""}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r._warnings.length > 0 ? (
                        <span className="text-warn-800">⚠ {r._warnings.join(", ")}</span>
                      ) : (
                        r.heat_notes ?? ""
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <div
          className={`mt-4 rounded-xl2 border p-4 text-sm ${
            result.ok
              ? "border-ok-600/40 bg-ok-50 text-ok-800"
              : "border-danger-600/40 bg-danger-50 text-danger-800"
          }`}
        >
          {result.ok ? (
            <>
              <div className="font-medium">
                Imported {result.inserted} building{result.inserted === 1 ? "" : "s"}
                {result.unitsInserted > 0 ? ` and auto-generated ${result.unitsInserted} units` : ""}.
                {result.skipped > 0 ? ` Skipped ${result.skipped} invalid row${result.skipped === 1 ? "" : "s"}.` : ""}
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-warn-800">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              <Link href="/buildings" className="mt-2 inline-block font-medium underline">
                View buildings →
              </Link>
            </>
          ) : (
            `Error: ${result.error}`
          )}
        </div>
      )}
    </>
  );
}
