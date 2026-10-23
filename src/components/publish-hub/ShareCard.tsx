import {
  Share2,
  Copy,
  Twitter,
  Linkedin,
  MessageCircle,
  MessageSquare,
  Send,
  Phone,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/components/notifications";
import { copyToClipboard } from "@/lib/clipboard";
import { shareLinks } from "@/lib/share-links";
import type { Profile } from "@/lib/link-store";

function ShareButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 cursor-pointer items-center gap-3 rounded-ui border border-border px-4 py-3 text-left transition-colors duration-150 hover:border-foreground/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="shrink-0 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="whitespace-nowrap text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}

// Every button here opens a real platform share-intent page (or, for
// Discord/Copy, does the clipboard thing that's actually useful there) —
// no dead links. Native Share only appears when the browser actually
// supports it, as one more option alongside the individual platforms, not a
// replacement for them.
export function ShareCard({ profile, shortUrl }: { profile: Profile; shortUrl: string }) {
  const title = profile.seoTitle || profile.name || profile.slug;
  const text = profile.seoDescription || profile.bio || `Check out @${profile.slug} on Linqo.`;
  const links = shareLinks({ url: shortUrl, title, text });

  const openShare = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  const copyLink = async () => {
    if (await copyToClipboard(shortUrl)) toast.success("Link copied");
    else toast.error("Couldn't copy — select and copy the link manually");
  };

  const shareToDiscord = async () => {
    if (await copyToClipboard(`${title} — ${shortUrl}`)) {
      toast.success("Copied — paste it in Discord");
    } else {
      toast.error("Couldn't copy — select and copy the link manually");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text, url: shortUrl });
    } catch {
      // User cancelled the share sheet — not an error worth surfacing.
    }
  };

  return (
    <section aria-label="Share your page">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {typeof navigator !== "undefined" && "share" in navigator && (
          <ShareButton icon={Share2} label="Share" onClick={nativeShare} />
        )}
        <ShareButton icon={Copy} label="Copy Link" onClick={copyLink} />
        <ShareButton icon={Twitter} label="Twitter" onClick={() => openShare(links.twitter)} />
        <ShareButton icon={Linkedin} label="LinkedIn" onClick={() => openShare(links.linkedin)} />
        <ShareButton icon={MessageCircle} label="Discord" onClick={shareToDiscord} />
        <ShareButton icon={MessageSquare} label="Reddit" onClick={() => openShare(links.reddit)} />
        <ShareButton icon={Send} label="Telegram" onClick={() => openShare(links.telegram)} />
        <ShareButton icon={Phone} label="WhatsApp" onClick={() => openShare(links.whatsapp)} />
        <ShareButton icon={Mail} label="Email" onClick={() => openShare(links.email)} />
      </div>
    </section>
  );
}
