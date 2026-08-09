import type { LinkBlock } from "@/lib/link-store";
import type { FlowBlockEntry } from "@/lib/block-registry/types";

// The one-line view a collapsed block shows instead of its full field form
// — an icon, and either the registry's per-instance summary (e.g. a
// heading's own text) or just the block's label when there's nothing more
// specific to show yet (a freshly-added empty block).
export function BlockSummaryRow({
  block,
  entry,
}: {
  block: LinkBlock;
  entry: FlowBlockEntry | undefined;
}) {
  const Icon = entry?.icon;
  const summary = entry?.summary?.(block);
  return (
    <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground">
      {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
      <span className="truncate">{summary || entry?.label || block.type}</span>
    </div>
  );
}
