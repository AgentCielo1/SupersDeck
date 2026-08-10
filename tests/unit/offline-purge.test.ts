import { afterEach, describe, expect, it, vi } from "vitest";

// =============================================================================
//  M4 — cached tenant documents must not survive sign-out
// =============================================================================
//  /auth/signout is a server route and can only clear the session cookie. The
//  document blobs live in IndexedDB, which only the browser can reach, so the
//  purge has to happen client-side before the hand-off. With two accounts and a
//  phone carried around a building, "lost or shared device" is the realistic
//  threat here, not a malicious insider.
// =============================================================================

const g = globalThis as unknown as { indexedDB?: unknown };

afterEach(() => {
  delete g.indexedDB;
  vi.resetModules();
});

describe("clearOffline", () => {
  it("deletes the offline database by name", async () => {
    const deleted: string[] = [];
    g.indexedDB = {
      deleteDatabase(name: string) {
        deleted.push(name);
        const req: Record<string, unknown> = {};
        // Fire success on the next tick, as the real API does.
        queueMicrotask(() => (req.onsuccess as () => void)?.());
        return req;
      },
    };

    const { clearOffline } = await import("../../src/lib/offline-files");
    await clearOffline();

    // The negative this protects: before the fix, nothing was deleted at all.
    expect(deleted).toEqual(["supersdeck-offline"]);
  });

  it("resolves — never hangs or throws — when the delete is BLOCKED by another tab", async () => {
    // A second open tab holds a connection and onsuccess never fires. Signing
    // out must not hang on it: the user asked to end the session, and the other
    // tab is unauthenticated on its next load anyway.
    g.indexedDB = {
      deleteDatabase() {
        const req: Record<string, unknown> = {};
        queueMicrotask(() => (req.onblocked as () => void)?.());
        return req;
      },
    };

    const { clearOffline } = await import("../../src/lib/offline-files");
    await expect(clearOffline()).resolves.toBeUndefined();
  });

  it("resolves when the delete ERRORS, rather than stranding the sign-out", async () => {
    g.indexedDB = {
      deleteDatabase() {
        const req: Record<string, unknown> = {};
        queueMicrotask(() => (req.onerror as () => void)?.());
        return req;
      },
    };

    const { clearOffline } = await import("../../src/lib/offline-files");
    await expect(clearOffline()).resolves.toBeUndefined();
  });

  it("is a no-op where IndexedDB does not exist (private mode, webview)", async () => {
    delete g.indexedDB;
    const { clearOffline } = await import("../../src/lib/offline-files");
    await expect(clearOffline()).resolves.toBeUndefined();
  });
});
