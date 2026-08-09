import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { BLOCK_LIBRARY_ENTRIES } from "@/lib/block-registry/registry";
import { blockEntrySearchValue, cmdkBlockFilter } from "@/lib/block-registry/search";
import type { BlockLibraryEntry } from "@/lib/block-registry/types";
import type { LinkBlockType } from "@/lib/link-store";
import { applyTheme, getCurrentTheme } from "@/lib/theme";
import { LayoutTemplate, Palette, Music2, User, Rocket, SunMoon, Sparkles } from "lucide-react";

// The global Ctrl+K surface — not just blocks. Reuses BLOCK_LIBRARY_ENTRIES
// and the same filter rule as BlockLibrary (search.ts) for its "Add a
// block" group, alongside a static list of navigation/action commands, the
// way Raycast/Linear mix "go to" and "do" commands in one palette.
export function CommandPalette({
  open,
  onOpenChange,
  onSelectBlock,
  setActiveTab,
  onOpenLibrary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlock: (type: LinkBlockType) => void;
  setActiveTab: (tab: string) => void;
  onOpenLibrary: () => void;
}) {
  const goTo = (tab: string) => {
    setActiveTab(tab);
    onOpenChange(false);
  };

  const handleSelectEntry = (entry: BlockLibraryEntry) => {
    if (entry.kind === "coming-soon") return;
    if (entry.kind === "singleton") {
      entry.activate({ setActiveTab });
      onOpenChange(false);
      return;
    }
    onSelectBlock(entry.type);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} filter={cmdkBlockFilter}>
      <CommandInput placeholder="Search commands and blocks…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Add a block">
          <CommandItem
            value="browse all blocks library search"
            onSelect={() => {
              onOpenLibrary();
              onOpenChange(false);
            }}
          >
            <Sparkles /> Browse all blocks…
          </CommandItem>
          {BLOCK_LIBRARY_ENTRIES.filter((e) => e.kind !== "coming-soon").map((entry) => {
            const Icon = entry.icon;
            return (
              <CommandItem
                key={entry.kind === "flow" ? entry.type : entry.id}
                value={`add ${blockEntrySearchValue(entry)}`}
                onSelect={() => handleSelectEntry(entry)}
              >
                <Icon /> Add {entry.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem value="open templates" onSelect={() => goTo("templates")}>
            <LayoutTemplate /> Open Templates
          </CommandItem>
          <CommandItem value="open content" onSelect={() => goTo("content")}>
            <Sparkles /> Open Content
          </CommandItem>
          <CommandItem value="open design" onSelect={() => goTo("design")}>
            <Palette /> Open Design
          </CommandItem>
          <CommandItem value="open music" onSelect={() => goTo("music")}>
            <Music2 /> Open Music
          </CommandItem>
          <CommandItem value="open profile settings" onSelect={() => goTo("profile")}>
            <User /> Open Profile
          </CommandItem>
          <CommandItem value="open publish share" onSelect={() => goTo("share")}>
            <Rocket /> Open Publish
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Appearance">
          <CommandItem
            value="switch theme light dark"
            onSelect={() => {
              applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
              onOpenChange(false);
            }}
          >
            <SunMoon /> Switch Theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
