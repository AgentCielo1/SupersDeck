// =============================================================================
//  GateLog — offline sign-in queue (client)
// =============================================================================
//  Basement signal gaps: if a public sign-in POST fails because the device is
//  offline, we stash the payload in localStorage and replay it when the
//  browser fires `online` (or on next load). Small queue, base64 photo
//  included — fine for a handful of entries; migrate to IndexedDB if volume
//  grows. No server imports — safe in a client component.
// =============================================================================

const KEY = "gatelog.queue.v1";

export interface QueuedSignIn {
  buildingCode: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

function read(): QueuedSignIn[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as QueuedSignIn[];
  } catch {
    return [];
  }
}

function write(q: QueuedSignIn[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // quota / privacy mode — drop silently
  }
}

export function enqueueSignIn(buildingCode: string, payload: Record<string, unknown>): void {
  const q = read();
  q.push({ buildingCode, payload, queuedAt: new Date().toISOString() });
  write(q);
}

export function queueLength(): number {
  return read().length;
}

/** Replay queued sign-ins. Drops entries that succeed OR are gate-blocked
 *  (403) so we don't retry a permanently-blocked contractor forever. Keeps
 *  network failures for the next attempt. Returns how many were cleared. */
export async function flushQueue(): Promise<number> {
  const q = read();
  if (q.length === 0) return 0;

  const remaining: QueuedSignIn[] = [];
  let cleared = 0;

  for (const item of q) {
    try {
      const res = await fetch(`/api/public/sign-in/${item.buildingCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok || res.status === 403) cleared++;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  write(remaining);
  return cleared;
}
