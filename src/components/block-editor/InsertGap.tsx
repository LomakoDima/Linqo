import { Plus } from "lucide-react";

// The invisible seam between two blocks (and before the first / after the
// last). Hovering reveals a "── + ──" affordance; clicking opens the Block
// Library pre-targeted at this exact position — insertion isn't limited to
// the end of the page. While a drag is in progress, `dropActive` swaps this
// into a plain highlighted drop-line instead (the click affordance would be
// meaningless mid-drag — the gesture is drop, not click).
export function InsertGap({
  onInsert,
  dropActive,
}: {
  onInsert: () => void;
  dropActive?: boolean;
}) {
  if (dropActive) {
    return (
      <div className="relative -my-1.5 h-3 w-full">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-primary" />
      </div>
    );
  }

  return (
    <div className="group/gap relative -my-1.5 h-3 w-full">
      <div className="absolute -inset-x-1 -top-2.5 -bottom-2.5 flex items-center opacity-0 transition-opacity duration-150 group-hover/gap:opacity-100 has-[:focus-visible]:opacity-100">
        <button
          type="button"
          onClick={onInsert}
          aria-label="Insert block here"
          className="flex w-full cursor-pointer items-center gap-2"
        >
          <span className="h-px flex-1 bg-primary/40 transition-colors group-hover/gap:bg-primary" />
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-150 group-hover/gap:scale-110">
            <Plus className="h-3 w-3" />
          </span>
          <span className="h-px flex-1 bg-primary/40 transition-colors group-hover/gap:bg-primary" />
        </button>
      </div>
    </div>
  );
}
