// QR data-URL generator — thin wrapper over `qrcode` so the poster and the
// post-submit tracking QR use one call. `qrcode` is an optional peer dep.
import QRCode from "qrcode";

export function qrDataUrl(
  url: string,
  opts: { width?: number; margin?: number } = {}
): Promise<string> {
  return QRCode.toDataURL(url, {
    width: opts.width ?? 720,
    margin: opts.margin ?? 1,
    errorCorrectionLevel: "M",
  });
}
