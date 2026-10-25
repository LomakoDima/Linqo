import { CONTENT_LIMITS, hasUnsafeControls } from "./content-safety";
import { localTextViolation } from "./content-policy";
import { containsCodeContent } from "./code-content";

export type UploadKind = "image" | "audio";
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
export const AUDIO_ACCEPT = "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac";
const TYPES: Record<UploadKind, Record<string, string[]>> = {
  image: {
    "image/png": ["png"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/webp": ["webp"],
    "image/gif": ["gif"],
  },
  audio: {
    "audio/mpeg": ["mp3"],
    "audio/wav": ["wav"],
    "audio/ogg": ["ogg", "oga"],
    "audio/mp4": ["m4a", "mp4"],
    "audio/aac": ["aac"],
  },
};
const ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-wav": "audio/wav",
  "audio/x-m4a": "audio/mp4",
};
export function canonicalMime(mime: string): string {
  return ALIASES[mime.toLowerCase()] ?? mime.toLowerCase();
}

export function sniffMediaType(bytes: Uint8Array): string | null {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes.length < 12) return null;
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "audio/wav";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (ascii(4, 4) === "ftyp") return "audio/mp4";
  if (bytes[0] === 255 && (bytes[1] & 0xf6) === 0xf0) return "audio/aac";
  if (ascii(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0))
    return "audio/mpeg";
  return null;
}

export function assertUploadFile(
  file: { name: string; type: string; size: number },
  kind: UploadKind,
  header?: Uint8Array,
): string {
  const max = kind === "image" ? CONTENT_LIMITS.imageBytes : CONTENT_LIMITS.audioBytes;
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > max)
    throw new Error(`Choose a non-empty ${kind} smaller than ${max / 1024 / 1024} MB`);
  if (
    !file.name ||
    file.name.length > 200 ||
    hasUnsafeControls(file.name) ||
    /[/\\<>]/.test(file.name) ||
    /%(?:00|0a|0d)/i.test(file.name)
  )
    throw new Error("Unsupported filename");
  if (localTextViolation(file.name))
    throw new Error("This filename is blocked by the local content policy");
  if (containsCodeContent(file.name))
    throw new Error("Code and markup are not allowed in filenames");
  if (
    /(?:^|\.)(?:exe|dll|com|bat|cmd|ps1|psm1|sh|msi|vbs|vbe|jse|wsf|wsh|hta|scr|pif|reg|cpl|js|mjs|cjs|jsx|ts|tsx|css|html?|svg|xml|xhtml|php\d*|asp|aspx|jsp|cgi|py[co]?|rb|pl|lua|wasm|java|class|cs|cpp|c|h|go|rs|swift|kt|vue|svelte|sql|json5?|ya?ml|toml|ipynb|zip|rar|7z|jar)(?:\.|$)/i.test(
      file.name,
    )
  )
    throw new Error("Executable files, active documents and archives are not allowed");
  const mime = canonicalMime(file.type);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!TYPES[kind][mime]?.includes(extension))
    throw new Error(`Unsupported ${kind} format or mismatched extension`);
  if (header && sniffMediaType(header) !== mime)
    throw new Error("The file contents do not match its declared format");
  return mime;
}

export async function validateBrowserFile(file: File, kind: UploadKind): Promise<void> {
  assertUploadFile(file, kind);
  const bytes = new Uint8Array(await (kind === "image" ? file : file.slice(0, 512)).arrayBuffer());
  assertUploadFile(file, kind, bytes);
  if (kind === "image") {
    const dimensions = imageDimensions(bytes);
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1)
      throw new Error("Could not read image dimensions");
    if (
      dimensions.width > CONTENT_LIMITS.imageDimension ||
      dimensions.height > CONTENT_LIMITS.imageDimension ||
      dimensions.width * dimensions.height > CONTENT_LIMITS.imagePixels
    )
      throw new Error("Image is too large. Use at most 8192 px per side and 16 megapixels.");
  }
}

// Read bounded headers before asking the browser to decode a compressed image.
// This is an early resource guard; the server still performs a full decode.
export function imageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const mime = sniffMediaType(bytes);
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));
  if (mime === "image/png" && bytes.length >= 24)
    return { width: view.getUint32(16), height: view.getUint32(20) };
  if (mime === "image/gif")
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  if (mime === "image/webp") {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const kind = ascii(offset, 4),
        length = view.getUint32(offset + 4, true),
        data = offset + 8;
      if (data + length > bytes.length) return null;
      if (kind === "VP8X" && length >= 10)
        return {
          width: 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16),
          height: 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16),
        };
      if (kind === "VP8 " && length >= 10 && ascii(data + 3, 3) === "\x9d\x01\x2a")
        return {
          width: view.getUint16(data + 6, true) & 0x3fff,
          height: view.getUint16(data + 8, true) & 0x3fff,
        };
      if (kind === "VP8L" && length >= 5 && bytes[data] === 0x2f) {
        const bits = view.getUint32(data + 1, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      }
      offset = data + length + (length % 2);
    }
  }
  if (mime === "image/jpeg") {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      if (offset + 3 > bytes.length) return null;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        ) &&
        length >= 8
      )
        return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      offset += length;
    }
  }
  return null;
}
