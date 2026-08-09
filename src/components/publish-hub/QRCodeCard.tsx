import { useEffect, useState } from "react";
import { QrCode, Download, Copy, Maximize2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
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

  const colors: QrColorOpts =
    style === "dark"
      ? { dark: "#ffffff", light: "#0a0a0a" }
      : style === "accent"
        ? { dark: accentColor, light: "#ffffff" }
        : { dark: "#000000", light: "#ffffff" };

  useEffect(() => {
    let cancelled = false;
    generateQrPngDataUrl(shortUrl, { ...colors, width: 512 }).then((url) => {
      if (!cancelled) setPngUrl(url);
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
    <SectionCard
      icon={QrCode}
      title="QR Code"
      description="A scannable shortcut to your page — great for print, stickers, and stories."
      defaultOpen={false}
    >
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card/60 p-6">
        {pngUrl && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-border"
            aria-label="Preview QR code"
          >
            <img src={pngUrl} alt="QR code" className="h-40 w-40" />
            <span className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
              <Maximize2 className="h-5 w-5 text-white" />
            </span>
          </button>
        )}
      </div>

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

      <div className="grid grid-cols-3 gap-2.5">
        <Button type="button" variant="outline" onClick={downloadPng}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> PNG
        </Button>
        <Button type="button" variant="outline" onClick={downloadSvg}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> SVG
        </Button>
        <Button type="button" variant="outline" onClick={copyQr}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex flex-col items-center gap-4">
          <DialogTitle>QR Code</DialogTitle>
          {pngUrl && <img src={pngUrl} alt="QR code" className="h-64 w-64" />}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
