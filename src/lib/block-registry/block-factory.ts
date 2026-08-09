// BlockFactory — the only place a new LinkBlock value gets minted, whether
// from the library (createBlockFromEntry) or from the toolbar's duplicate
// action (duplicateBlock). Keeping both here (rather than inline in
// build.tsx) means every future block-creation path — Command Palette,
// templates, anything else — mints blocks the same way.

import { uid, type LinkBlock } from "@/lib/link-store";
import type { FlowBlockEntry } from "./types";

export function createBlockFromEntry(entry: FlowBlockEntry): LinkBlock {
  return entry.create();
}

// Fresh id for the block itself, and for every nested item that carries its
// own id (gallery images, timeline items, FAQ entries) — those ids are used
// as React keys and as accordion values, so leaving them equal to the
// original's would produce duplicate-key collisions the moment both blocks
// are on the page together.
export function duplicateBlock(block: LinkBlock): LinkBlock {
  return {
    ...block,
    id: uid(),
    galleryImages: block.galleryImages?.map((item) => ({ ...item, id: uid() })),
    timelineItems: block.timelineItems?.map((item) => ({ ...item, id: uid() })),
    faqItems: block.faqItems?.map((item) => ({ ...item, id: uid() })),
  };
}
