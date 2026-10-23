import { useEffect, useState } from "react";
import { Download, Copy, Maximize2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SegmentedToggle, ColorField } from "@/components/BlockEditor";
import { toast } from "@/components/notifications";
import { generateQrPngDataUrl, generateQrSvg, type QrColorOpts } from "@/lib/qr";

type QrStyle = "light" | "dark" | "accent";

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

// One shared canvas-free generator (the `qrcode` package) behind three
// style presets — the QR itself is always the same data (shortUrl), only
// the rendered colors change, so a single live preview covers every path
// (download, copy, the lightbox) without re-deriving anything.
export function QRCodeCard({ slug, shortUrl }: { slug: string; shortUrl: string }) {
  const [style, setStyle] = useState<QrStyle>("light");
  const [accentColor, setAccentColor] = useState("#f97316");
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generationError, setGenerationError] = useState(false);

  const colors: QrColorOpts =
    style === "dark"
      ? { dark: "#ffffff", light: "#0a0a0a" }
      : style === "accent"
        ? { dark: accentColor, light: "#ffffff" }
        : { dark: "#000000", light: "#ffffff" };

  useEffect(() => {
    let cancelled = false;
    setPngUrl(null);
    setGenerationError(false);
    generateQrPngDataUrl(shortUrl, { ...colors, width: 512 })
      .then((url) => {
        if (!cancelled) setPngUrl(url);
      })
      .catch(() => {
        if (!cancelled) setGenerationError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortUrl, colors.dark, colors.light]);

  const downloadPng = () => {
    if (pngUrl) triggerDownload(pngUrl, `${slug}-qr.png`);
  };

  const downloadSvg = async () => {
    const svg = await generateQrSvg(shortUrl, colors);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${slug}-qr.svg`);
    URL.revokeObjectURL(url);
  };

  const copyQr = async () => {
    if (!pngUrl) return;
    try {
      const blob = await (await fetch(pngUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success("QR code copied");
    } catch {
      toast.error("Couldn't copy — try downloading instead");
    }
  };

  return (
    <section
      aria-label="QR code"
      className="grid items-start gap-6 sm:grid-cols-[180px_minmax(0,1fr)]"
    >
      <div className="flex justify-center rounded-lg border border-border bg-card p-3">
        {pngUrl ? (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="group relative cursor-pointer overflow-hidden rounded-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Preview QR code"
          >
            <img src={pngUrl} alt="QR code" className="h-40 w-40" />
            <span className="absolute bottom-1 right-1 rounded-ui border border-border bg-card p-1.5 text-foreground">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </button>
        ) : (
          <div
            className="grid h-40 w-40 place-items-center text-xs text-muted-foreground"
            role="status"
          >
            {generationError ? (
              "Check your QR color"
            ) : (
              <Loader2 aria-label="Generating QR code" className="h-5 w-5 animate-spin" />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-5">
        <div>
          <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Style
          </Label>
          <SegmentedToggle<QrStyle>
            value={style}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "accent", label: "Brand" },
            ]}
            onChange={setStyle}
          />
        </div>

        {style === "accent" && (
          <div>
            <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Brand color
            </Label>
            <ColorField
              value={accentColor}
              onChange={(v) => setAccentColor(v ?? "#f97316")}
              fallback="#f97316"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!pngUrl}
            onClick={downloadPng}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!pngUrl}
            onClick={downloadSvg}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> SVG
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!pngUrl} onClick={copyQr}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex flex-col items-center gap-4">
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription className="sr-only">
            Scan this code to open your page.
          </DialogDescription>
          {pngUrl && <img src={pngUrl} alt="QR code" className="h-64 w-64" />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
