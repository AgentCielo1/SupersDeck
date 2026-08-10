import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, WRITE_ASMP } from "@/lib/authz";
import { parseJson } from "@/lib/validation";

// =============================================================================
//  POST /api/work-orders/:id/extract-signature
// =============================================================================
//  Given a photo of the signed paper work order (data URL), ask Claude vision
//  WHERE the handwritten signature is. Returns a normalized bounding box; the
//  CLIENT does the actual cropping (canvas) from its full-resolution image.
//
//  Honesty contract (see ~/Developer/bug-log, class false-assurance): this
//  endpoint locates — it never invents. Any failure (no key, model error,
//  unparsable answer, nothing handwritten found) returns { found: false } and
//  the caller completes the work order with the paper photo alone.
// =============================================================================

export const maxDuration = 60;

const Schema = z.object({
  // ~8 MB of base64 — the client sends its compressed capture.
  image: z.string().min(50).max(11_000_000),
});

const MODEL = process.env.SIGNATURE_VISION_MODEL || "claude-opus-4-8";

const PROMPT = `This is a photo of a signed paper work order form. Locate the handwritten SIGNATURE (the cursive/scrawled name a person signed, usually on or near a signature line — not printed text, not handwritten block letters filling out form fields).

Reply with STRICT JSON only, no other text:
{"found": true|false, "x": <left 0-1>, "y": <top 0-1>, "w": <width 0-1>, "h": <height 0-1>}

Coordinates are fractions of the full image. Make the box tight around the signature stroke with a small margin. If there is no handwritten signature, reply {"found": false}.`;

export async function POST(
  request: Request,
  { params: _params }: { params: { id: string } }
) {
  const auth = await requireRole(WRITE_ASMP);
  if (auth.response) return auth.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ found: false, reason: "no_api_key" });

  const parsed = await parseJson(request, Schema);
  if (parsed.response) return parsed.response;

  const m = parsed.data.image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) {
    return NextResponse.json(
      { error: "image must be a jpeg/png/webp data URL" },
      { status: 400 }
    );
  }
  const [, mediaType, b64] = m;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[extract-signature] API", res.status, (await res.text()).slice(0, 200));
      return NextResponse.json({ found: false, reason: "api_error" });
    }
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return NextResponse.json({ found: false, reason: "unparsable" });
    const box = JSON.parse(json);
    const num = (v: unknown) => typeof v === "number" && isFinite(v);
    if (
      box.found === true &&
      num(box.x) && num(box.y) && num(box.w) && num(box.h) &&
      box.w > 0.01 && box.h > 0.005 &&
      box.x >= 0 && box.y >= 0 && box.x + box.w <= 1.001 && box.y + box.h <= 1.001
    ) {
      return NextResponse.json({
        found: true,
        box: { x: box.x, y: box.y, w: box.w, h: box.h },
      });
    }
    return NextResponse.json({ found: false, reason: "not_found" });
  } catch (e) {
    console.error("[extract-signature]", e);
    return NextResponse.json({ found: false, reason: "error" });
  }
}
