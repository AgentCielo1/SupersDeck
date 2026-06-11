"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// =============================================================================
//  PushManagerClient — registers the service worker + offers a one-tap
//  enable-notifications banner.
// =============================================================================
//  Behavior:
//    1. On mount (for signed-in users), registers /sw.js. Idempotent.
//    2. Checks Notification.permission:
//         "granted" → make sure we have an active subscription on file.
//                      If not (e.g. user re-installed PWA), subscribe and
//                      POST it.
//         "default" → show a small banner inviting them to enable. One tap
//                      to grant permission + subscribe.
//         "denied"  → silent (browser is final on this).
//    3. Banner is dismissible per session.
//
//  iOS note: Web Push only works for PWAs added to the home screen on
//  iOS 16.4+. Inside Safari the API exists but subscribe() throws. We catch
//  that quietly so it doesn't error out the UI.
// =============================================================================

const PUBLIC_PATHS = ["/login", "/auth", "/intake", "/track"];

export default function PushManagerClient({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const [state, setState] = useState<
    "idle" | "needs-permission" | "subscribed" | "blocked" | "unsupported"
  >("idle");
  const [dismissed, setDismissed] = useState(false);

  const onPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  useEffect(() => {
    if (!signedIn || onPublic) return;
    if (typeof window === "undefined") return;

    const supportsSW = "serviceWorker" in navigator;
    const supportsPush = "PushManager" in window;
    const supportsNotif = "Notification" in window;
    if (!supportsSW || !supportsPush || !supportsNotif) {
      setState("unsupported");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Register service worker (no-op if already registered).
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const permission = Notification.permission;
        if (permission === "denied") {
          if (!cancelled) setState("blocked");
          return;
        }

        if (permission === "granted") {
          // Make sure we have a server subscription on file. If we don't
          // (new device / cleared site data), create one silently.
          const existing = await reg.pushManager.getSubscription();
          if (existing) {
            await postSubscription(existing).catch(() => {
              /* offline / RLS / etc — try again next load */
            });
          } else {
            await subscribeAndPost(reg).catch(() => {
              /* permission may have changed between checks */
            });
          }
          if (!cancelled) setState("subscribed");
          return;
        }

        if (!cancelled) setState("needs-permission");
      } catch (e) {
        if (!cancelled) setState("unsupported");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, onPublic]);

  async function enable() {
    if (typeof window === "undefined") return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "blocked" : "needs-permission");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    try {
      await subscribeAndPost(reg);
      setState("subscribed");
    } catch (e) {
      console.error("[push] subscribe failed:", e);
      setState("blocked");
    }
  }

  if (!signedIn || onPublic || dismissed) return null;
  if (state !== "needs-permission") return null;

  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b border-brand-400/40 bg-brand-50 px-4 py-2 text-center text-sm text-brand-800 shadow-sm">
      <span>
        Get a notification the second a tenant submits a work order.{" "}
      </span>
      <button
        onClick={enable}
        className="ml-2 rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-800"
      >
        Enable
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-2 text-xs text-brand-800 hover:underline"
      >
        Not now
      </button>
    </div>
  );
}

async function subscribeAndPost(reg: ServiceWorkerRegistration) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublic),
  });
  await postSubscription(sub);
}

async function postSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
