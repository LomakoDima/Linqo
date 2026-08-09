import QRCode from "qrcode";

export interface QrColorOpts {
  dark: string;
  light: string;
  width?: number;
}

export function generateQrPngDataUrl(text: string, opts: QrColorOpts): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts.width ?? 512,
    margin: 2,
    color: { dark: opts.dark, light: opts.light },
  });
}

export function generateQrSvg(text: string, opts: Omit<QrColorOpts, "width">): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 2,
    color: { dark: opts.dark, light: opts.light },
  });
}
