// Every image ends up base64-embedded straight into the share link, so its
// encoded size is what the user's phone has to hold in its clipboard. Fixed
// quality/dimensions can't guarantee a bound — a big enough source photo
// blows past it regardless. Instead we resize/re-compress in a loop until
// the output actually fits `maxBytes`, so the link (and the clipboard) never
// balloons no matter what the user uploads.
export function fileToResizedDataUrl(
  file: File,
  maxSize = 320,
  quality = 0.85,
  maxBytes = 60_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        try {
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
