// =============================================================================
// SupersDeck — service worker for Web Push notifications
// =============================================================================
// Bare-bones. Just enough to:
//   • receive push events from the backend
//   • render a notification with a title, body, vibrate pattern, and icon
//   • route the user to the WO when they tap it
//
// We intentionally do NOT add offline caching here — that's a different scope
// and easy to get wrong. PWAs install fine without an SW caching strategy.
// =============================================================================

self.addEventListener("install", (event) => {
  // Activate immediately on update so users don't see stale shell for days.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "SupersDeck", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "SupersDeck";
  const options = {
    body: payload.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    // Vibrate: short-long-short. iOS PWAs ignore vibrate but Android honors it.
    vibrate: [120, 60, 200],
    tag: payload.tag || "supersdeck",
    renotify: true,
    data: { url: payload.url || "/" },
    requireInteraction: payload.priority === "emergency",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If there's already a SupersDeck window open, focus it and nav.
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
