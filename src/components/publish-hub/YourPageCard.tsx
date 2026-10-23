import { Copy, ExternalLink, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString();
}

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
    <section aria-label="Publication" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">Publish</h2>
        <Button onClick={onPublish} disabled={publishing}>
          {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
          {publishing ? "Publishing…" : isPublished ? "Republish" : "Publish"}
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm" title={shortUrl}>
            {shortUrl}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onCopyLink}
            aria-label="Copy page link"
            title="Copy link"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={sharePath} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Preview
            </a>
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {isPublished ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          <span className="font-medium text-foreground">{isPublished ? "Published" : "Draft"}</span>
          {lastPublishedAt ? (
            <time dateTime={lastPublishedAt}>· Updated {formatRelativeTime(lastPublishedAt)}</time>
          ) : (
            <span>· Publish to activate your link</span>
          )}
        </div>
      </div>
    </section>
  );
}
