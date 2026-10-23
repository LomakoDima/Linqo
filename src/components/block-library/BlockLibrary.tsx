import { motion } from "motion/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { BLOCK_LIBRARY_ENTRIES } from "@/lib/block-registry/registry";
import { blockEntrySearchValue, cmdkBlockFilter } from "@/lib/block-registry/search";
import {
  BLOCK_CATEGORIES,
  type BlockCategory,
  type BlockLibraryEntry,
} from "@/lib/block-registry/types";
import type { LinkBlockType, Profile } from "@/lib/link-store";
import { libraryCardHover, libraryCardTap } from "@/lib/block-motion/variants";

// Every "add a block" entry point in the builder — the bottom "+ Add
// Block" button, every InsertGap, the empty state, and the `/` shortcut —
// funnels through this one component (see build.tsx's `openLibrary`). One
// Dialog, one motion/presentation, regardless of where it was opened from.
const CATEGORY_ORDER: BlockCategory[] = [
  "basic",
  "media",
  "social",
  "interactive",
  "advanced",
  "coming-soon",
];

function entryKey(entry: BlockLibraryEntry): string {
  return entry.kind === "flow" ? `flow:${entry.type}` : `${entry.kind}:${entry.id}`;
}

export function BlockLibrary({
  open,
  onOpenChange,
  onSelectBlock,
  profile,
  setActiveTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlock: (type: LinkBlockType) => void;
  profile: Profile;
  setActiveTab: (tab: string) => void;
}) {
  const handleSelect = (entry: BlockLibraryEntry) => {
    if (entry.kind === "coming-soon") return;
    if (entry.kind === "singleton") {
      entry.activate({ setActiveTab });
      onOpenChange(false);
      return;
    }
    onSelectBlock(entry.type);
    onOpenChange(false);
  };

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    entries: BLOCK_LIBRARY_ENTRIES.filter((e) => e.category === category),
  })).filter((g) => g.entries.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Add a block</DialogTitle>
        <Command filter={cmdkBlockFilter} className="bg-transparent">
          <CommandInput placeholder="Search blocks…" />
          <CommandList className="max-h-[65vh] p-2">
            <CommandEmpty className="py-10 text-sm text-muted-foreground">
              No blocks match your search.
            </CommandEmpty>
            {byCategory.map(({ category, entries }) => (
              <CommandGroup key={category} heading={BLOCK_CATEGORIES[category].label}>
                <div className="grid grid-cols-2 gap-2 p-1">
                  {entries.map((entry) => {
                    const Icon = entry.icon;
                    const configured =
                      entry.kind === "singleton" ? entry.isConfigured(profile) : false;
                    const comingSoon = entry.kind === "coming-soon";
                    return (
                      <CommandItem
                        key={entryKey(entry)}
                        value={blockEntrySearchValue(entry)}
                        disabled={comingSoon}
                        onSelect={() => handleSelect(entry)}
                        className={`items-stretch rounded-lg border border-border/70 bg-card p-0 aria-selected:border-primary aria-selected:bg-primary/5 aria-selected:shadow-sm ${
                          comingSoon ? "cursor-default opacity-50" : "cursor-pointer"
                        }`}
                      >
                        <motion.div
                          className="flex w-full flex-col gap-1.5 p-3"
                          whileHover={comingSoon ? undefined : libraryCardHover}
                          whileTap={comingSoon ? undefined : libraryCardTap}
                        >
                          <div className="flex w-full items-center gap-2">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/70 text-accent-foreground">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="truncate text-sm font-medium">{entry.label}</span>
                            {configured && (
                              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                                In use
                              </Badge>
                            )}
                            {comingSoon && (
                              <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 text-left text-xs text-muted-foreground">
                            {entry.description}
                          </p>
                        </motion.div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
