import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ChevronUp, Copy, GripVertical, Settings2, Trash2 } from "lucide-react";

// The hover toolbar every block gets: drag handle, move up/down, duplicate,
// a collapse/expand toggle (one control, two icons — Settings2 to expand
// when collapsed, ChevronUp to collapse when already open, since those are
// the same action from opposite states rather than two separate concepts),
// and delete. Hidden until the block (or a control inside this toolbar) has
// focus/hover — BlockRenderer supplies the `group` class this reacts to.
export function BlockToolbar({
  label,
  collapsed,
  onToggleCollapse,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  dragHandleProps,
}: {
  label: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  // Spread onto the drag-handle element — populated once Phase 5 wires
  // useBlockDragDrop; a plain grab cursor until then.
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          {...dragHandleProps}
          className="cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="rounded-lg bg-accent/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          title="Move up"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          title="Move down"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDuplicate} title="Duplicate">
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand settings" : "Collapse"}
        >
          {collapsed ? <Settings2 className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
