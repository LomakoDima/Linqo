import { useState } from "react";
import { ExternalLink, Copy, Share2, QrCode as QrCodeIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/notifications";
import { copyToClipboard } from "@/lib/clipboard";
import { generateQrPngDataUrl } from "@/lib/qr";
import type { Profile } from "@/lib/link-store";

// The celebration screen after a successful publish. QR Code reveals
// inline (generated on demand) rather than opening a second nested dialog
// — keeps the moment self-contained instead of stacking modals.
export function SuccessDialog({
  open,
  onOpenChange,
  profile,
  shortUrl,
  sharePath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  shortUrl: string;
  sharePath: string;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const copyLink = async () => {
    if (await copyToClipboard(shortUrl)) toast.success("Link copied");
    else toast.error("Couldn't copy — select and copy the link manually");
  };

  const share = async () => {
    const title = profile.seoTitle || profile.name || profile.slug;
    const text = profile.seoDescription || profile.bio || `Check out @${profile.slug} on Linqo.`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text, url: shortUrl });
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
    } else {
      await copyLink();
    }
  };

  const toggleQr = async () => {
    if (!showQr && !qrUrl) {
      const url = await generateQrPngDataUrl(shortUrl, {
        dark: "#000000",
        light: "#ffffff",
        width: 384,
      });
      setQrUrl(url);
    }
    setShowQr((s) => !s);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">Your page is live</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="text-4xl">🎉</div>
          <h2 className="text-xl font-bold">Your page is live!</h2>
          <p className="w-full truncate rounded-lg border border-border bg-muted/40 px-4 py-2 font-mono text-sm">
            {shortUrl}
          </p>

          <div className="grid w-full grid-cols-2 gap-2.5">
            <a href={sharePath} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Page
              </Button>
            </a>
            <Button type="button" variant="outline" className="w-full" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={share}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={toggleQr}>
              <QrCodeIcon className="mr-2 h-4 w-4" />
              QR Code
            </Button>
          </div>

          {showQr && qrUrl && (
            <img src={qrUrl} alt="QR code" className="h-40 w-40 rounded-lg border border-border" />
          )}

          <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
            Back to Editor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
