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
