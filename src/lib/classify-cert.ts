// =============================================================================
//  classify-cert — read an uploaded certificate photo with Claude vision and
//  return structured fields. Graceful: any failure returns EMPTY so the caller
//  still saves the file and lets the user fill in the details by hand.
// =============================================================================

const ANTHROPIC_VERSION = "2023-06-01";

export type CertClassification = {
  type: string | null;
  number: string | null;
  issued_at: string | null; // YYYY-MM-DD
  expires_at: string | null; // YYYY-MM-DD
  agency: string | null;
  holder_name: string | null;
  cert_key: string | null;
  confidence: "high" | "medium" | "low" | null;
};

const EMPTY: CertClassification = {
  type: null, number: null, issued_at: null, expires_at: null,
  agency: null, holder_name: null, cert_key: null, confidence: null,
};

const VALID_KEYS = new Set([
  "fdny-s12", "fdny-s13", "fdny-s14", "fdny-s95", "fdny-p99",
  "fdny-q99", "fdny-f80", "fdny-a35", "epa-rrp", "osha-30",
]);

const PROMPT = `You are reading a photo of a professional certification or license card held by a NYC building superintendent. Extract its details EXACTLY as printed.

Return ONLY a single JSON object (no prose, no code fences) with these exact keys:
{"type":"...","number":"...","issued_at":"YYYY-MM-DD or null","expires_at":"YYYY-MM-DD or null","agency":"...","holder_name":"...","cert_key":"...","confidence":"high|medium|low"}

Rules:
- "type": a short human label, e.g. "FDNY S-12 — Citywide Sprinkler", "OSHA 30 — Construction", "EPA Section 608 — Universal Technician", "NYC SST Card".
- "number": the certificate / card / ID number exactly as printed, or null.
- Dates as YYYY-MM-DD. If the card has no expiration (e.g. an OSHA card or EPA 608), expires_at = null.
- "agency": issuing body, e.g. "FDNY", "OSHA", "EPA", "NYC DOB".
- "holder_name": the person named on the card, or null.
- "cert_key": one of fdny-s12, fdny-s13, fdny-s14, fdny-s95, fdny-p99, fdny-q99, fdny-f80, fdny-a35, epa-rrp, osha-30 — or null if none apply. NOTE: FDNY S-12 = Sprinkler, S-13 = Standpipe.
- Transcribe numbers and dates character-for-character. Never invent a value; use null when unsure.`;

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

export async function classifyCert(
  base64: string,
  mediaType: string,
  opts: { apiKey?: string; model?: string } = {}
): Promise<CertClassification> {
  const apiKey = opts.apiKey;
  if (!apiKey || !base64) return EMPTY;
  const model = opts.model ?? "claude-opus-4-8";
  const media = /^image\/(png|jpeg|gif|webp)$/.test(mediaType) ? mediaType : "image/jpeg";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: media, data: base64 } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[classify-cert] non-OK:", res.status, await res.text());
      return EMPTY;
    }
    const data: { content?: Array<{ text?: string }> } = await res.json();
    const raw = data?.content?.[0]?.text;
    if (typeof raw !== "string") return EMPTY;
    const parsed = parseJsonObject(raw);
    if (!parsed) return EMPTY;

    const str = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s && s.toLowerCase() !== "null" ? s : null;
    };
    const date = (v: unknown) => {
      const s = String(v ?? "").trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    };
    const key = str(parsed.cert_key);
    const conf = String(parsed.confidence ?? "");

    return {
      type: str(parsed.type),
      number: str(parsed.number),
      issued_at: date(parsed.issued_at),
      expires_at: date(parsed.expires_at),
      agency: str(parsed.agency),
      holder_name: str(parsed.holder_name),
      cert_key: key && VALID_KEYS.has(key) ? key : null,
      confidence: ["high", "medium", "low"].includes(conf) ? (conf as CertClassification["confidence"]) : null,
    };
  } catch (e) {
    console.error("[classify-cert] error:", e);
    return EMPTY;
  }
}
