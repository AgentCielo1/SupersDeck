import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { toNormalized } from "@/lib/wo-adapter";
import { renderWorkOrderPdf } from "@/lib/wo-pdf";
import type { NormalizedWorkOrder } from "@workorder/kit/contract";
import { parseJson } from "@/lib/validation";

// recipient bounded here; format ("A valid recipient email…") is enforced by
// the handler's EMAIL_RE check below.
const EmailPdfSchema = z.object({
  recipient: z.string().max(300).optional(),
});

// =============================================================================
//  /api/work-orders/:id/email-pdf
// =============================================================================
//  GET  — download/preview the work-order PDF (vector, one clean page).
//  POST — email that same PDF (body: { recipient }). Auth-gated by middleware.
//  The PDF is rendered server-side from the work order (no client capture).
// =============================================================================

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function fetchUnitLabel(unitId: string | undefined) {
  if (!unitId) return null;
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("units")
    .select("label")
    .eq("id", unitId)
    .maybeSingle();
  return (data as { label: string } | null) ?? null;
}

async function loadNormalized(
  id: string
): Promise<{ ticket: string; normalized: NormalizedWorkOrder } | null> {
  const wo = await db.workOrder(id);
  if (!wo) return null;
  const [building, unit] = await Promise.all([
    db.building(wo.building_id),
    fetchUnitLabel(wo.unit_id),
  ]);
  return {
    ticket: wo.ticket_number,
    normalized: toNormalized(wo, { building, unit }),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const data = await loadNormalized(params.id);
  if (!data) {
    return NextResponse.json({ error: "Work order not found." }, { status: 404 });
  }
  const pdf = await renderWorkOrderPdf(data.normalized);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.ticket}.pdf"`,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email isn't configured (RESEND_API_KEY)." },
      { status: 503 }
    );
  }

  const parsed = await parseJson(request, EmailPdfSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const recipient = String(body.recipient ?? "").trim();
  if (!EMAIL_RE.test(recipient)) {
    return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  const data = await loadNormalized(params.id);
  if (!data) {
    return NextResponse.json({ error: "Work order not found." }, { status: 404 });
  }

  const pdf = await renderWorkOrderPdf(data.normalized);
  const titleEn = data.normalized.title;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "SupersDeck <onboarding@resend.dev>",
    to: recipient,
    subject: `Work order ${data.ticket}${titleEn ? ` — ${titleEn}` : ""}`,
    html: `<p>Attached: work order <strong>${data.ticket}</strong>.</p>${
      titleEn ? `<p>${titleEn}</p>` : ""
    }`,
    attachments: [{ filename: `${data.ticket}.pdf`, content: pdf }],
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Email failed to send." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
