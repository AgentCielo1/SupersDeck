"use client";

import { useEffect, useState } from "react";

// =============================================================================
//  InstallPrompt — captures Chrome/Edge/Samsung Internet's beforeinstallprompt
//  event and surfaces a thumb-friendly "Install" banner. Hidden on iOS Safari
//  (which doesn't fire the event); for iOS users we render a "Add to Home
//  Screen" tip instead.
// =============================================================================

type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "supersdeck.install.dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    const ua = window.navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
    );

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as DeferredPrompt);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (isStandalone || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDismissed(true);
    setDeferred(null);
  }

  // Android / Chrome / Edge path — real install prompt
  if (deferred) {
    return (
      <div className="fixed inset-x-3 bottom-20 z-40 rounded-xl2 border border-brand-400/40 bg-white p-3 shadow-md md:bottom-3 md:left-auto md:right-3 md:max-w-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-semibold text-white">
            S
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Install BoroDesk</div>
            <div className="mt-0.5 text-xs text-ink-600">
              Adds to your home screen, opens like a normal app.
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={install}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
              >
                Install
              </button>
              <button
                onClick={dismiss}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari path — no beforeinstallprompt event exists. Show the manual
  // "tap the share button" tip once.
  if (isIos) {
    return (
      <div className="fixed inset-x-3 bottom-20 z-40 rounded-xl2 border border-brand-400/40 bg-white p-3 shadow-md">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-semibold text-white">
            S
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Install on iPhone</div>
            <div className="mt-0.5 text-xs text-ink-600">
              Tap the share button (⏏︎) in Safari → "Add to Home Screen". Opens
              full-screen, no browser chrome.
            </div>
            <div className="mt-2">
              <button
                onClick={dismiss}
                className="text-xs text-brand-600 hover:underline"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
