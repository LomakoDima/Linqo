// SearchController — deliberately a pure function, not a class. cmdk's
// `Command` (src/components/ui/command.tsx, already wrapping the installed
// `cmdk` package) already owns keyboard navigation/highlighting internally;
// writing a stateful controller on top would duplicate that. This module is
// just the one matching rule, shared so the Block Library and the global
// Command Palette can never drift apart on what counts as a match.

import type { BlockLibraryEntry } from "./types";

function entryText(entry: BlockLibraryEntry): string {
  return `${entry.label} ${entry.description}`.toLowerCase();
}

// Plain array filter — used wherever the caller wants the filtered list
// itself (e.g. to decide whether a category has zero visible entries and
// should collapse).
export function filterBlockLibrary(
  entries: BlockLibraryEntry[],
  query: string,
): BlockLibraryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) => entryText(entry).includes(q));
}

// The same rule, shaped as cmdk's `Command.filter` scorer (value, search) =>
// number — wire this into `<Command filter={cmdkBlockFilter}>` and give
// every `<CommandItem value={...}>` the matching `entryText`-shaped value
// so cmdk's own internal filtering/highlighting uses this identical rule
// instead of its (word-order-sensitive) default.
export function cmdkBlockFilter(value: string, search: string): number {
  return value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0;
}

export function blockEntrySearchValue(entry: BlockLibraryEntry): string {
  return entryText(entry);
}
