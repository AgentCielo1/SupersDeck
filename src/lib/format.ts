// Tiny string + date helpers used across the UI.

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(iso);
}

export function ticketNumber(n: number): string {
  return `WO-${1000 + n}`;
}

// Canonical, tenant-facing origin for links shown to tenants — poster QR codes
// and tracking links. Prefer the configured production URL so a poster printed
// from localhost or a Vercel preview deployment still points to production;
// fall back to the current origin only when NEXT_PUBLIC_BASE_URL is unset.
// Mirrors the server-side base-URL resolution in /api/work-orders.
export function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  );
}
