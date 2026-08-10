"use client";

// =============================================================================
//  offline-files — cache document blobs in IndexedDB for offline access
// =============================================================================
//  "Make available offline" stores a file's bytes locally so it can be
//  previewed/downloaded with no connection. Keyed by document id.
// =============================================================================

const DB_NAME = "supersdeck-offline";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putOffline(id: string, name: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ name, blob }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getOffline(id: string): Promise<{ name: string; blob: Blob } | null> {
  const db = await openDb();
  const v = await new Promise<{ name: string; blob: Blob } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return v ?? null;
}

export async function removeOffline(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Delete every cached document. Called on sign-out (components/SignOutLink).
 *
 * Signing out used to clear the Supabase session and nothing else, so the
 * document blobs cached here — leases, notices, tenant correspondence — stayed
 * on the device, readable by whoever signed in next or whoever found the phone.
 * Dropping the whole database rather than iterating keys means a store added
 * later is covered without anyone remembering to add it here.
 *
 * Never throws: a failure to purge must not strand the user in a
 * half-signed-out state. It resolves once the delete completes, is blocked, or
 * the browser has no IndexedDB at all.
 */
export async function clearOffline(): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") return;
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      // Another open tab holds a connection. We can't force it shut, so don't
      // hang the sign-out on it — the next load of that tab is unauthenticated
      // anyway, and this resolves on its own when the tab closes.
      req.onblocked = () => resolve();
    });
  } catch {
    // No IndexedDB (private mode, embedded webview). Nothing cached, nothing
    // to purge.
  }
}

export async function listOffline(): Promise<string[]> {
  try {
    const db = await openDb();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).getAllKeys();
      r.onsuccess = () => resolve((r.result as string[]) ?? []);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return keys;
  } catch {
    return [];
  }
}
