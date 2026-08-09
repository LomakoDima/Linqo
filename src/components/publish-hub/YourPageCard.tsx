import { motion } from "motion/react";
import { Copy, ExternalLink, Rocket, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { blockSpring } from "@/lib/block-motion/variants";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

// The hero of the Launch Center — always expanded, never collapsible, the
// one thing every other card supports. Status/URL/actions live here so
// "am I live, and where" is answerable at a glance without opening anything.
export function YourPageCard({
  shortUrl,
  sharePath,
  lastPublishedAt,
  publishing,
  onPublish,
  onCopyLink,
}: {
  shortUrl: string;
  sharePath: string;
  lastPublishedAt: string | null;
  publishing: boolean;
  onPublish: () => void;
  onCopyLink: () => void;
}) {
  const isPublished = lastPublishedAt !== null;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={blockSpring}
      className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-card/60 p-6 shadow-md sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={isPublished ? "default" : "outline"}
          className={isPublished ? "gap-1 bg-emerald-600 text-white hover:bg-emerald-600" : "gap-1"}
        >
          {isPublished && <CheckCircle2 className="h-3 w-3" />}
          {isPublished ? "Published" : "Draft"}
        </Badge>
        {isPublished && lastPublishedAt && (
          <span className="text-xs text-muted-foreground">
            Last updated {formatRelativeTime(lastPublishedAt)}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Your Page</h2>

      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground sm:text-base">
          {shortUrl}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={onCopyLink}
          aria-label="Copy link"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button onClick={onPublish} disabled={publishing} size="lg" className="rounded-full">
          <Rocket className="mr-2 h-4 w-4" />
          {publishing ? "Publishing…" : isPublished ? "Republish" : "Publish"}
        </Button>
        <a href={sharePath} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline" size="lg" className="rounded-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Page
          </Button>
        </a>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="rounded-full"
          onClick={onCopyLink}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Link
        </Button>
      </div>
    </motion.div>
  );
}
