import { validateBrowserFile } from "./file-safety";
import { CONTENT_LIMITS } from "./content-safety";

// Bound both the source file and the compressed image embedded in a draft.
export async function fileToResizedDataUrl(
  file: File,
  maxSize = 320,
  quality = 0.85,
  maxBytes = 60_000,
): Promise<string> {
  await validateBrowserFile(file, "image");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        try {
          if (
            !img.width ||
            !img.height ||
            img.width > CONTENT_LIMITS.imageDimension ||
            img.height > CONTENT_LIMITS.imageDimension ||
            img.width * img.height > CONTENT_LIMITS.imagePixels
          )
            throw new Error("Image is too large. Use at most 8192 px per side and 16 megapixels.");
          let size = maxSize;
          let q = quality;
          let dataUrl = renderToDataUrl(img, size, q);
          while (dataUrl.length > maxBytes && (q > 0.35 || size > 96)) {
            if (q > 0.35) {
              q = Math.max(0.35, q - 0.12);
            } else {
              size = Math.round(size * 0.8);
            }
            dataUrl = renderToDataUrl(img, size, q);
          }
          if (dataUrl.length > maxBytes)
            throw new Error("Could not fit this image. Choose a smaller image.");
          resolve(dataUrl);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Could not resize image"));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function renderToDataUrl(img: HTMLImageElement, maxSize: number, quality: number): string {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
