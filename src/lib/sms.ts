import twilio from "twilio";

// =============================================================================
//  Server-side SMS helper (Twilio) — EMERGENCY tier hard fallback
// =============================================================================
//  • SMS is the channel that MUST reach staff when push delivery is unreliable
//    (locked phone, no PWA installed, iOS push limits). So we send it for the
//    EMERGENCY tier and log every per-recipient result (sent/failed).
//  • Best-effort by design: a Twilio outage logs + returns failed, it never
//    throws into the alert dispatcher (push + email already fired).
//
//  Requires env vars:
//    TWILIO_ACCOUNT_SID
//    TWILIO_AUTH_TOKEN
//    TWILIO_FROM_NUMBER     (E.164, e.g. +15555550123)
// =============================================================================

export interface SmsResult {
  to: string;
  status: "sent" | "failed";
  sid?: string;
  error?: string;
}

let _client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!_client) _client = twilio(sid, token);
  return _client;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

/** Normalize a stored phone number to E.164 (US default). Returns null if it
 *  can't be coerced into something plausibly dialable. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 10 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Send one SMS. Never throws — returns a structured result. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const client = getClient();
  const from = process.env.TWILIO_FROM_NUMBER;
  const normalized = toE164(to);
  if (!client || !from) {
    return { to, status: "failed", error: "Twilio not configured" };
  }
  if (!normalized) {
    return { to, status: "failed", error: "Unparseable phone number" };
  }
  try {
    const msg = await client.messages.create({ to: normalized, from, body });
    return { to: normalized, status: "sent", sid: msg.sid };
  } catch (err: any) {
    return {
      to: normalized,
      status: "failed",
      error: err?.message ? String(err.message) : "Twilio send error",
    };
  }
}

/** Fan out the same message to many numbers in parallel. Best-effort. */
export async function sendBulkSms(
  recipients: Array<{ phone: string; profileId?: string | null }>,
  body: string
): Promise<Array<SmsResult & { profileId?: string | null }>> {
  return Promise.all(
    recipients.map(async (r) => ({
      ...(await sendSms(r.phone, body)),
      profileId: r.profileId ?? null,
    }))
  );
}
