import type {
  CloudProvider,
  CloudEntry,
  CloudAccountInfo,
} from "./provider";
import { providerCanThumbnail, viewerKindFor } from "./provider";
import {
  getConnection,
  updateAccessToken,
  type CloudConnectionRow,
} from "./store";

// =============================================================================
//  Dropbox implementation of CloudProvider (server-side only)
// =============================================================================
//  Uses the org's stored refresh token (cloud_connections) and mints short-
//  lived access tokens on demand. All calls are proxied through our API
//  routes — the browser never holds a Dropbox token.
//
//  Endpoints used:
//    /files/list_folder(+/continue)  — browse
//    /files/get_thumbnail_v2         — image thumbnails (jpg/png/tiff/gif/webp/bmp/ppm)
//    /files/get_temporary_link       — 4-hour direct link for streaming/viewing
//    /files/get_preview              — PDF rendition of Office docs (docx/xlsx/…)
//    /files/upload                   — upload (autorename)
//    /files/create_folder_v2         — ensure folder
//    /users/get_current_account      — account info
// =============================================================================

// App key baked in like Super Logbook does (public identifier, not a secret);
// override with DROPBOX_APP_KEY if you ever switch Dropbox apps.
export const DROPBOX_APP_KEY =
  process.env.DROPBOX_APP_KEY || "ixviqj0e6ntkaxw";

// Least-privilege OAuth scopes — exactly what the endpoints below call, and
// nothing else. Sent explicitly on /authorize (src/app/api/cloud/connect) so
// the grant is defined here, in review, rather than by whatever the Dropbox
// app console is set to.
//
//   account_info.read      users/get_current_account (settings UI)
//   files.metadata.read    files/list_folder(+/continue)
//   files.content.read     files/download, files/get_preview, files/get_thumbnail_v2
//   files.content.write    files/upload, files/create_folder_v2
//
// Notably absent: sharing.* (we never create share links) and any delete scope
// (nothing in SupersDeck removes a file from the customer's drive).
export const DROPBOX_SCOPES = [
  "account_info.read",
  "files.metadata.read",
  "files.content.read",
  "files.content.write",
] as const;

const API = "https://api.dropboxapi.com";
const CONTENT = "https://content.dropboxapi.com";

async function freshAccessToken(conn: CloudConnectionRow): Promise<string> {
  // Reuse the cached access token while it's still comfortably valid.
  if (
    conn.access_token &&
    conn.access_token_expires_at &&
    Date.parse(conn.access_token_expires_at) > Date.now()
  ) {
    return conn.access_token;
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: conn.refresh_token,
    client_id: conn.app_key,
  });
  const res = await fetch(`${API}/oauth2/token`, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Dropbox token refresh failed (${res.status})`);
  }
  const tok = (await res.json()) as { access_token: string; expires_in: number };
  await updateAccessToken(conn.id, tok.access_token, tok.expires_in);
  return tok.access_token;
}

async function rpc<T>(token: string, endpoint: string, arg: unknown): Promise<T> {
  const res = await fetch(`${API}/2${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dropbox ${endpoint} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

type DbxMeta = {
  ".tag": "file" | "folder";
  name: string;
  path_lower?: string;
  path_display?: string;
  size?: number;
  server_modified?: string;
};

export class DropboxProvider implements CloudProvider {
  private token: string;
  private constructor(token: string) {
    this.token = token;
  }

  /** Returns null if no connection is configured (feature off). */
  static async connect(): Promise<DropboxProvider | null> {
    const conn = await getConnection();
    if (!conn || conn.provider !== "dropbox") return null;
    const token = await freshAccessToken(conn);
    return new DropboxProvider(token);
  }

  async list(path: string): Promise<CloudEntry[]> {
    const entries: DbxMeta[] = [];
    let r = await rpc<{ entries: DbxMeta[]; cursor: string; has_more: boolean }>(
      this.token,
      "/files/list_folder",
      { path: path || "", limit: 500 }
    );
    entries.push(...r.entries);
    while (r.has_more) {
      r = await rpc(this.token, "/files/list_folder/continue", { cursor: r.cursor });
      entries.push(...r.entries);
    }
    const mapped: CloudEntry[] = entries.map((e) => ({
      kind: e[".tag"] === "folder" ? "folder" : "file",
      path: e.path_display || e.path_lower || `${path}/${e.name}`,
      name: e.name,
      size: e.size,
      modified: e.server_modified,
      hasThumbnail: e[".tag"] === "file" && providerCanThumbnail(e.name),
      hasPdfPreview: e[".tag"] === "file" && viewerKindFor(e.name) === "office",
    }));
    // Folders first, then files, each alphabetically (natural order for a cabinet).
    mapped.sort((a, b) =>
      a.kind !== b.kind
        ? a.kind === "folder"
          ? -1
          : 1
        : a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    return mapped;
  }

  async thumbnail(
    path: string,
    size: "small" | "medium" | "large" = "medium"
  ): Promise<{ bytes: ArrayBuffer; contentType: string }> {
    const dbxSize =
      size === "small" ? "w128h128" : size === "large" ? "w960h640" : "w480h320";
    const res = await fetch(`${CONTENT}/2/files/get_thumbnail_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Dropbox-API-Arg": JSON.stringify({
          resource: { ".tag": "path", path },
          format: { ".tag": "jpeg" },
          size: { ".tag": dbxSize },
          mode: { ".tag": "strict" },
        }),
      },
    });
    if (!res.ok) throw new Error(`thumbnail failed (${res.status})`);
    return { bytes: await res.arrayBuffer(), contentType: "image/jpeg" };
  }

  // NOTE: get_temporary_link (streamUrl) was REMOVED on 2026-08-09. It handed
  // the browser a ~4-hour bearer URL that authenticates on its own — copied out
  // of devtools or history it kept working with no SupersDeck session, past
  // sign-out, role changes and offboarding, and could not be revoked without
  // rotating the whole Dropbox grant. /api/cloud/stream proxies bytes instead.
  // Its only caller was that route; do not reintroduce it to save egress.

  /**
   * Raw file bytes as a streamable Response — every byte the app serves from
   * the drive goes through here, so the caller's session is checked on each
   * request. `range` is forwarded verbatim so the browser keeps video seeking
   * and pdf.js partial fetches (Dropbox honours Range on /files/download).
   */
  async downloadStream(path: string, range?: string): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    };
    if (range) headers.Range = range;
    const res = await fetch(`${CONTENT}/2/files/download`, {
      method: "POST",
      headers,
    });
    if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
    return res;
  }

  async pdfPreview(path: string): Promise<ArrayBuffer> {
    const res = await fetch(`${CONTENT}/2/files/get_preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Dropbox-API-Arg": JSON.stringify({ path }),
      },
    });
    if (!res.ok) throw new Error(`get_preview failed (${res.status})`);
    return await res.arrayBuffer();
  }

  async upload(
    path: string,
    bytes: ArrayBuffer | Buffer,
    _contentType?: string
  ): Promise<string> {
    const res = await fetch(`${CONTENT}/2/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path,
          mode: "add",
          autorename: true,
          mute: true,
        }),
      },
      body: bytes as BodyInit,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`upload failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const meta = (await res.json()) as DbxMeta;
    return meta.path_display || path;
  }

  async ensureFolder(path: string): Promise<void> {
    const res = await fetch(`${API}/2/files/create_folder_v2`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path, autorename: false }),
    });
    // 409 conflict/folder = already exists → fine.
    if (!res.ok && res.status !== 409) {
      throw new Error(`create_folder failed (${res.status})`);
    }
  }

  async accountInfo(): Promise<CloudAccountInfo> {
    const res = await fetch(`${API}/2/users/get_current_account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return {};
    const a = (await res.json()) as { email?: string; name?: { display_name?: string } };
    return { email: a.email, name: a.name?.display_name };
  }
}
