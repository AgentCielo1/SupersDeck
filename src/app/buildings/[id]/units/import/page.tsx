"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import PageHeader from "@/components/PageHeader";

// =============================================================================
//  CSV Unit Importer
// =============================================================================
//  Drop a CSV exported from your spreadsheet or property-management software
//  and the app parses, validates, previews, then bulk-imports to Supabase.
//
//  Required columns: label
//  Optional:         line, floor, bedrooms, bathrooms, occupied,
//                    tenant_name, tenant_phone, is_section8,
//                    has_children_under_6, has_children_under_11, notes
//
//  Re-importing the same file is safe — units are upserted by (building, label).
// =============================================================================

interface ParsedUnit {
  label: string;
  line?: string;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  occupied?: boolean;
  tenant_name?: string;
  tenant_phone?: string;
  is_section8?: boolean;
  has_children_under_6?: boolean;
  has_children_under_11?: boolean;
  notes?: string;
  _row: number;
  _warnings: string[];
}

const BOOL_FIELDS = [
  "occupied",
  "is_section8",
  "has_children_under_6",
  "has_children_under_11",
];

function parseBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return undefined;
}

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeRow(raw: Record<string, string>, rowNumber: number): ParsedUnit {
  const warnings: string[] = [];
  const label = (raw.label ?? raw.unit ?? "").trim();

  if (!label) warnings.push("missing label");

  const out: ParsedUnit = {
    label,
    line: raw.line?.trim() || label.replace(/[0-9]/g, "").trim() || undefined,
    floor:
      parseNum(raw.floor) ??
      parseNum(label.replace(/[^0-9]/g, "")) ??
      undefined,
    bedrooms: parseNum(raw.bedrooms),
    bathrooms: parseNum(raw.bathrooms),
    occupied: parseBool(raw.occupied),
    tenant_name: raw.tenant_name?.trim() || undefined,
    tenant_phone: raw.tenant_phone?.trim() || undefined,
    is_section8: parseBool(raw.is_section8),
    has_children_under_6: parseBool(raw.has_children_under_6),
    has_children_under_11: parseBool(raw.has_children_under_11),
    notes: raw.notes?.trim() || undefined,
    _row: rowNumber,
    _warnings: warnings,
  };

  if (out.label && /\D$/.test(out.label) === false && !out.line) {
    warnings.push("could not infer line letter");
  }
  return out;
}

export default function UnitImportPage() {
  const params = useParams<{ id: string }>();
  const buildingId = params?.id ?? "";

  const [rows, setRows] = useState<ParsedUnit[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; inserted: number; skipped: number }
    | { ok: false; error: string }
    | null
  >(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setResult(null);

    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = res.data.map((r, i) => normalizeRow(r, i + 2));
        setRows(parsed);
      },
      error: (err) => {
        setResult({ ok: false, error: `CSV parse error: ${err.message}` });
      },
    });
  }

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/units/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: buildingId,
          units: rows
            .filter((r) => r.label.length > 0)
            .map(({ _row, _warnings, ...u }) => u),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? "Import failed" });
      } else {
        setResult({
          ok: true,
          inserted: data.inserted ?? 0,
          skipped: data.skipped ?? 0,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setResult({ ok: false, error: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const validRows = rows.filter((r) => r.label);
  const warnings = rows.filter((r) => r._warnings.length > 0);

  return (
    <>
      <PageHeader
        title="Import units"
        subtitle={`Bulk-load all units for ${buildingId} from a CSV.`}
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
          Required column: <code className="bg-white px-1 rounded">label</code>{" "}
          (e.g. <code>7C</code>). Optional columns:{" "}
          <code>line, floor, bedrooms, bathrooms, occupied, tenant_name, tenant_phone, is_section8, has_children_under_6, has_children_under_11, notes</code>
          . Boolean columns accept true/false/yes/no/1/0. Re-uploading the same
          file is safe (units are upserted by label).
        </p>
        <p className="mt-2">
          <a
            href="/templates/units-sample.csv"
            download
            className="inline-block rounded-md bg-white px-2 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100"
          >
            Download sample template ↓
          </a>
        </p>
      </div>

      <div className="mt-4 rounded-xl2 border border-ink-200 bg-white p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">
            Upload CSV
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800"
          />
        </label>
        {fileName && (
          <div className="mt-2 text-xs text-ink-400">
            Loaded: <span className="font-mono">{fileName}</span> · {rows.length}{" "}
            rows ({validRows.length} valid, {warnings.length} with warnings)
          </div>
        )}
      </div>

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
              {submitting ? "Importing…" : `Import ${validRows.length} units`}
            </button>
          </div>
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-3 py-2 text-left">Row</th>
                  <th className="px-3 py-2 text-left">Label</th>
                  <th className="px-3 py-2 text-left">Line</th>
                  <th className="px-3 py-2 text-right">Floor</th>
                  <th className="px-3 py-2 text-right">BR</th>
                  <th className="px-3 py-2 text-left">Tenant</th>
                  <th className="px-3 py-2 text-left">S8 / LL1 / WG</th>
                  <th className="px-3 py-2 text-left">Notes / warnings</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t border-ink-100 ${
                      r._warnings.length ? "bg-warn-50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-xs text-ink-400">{r._row}</td>
                    <td className="px-3 py-2 font-mono">{r.label}</td>
                    <td className="px-3 py-2">{r.line ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.floor ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.bedrooms ?? "—"}</td>
                    <td className="px-3 py-2">{r.tenant_name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.is_section8 ? "S8 " : ""}
                      {r.has_children_under_6 ? "LL1 " : ""}
                      {r.has_children_under_11 ? "WG " : ""}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r._warnings.length > 0 ? (
                        <span className="text-warn-800">
                          ⚠ {r._warnings.join(", ")}
                        </span>
                      ) : (
                        r.notes ?? ""
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
          {result.ok
            ? `Imported ${result.inserted} units. ${
                result.skipped > 0 ? `Skipped ${result.skipped} blank rows.` : ""
              }`
            : `Error: ${result.error}`}
        </div>
      )}
    </>
  );
}
