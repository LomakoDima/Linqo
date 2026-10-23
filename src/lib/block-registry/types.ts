// Shared vocabulary for the Block Library / Command Palette "add block"
// surface. This layer is deliberately separate from BlockEditor's per-type
// field JSX (src/components/BlockEditor.tsx) — this file only describes
// *what a block is* (name, icon, description, category, how to create one),
// never *how to edit its fields*.

import type { LucideIcon } from "lucide-react";
import type { LinkBlock, LinkBlockType, Profile } from "@/lib/link-store";

export type BlockCategory =
  "basic" | "media" | "social" | "interactive" | "advanced" | "coming-soon";

export const BLOCK_CATEGORIES: Record<BlockCategory, { label: string }> = {
  basic: { label: "Basic" },
  media: { label: "Media" },
  social: { label: "Social" },
  interactive: { label: "Interactive" },
  advanced: { label: "Advanced" },
  "coming-soon": { label: "Coming soon" },
};

// A real, insertable content block — lives in `profile.blocks[]`.
export interface FlowBlockEntry {
  kind: "flow";
  type: LinkBlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: BlockCategory;
  create: () => LinkBlock;
  // One-line summary of a specific instance's content, for the collapsed
  // BlockSummaryRow (e.g. a "text" block's first line). Undefined falls
  // back to just showing the label.
  summary?: (block: LinkBlock) => string | undefined;
}

export interface SingletonActivateContext {
  setActiveTab: (tab: string) => void;
}

// Music/Visualizer/Ambient/Particles: page-wide singleton settings
// that already have a real settings home in the builder's Atmosphere tab.
// They're discoverable from the same searchable library as flow blocks, but
// selecting one never touches `blocks[]` — it just switches to that tab.
// See MusicSettings/AmbientSettings/ParticleSettings in
// link-store.ts.
export interface SingletonBlockEntry {
  kind: "singleton";
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: BlockCategory;
  isConfigured: (profile: Profile) => boolean;
  activate: (ctx: SingletonActivateContext) => void;
}

// Visible, searchable, but not selectable — a preview of what's coming.
export interface ComingSoonEntry {
  kind: "coming-soon";
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: BlockCategory;
}

export type BlockLibraryEntry = FlowBlockEntry | SingletonBlockEntry | ComingSoonEntry;
