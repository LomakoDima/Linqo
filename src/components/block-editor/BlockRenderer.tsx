import { BlockFieldsEditor } from "@/components/BlockEditor";
import { BLOCK_REGISTRY } from "@/lib/block-registry/registry";
import type { LinkBlock } from "@/lib/link-store";
import { BlockSummaryRow } from "./BlockSummaryRow";
import { BlockToolbar } from "./BlockToolbar";

// The shell every block sits in: the card chrome, the hover toolbar, and
// the collapsed/expanded swap between BlockSummaryRow and BlockFieldsEditor.
// This is the layer that owns "what happens when you interact with a
// block's chrome" — the fields themselves are still BlockEditor.tsx's
// concern, untouched by this split.
export function BlockRenderer({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
  canUp,
  canDown,
  collapsed,
  onToggleCollapse,
  dragHandleProps,
}: {
  block: LinkBlock;
  onChange: (b: LinkBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  canUp: boolean;
  canDown: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  const entry = BLOCK_REGISTRY[block.type];

  return (
    <div className="group min-w-0 rounded-lg border border-border bg-card p-5 transition-colors duration-150 hover:border-foreground/50 focus-within:border-foreground/50">
      <BlockToolbar
        label={entry?.label ?? block.type}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMoveUp={() => onMove(-1)}
        onMoveDown={() => onMove(1)}
        canMoveUp={canUp}
        canMoveDown={canDown}
        dragHandleProps={dragHandleProps}
      />
      {collapsed ? (
        <BlockSummaryRow block={block} entry={entry} />
      ) : (
        <BlockFieldsEditor block={block} onChange={onChange} />
      )}
    </div>
  );
}
