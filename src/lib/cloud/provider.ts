// =============================================================================
//  Cloud-storage provider abstraction
// =============================================================================
//  ONE interface for "an org-connected cloud drive" (browse, preview, stream,
//  upload). Dropbox is the only real implementation today; Google Drive /
//  OneDrive can slot in later by implementing CloudProvider — the UI and API
//  routes only ever talk to this interface, never to a vendor SDK directly.
//
//  Design rules:
//   • Server-side only — implementations hold OAuth tokens; nothing here is
//     safe to import into client components.
//   • The connection is org-level and OPTIONAL (default off). Staff share the
//     one connected account; the browser talks to /api/cloud/*, which enforces
//     app auth and proxies to the provider.
// =============================================================================

export type CloudEntryKind = "folder" | "file";

export interface CloudEntry {
  kind: CloudEntryKind;
  /** Provider path (opaque to the UI — pass back verbatim). */
  path: string;
  name: string;
  size?: number;
  modified?: string; // ISO
  /** True if the provider can produce an image thumbnail for this file. */
  hasThumbnail?: boolean;
  /** True if the provider can convert this file to a PDF preview (Office docs). */
  hasPdfPreview?: boolean;
}

export interface CloudAccountInfo {
  email?: string;
  name?: string;
}

export interface CloudProvider {
  /** List a folder. path "" = root. Must return folders first, then files, sorted. */
  list(path: string): Promise<CloudEntry[]>;
  /** Small image thumbnail (jpeg/png bytes) for image-like files. */
  thumbnail(path: string, size?: "small" | "medium" | "large"): Promise<{ bytes: ArrayBuffer; contentType: string }>;
  /** Short-lived direct URL for streaming/viewing the raw file (img/video/pdf…). */
  streamUrl(path: string): Promise<string>;
  /** PDF rendition of an Office document (docx/xlsx/pptx/rtf…), as bytes. */
  pdfPreview(path: string): Promise<ArrayBuffer>;
  /** Upload bytes to a path (autorename on conflict). Returns the final path. */
  upload(path: string, bytes: ArrayBuffer | Buffer, contentType?: string): Promise<string>;
  /** Create a folder (no-op if it exists). */
  ensureFolder(path: string): Promise<void>;
  /** Who is connected (for the settings UI). */
  accountInfo(): Promise<CloudAccountInfo>;
}

// File-type helpers shared by UI + routes ------------------------------------

const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|flac)$/i;
const PDF_EXT = /\.pdf$/i;
// Formats Dropbox can convert to a PDF preview server-side.
const OFFICE_EXT = /\.(docx?|docm|pptx?|ppsx?|ppsm|pptm|xlsx?|xlsm|rtf|csv|txt|md|log|pages|numbers|key)$/i;

export type ViewerKind = "image" | "video" | "audio" | "pdf" | "office" | "other";

export function viewerKindFor(name: string): ViewerKind {
  if (IMG_EXT.test(name)) return "image";
  if (VIDEO_EXT.test(name)) return "video";
  if (AUDIO_EXT.test(name)) return "audio";
  if (PDF_EXT.test(name)) return "pdf";
  if (OFFICE_EXT.test(name)) return "office";
  return "other";
}

export function providerCanThumbnail(name: string): boolean {
  return /\.(jpe?g|png|tiff?|gif|webp|ppm|bmp)$/i.test(name);
}
