import webpush from "web-push";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  Server-side Web Push helper
// =============================================================================
//  • Wraps the `web-push` library so VAPID config happens once.
//  • Fans out a payload to every push_subscriptions row for a list of user
//    IDs (typically all admin+super users), in parallel.
//  • Handles 404/410 from the push endpoint by deleting the dead row so we
//    don't pile up garbage subscriptions over time.
//
//  Requires env vars:
//    NEXT_PUBLIC_VAPID_PUBLIC_KEY   (also used by the browser to subscribe)
//    VAPID_PRIVATE_KEY              (server only — never bundle)
//    VAPID_CONTACT_EMAIL (optional, defaults to mailto:noreply@supersdeck.app)
// =============================================================================

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT_EMAIL || "mailto:noreply@supersdeck.app",
    pub,
    priv
  );
  configured = true;
  return true;
}

export interface PushAction {
  action: string;
  title: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  priority?: "emergency" | "high" | "normal" | "low";
  /** Notification action buttons (e.g. an "Acknowledge" button). Honored by
   *  the service worker; iOS PWAs ignore these but Android/desktop show them. */
  actions?: PushAction[];
  /** Opaque id surfaced back to the SW on action click (e.g. the alert id). */
  alertId?: string;
}

/** Send a push to every subscription owned by any of the given user IDs. */
export async function pushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; reaped: number }> {
  if (!ensureConfigured()) {
    return { sent: 0, failed: 0, reaped: 0 };
  }
  if (userIds.length === 0) return { sent: 0, failed: 0, reaped: 0 };

  const supabase = getServerSupabase();
  if (!supabase) return { sent: 0, failed: 0, reaped: 0 };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (!subs || subs.length === 0) {
    return { sent: 0, failed: 0, reaped: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const deadIds: string[] = [];

  await Promise.all(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body
        );
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription is gone — reap it.
          deadIds.push(s.id);
        } else {
          failed++;
          console.error("[push] send failed:", status, err?.message);
        }
      }
    })
  );

  let reaped = 0;
  if (deadIds.length > 0) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", deadIds);
    if (!error) reaped = deadIds.length;
  }

  return { sent, failed, reaped };
}

/** Convenience: send to every user with role admin or super. */
export async function pushToAdminsAndSupers(
  payload: PushPayload
): Promise<{ sent: number; failed: number; reaped: number }> {
  const supabase = getServerSupabase();
  if (!supabase) return { sent: 0, failed: 0, reaped: 0 };

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "super"]);
  const ids = (data ?? []).map((p: any) => p.id as string);
  return pushToUsers(ids, payload);
}
