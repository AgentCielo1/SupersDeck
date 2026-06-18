import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";

// =============================================================================
//  POST /api/work-orders/:id/email-pdf
// =============================================================================
//  Emails a tenant/super-generated PDF of the work order. The client renders
//  the print sheet to a PDF and posts it here; we attach it and send via
//  Resend. Auth-gated by middleware (only signed-in staff reach it).
//  Body: { recipient: string, pdfBase64: string }
// =============================================================================

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

  let body: { recipient?: string; pdfBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recipient = String(body.recipient ?? "").trim();
  const pdfBase64 = String(body.pdfBase64 ?? "");
  if (!EMAIL_RE.test(recipient)) {
    return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
  }
  if (!pdfBase64) {
    return NextResponse.json({ error: "Missing PDF." }, { status: 400 });
  }

  const wo = await db.workOrder(params.id);
  if (!wo) {
    return NextResponse.json({ error: "Work order not found." }, { status: 404 });
  }

  // html2pdf/jsPDF prefixes the data URI with extra params (e.g.
  // "data:application/pdf;filename=generated.pdf;base64,"), so strip everything
  // up to and including "base64," — anything left over corrupts the decode.
  const marker = "base64,";
  const at = pdfBase64.indexOf(marker);
  const content = Buffer.from(
    at >= 0 ? pdfBase64.slice(at + marker.length) : pdfBase64,
    "base64"
  );
  const titleEn = wo.title_en || wo.title;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "SupersDeck <onboarding@resend.dev>",
    to: recipient,
    subject: `Work order ${wo.ticket_number}${titleEn ? ` — ${titleEn}` : ""}`,
    html: `<p>Attached: work order <strong>${wo.ticket_number}</strong>.</p>${
      titleEn ? `<p>${titleEn}</p>` : ""
    }`,
    attachments: [{ filename: `${wo.ticket_number}.pdf`, content }],
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Email failed to send." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
