// =============================================================================
//  BoroDesk — offline sign-in queue (IndexedDB)
// =============================================================================
//  Basement signal gaps: if a public sign-in POST fails offline, stash it in
//  IndexedDB and replay when the browser comes back online. IndexedDB (not
//  localStorage) so base64 photos fit comfortably. Falls back to localStorage
//  only if IndexedDB is unavailable (private mode / very old browser). No
//  server imports — safe in a client component.
// =============================================================================

const DB_NAME = "borodesk-offline";
const STORE = "signin-queue";
const FALLBACK_KEY = "borodesk.queue.fallback";

export interface QueuedSignIn {
  id?: number;
  buildingCode: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb-unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

// --- localStorage fallback (only used if IndexedDB throws) ---
function fbRead(): QueuedSignIn[] {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]") as QueuedSignIn[];
  } catch {
    return [];
  }
}
function fbWrite(q: QueuedSignIn[]): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(q));
  } catch {
    /* give up */
  }
}

export async function enqueueSignIn(
  buildingCode: string,
  payload: Record<string, unknown>
): Promise<void> {
  const item: QueuedSignIn = {
    buildingCode,
    payload,
    queuedAt: new Date().toISOString(),
  };
  try {
    await run("readwrite", (s) => s.add(item));
  } catch {
    const q = fbRead();
    q.push(item);
    fbWrite(q);
  }
}

export async function queueLength(): Promise<number> {
  try {
    return await run<number>("readonly", (s) => s.count());
  } catch {
    return fbRead().length;
  }
}

async function post(item: QueuedSignIn): Promise<boolean> {
  try {
    const res = await fetch(`/api/public/sign-in/${item.buildingCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.payload),
    });
    // Cleared on success OR a permanent gate block (don't retry forever).
    return res.ok || res.status === 403;
  } catch {
    return false; // still offline
  }
}

/** Replay queued sign-ins. Returns how many were cleared. */
export async function flushQueue(): Promise<number> {
  let cleared = 0;

  // IndexedDB entries
  let items: QueuedSignIn[] = [];
  try {
    items = await run<QueuedSignIn[]>("readonly", (s) => s.getAll());
  } catch {
    items = [];
  }
  for (const item of items) {
    if (await post(item)) {
      if (item.id != null) {
        try {
          await run("readwrite", (s) => s.delete(item.id as number));
          cleared++;
        } catch {
          /* leave it for next time */
        }
      }
    }
  }

  // localStorage fallback entries
  const fb = fbRead();
  if (fb.length) {
    const remaining: QueuedSignIn[] = [];
    for (const item of fb) {
      if (await post(item)) cleared++;
      else remaining.push(item);
    }
    fbWrite(remaining);
  }

  return cleared;
}
