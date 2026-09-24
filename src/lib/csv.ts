// =============================================================================
//  CSV building blocks — RFC 4180 + formula-injection mitigation
// =============================================================================
//  Extracted from the work-orders export so every CSV the app produces gets
//  the same two protections:
//  • OWASP CSV-injection: a leading = + - @ tab or CR would make Excel /
//    Google Sheets / LibreOffice evaluate the cell as a formula
//    (`=HYPERLINK("http://evil","click")` in a description would execute in
//    the exporter's spreadsheet). Neutralized with a single-quote prefix
//    BEFORE quoting, so the cell reads as text.
//  • RFC 4180 quoting for commas, quotes, and newlines.
// =============================================================================

const DANGEROUS_LEADING_CHARS = /^[=+\-@\t\r]/;

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : String(v);
  if (DANGEROUS_LEADING_CHARS.test(s)) {
    s = `'${s}`;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

/** Join rows into a downloadable CSV body (CRLF per RFC 4180). */
export function csvBody(lines: string[]): string {
  return lines.join("\r\n") + "\r\n";
}
