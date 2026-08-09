// BlockRegistry — the single source of truth for "what blocks exist."
// `BLOCK_REGISTRY` is a `Record<LinkBlockType, FlowBlockEntry>` rather than a
// Map+register() (contrast src/lib/companion-engine/registry.ts) so that
// adding a new `LinkBlockType` without an entry here is a compile error, not
// a silent runtime gap — this registry is meant to be exhaustive, the
// companion one is meant to be open-ended.
//
// Adding a new flow block type end-to-end: add the type + fields to
// LinkBlockType/LinkBlock (link-store.ts), add a render case to
// LinkPreview.tsx, add field JSX to BlockEditor.tsx, then add one entry
// here. Nothing about the library/search/factory/toolbar layer changes.

import {
  AudioLines,
  CloudRain,
  Contact,
  GalleryHorizontalEnd,
  HelpCircle,
  Heading1,
  Image as ImageIcon,
  LayoutPanelTop,
  Link2,
  ListTree,
  Mail,
  MapPin,
  Music2,
  PawPrint,
  Quote,
  SeparatorHorizontal,
  Share2,
  ShoppingBag,
  Sparkles,
  Timer,
  Type,
  Video,
} from "lucide-react";
import { resolveTextRuns, textRunsAreEmpty, uid, type LinkBlockType } from "@/lib/link-store";
import type {
  BlockLibraryEntry,
  ComingSoonEntry,
  FlowBlockEntry,
  SingletonBlockEntry,
} from "./types";

export const BLOCK_REGISTRY: Record<LinkBlockType, FlowBlockEntry> = {
  header: {
    kind: "flow",
    type: "header",
    label: "Heading",
    description: "A section title to organize your page.",
    icon: Heading1,
    category: "basic",
    create: () => ({ id: uid(), type: "header", title: "New heading" }),
    summary: (b) => b.title || undefined,
  },
  text: {
    kind: "flow",
    type: "text",
    label: "Text",
    description: "A paragraph of rich, formatted text.",
    icon: Type,
    category: "basic",
    create: () => ({ id: uid(), type: "text", title: "New text" }),
    summary: (b) => {
      const runs = resolveTextRuns(b);
      if (textRunsAreEmpty(runs)) return undefined;
      return runs
        .map((r) => (r.text === "\n" ? " " : r.text))
        .join("")
        .trim()
        .slice(0, 60);
    },
  },
  divider: {
    kind: "flow",
    type: "divider",
    label: "Divider",
    description: "A thin line or icon to separate sections.",
    icon: SeparatorHorizontal,
    category: "basic",
    create: () => ({ id: uid(), type: "divider" }),
  },
  quote: {
    kind: "flow",
    type: "quote",
    label: "Quote",
    description: "A pull quote, with an optional attribution.",
    icon: Quote,
    category: "basic",
    create: () => ({ id: uid(), type: "quote", quoteText: "Type a quote…" }),
    summary: (b) => b.quoteText || undefined,
  },
  image: {
    kind: "flow",
    type: "image",
    label: "Image",
    description: "A single photo, optionally linked.",
    icon: ImageIcon,
    category: "media",
    create: () => ({ id: uid(), type: "image", image: "", url: "" }),
    summary: (b) => b.imageName || (b.image ? "1 image" : undefined),
  },
  gallery: {
    kind: "flow",
    type: "gallery",
    label: "Gallery",
    description: "Upload one or more images.",
    icon: GalleryHorizontalEnd,
    category: "media",
    create: () => ({ id: uid(), type: "gallery", galleryImages: [] }),
    summary: (b) => {
      const n = (b.galleryImages ?? []).length;
      return n > 0 ? `${n} image${n === 1 ? "" : "s"}` : undefined;
    },
  },
  video: {
    kind: "flow",
    type: "video",
    label: "Video",
    description: "Embed a YouTube/Vimeo link, or upload a file.",
    icon: Video,
    category: "media",
    create: () => ({ id: uid(), type: "video", videoUrl: "" }),
    summary: (b) => b.videoTitle || b.videoUrl || undefined,
  },
  banner: {
    kind: "flow",
    type: "banner",
    label: "Banner",
    description: "A big, styled card with an image and a link.",
    icon: LayoutPanelTop,
    category: "media",
    create: () => ({
      id: uid(),
      type: "banner",
      title: "New banner",
      subtitle: "",
      url: "https://",
      image: "",
      bannerStyle: "ember",
    }),
    summary: (b) => b.title || undefined,
  },
  link: {
    kind: "flow",
    type: "link",
    label: "Link",
    description: "A single button that opens a URL.",
    icon: Link2,
    category: "social",
    create: () => ({ id: uid(), type: "link", title: "New link", url: "https://" }),
    summary: (b) => b.title || b.url || undefined,
  },
  social: {
    kind: "flow",
    type: "social",
    label: "Social Icons",
    description: "A row of icons linking to your social profiles.",
    icon: Share2,
    category: "social",
    create: () => ({ id: uid(), type: "social", socials: [{ kind: "instagram", url: "" }] }),
    summary: (b) => {
      const n = (b.socials ?? []).length;
      return n > 0 ? `${n} profile${n === 1 ? "" : "s"}` : undefined;
    },
  },
  contact: {
    kind: "flow",
    type: "contact",
    label: "Contact",
    description: "Tappable buttons for your email and phone.",
    icon: Contact,
    category: "social",
    create: () => ({ id: uid(), type: "contact", email: "", phone: "" }),
    summary: (b) => b.email || b.phone || undefined,
  },
  timeline: {
    kind: "flow",
    type: "timeline",
    label: "Timeline",
    description: "A sequence of milestones or events.",
    icon: ListTree,
    category: "advanced",
    create: () => ({
      id: uid(),
      type: "timeline",
      timelineItems: [{ id: uid(), title: "New milestone" }],
    }),
    summary: (b) => {
      const n = (b.timelineItems ?? []).length;
      return n > 0 ? `${n} item${n === 1 ? "" : "s"}` : undefined;
    },
  },
  countdown: {
    kind: "flow",
    type: "countdown",
    label: "Countdown",
    description: "A live countdown to a date and time.",
    icon: Timer,
    category: "advanced",
    create: () => ({
      id: uid(),
      type: "countdown",
      countdownLabel: "Counting down to",
      countdownTarget: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    }),
    summary: (b) => b.countdownLabel || undefined,
  },
  faq: {
    kind: "flow",
    type: "faq",
    label: "FAQ",
    description: "A list of expandable questions and answers.",
    icon: HelpCircle,
    category: "advanced",
    create: () => ({
      id: uid(),
      type: "faq",
      faqItems: [{ id: uid(), question: "New question", answer: "" }],
    }),
    summary: (b) => {
      const n = (b.faqItems ?? []).length;
      return n > 0 ? `${n} question${n === 1 ? "" : "s"}` : undefined;
    },
  },
};

// Every entry here activates the "Atmosphere" tab — its internal Tabs
// `value` stayed "music" when the tab was renamed/redesigned (only the
// visible label changed), so `setActiveTab("music")` is still correct.
export const SINGLETON_ENTRIES: SingletonBlockEntry[] = [
  {
    kind: "singleton",
    id: "music",
    label: "Background Music",
    description: 'A track visitors can play, with a live visualizer on the "now playing" pill.',
    icon: Music2,
    category: "interactive",
    isConfigured: (p) => !!p.music?.enabled,
    activate: ({ setActiveTab }) => setActiveTab("music"),
  },
  {
    kind: "singleton",
    id: "visualizer",
    label: "Visualizer",
    description: "The style, size, and color of the now-playing pill's animation.",
    icon: AudioLines,
    category: "interactive",
    isConfigured: (p) => !!p.music?.visualizer && p.music.visualizer !== "off",
    activate: ({ setActiveTab }) => setActiveTab("music"),
  },
  {
    kind: "singleton",
    id: "ambient",
    label: "Ambient Sounds",
    description: "Rain, ocean, fireplace, and more — layered under your music.",
    icon: CloudRain,
    category: "interactive",
    isConfigured: (p) => !!p.ambient?.enabled,
    activate: ({ setActiveTab }) => setActiveTab("music"),
  },
  {
    kind: "singleton",
    id: "particles",
    label: "Particles",
    description: "Snow, stars, fireflies, and other drifting effects.",
    icon: Sparkles,
    category: "interactive",
    isConfigured: (p) => !!p.particles?.enabled,
    activate: ({ setActiveTab }) => setActiveTab("music"),
  },
  {
    kind: "singleton",
    id: "companion",
    label: "Companion",
    description: "An interactive pixel companion that lives on your page.",
    icon: PawPrint,
    category: "interactive",
    isConfigured: (p) => !!p.companion,
    activate: ({ setActiveTab }) => setActiveTab("music"),
  },
];

export const COMING_SOON_ENTRIES: ComingSoonEntry[] = [
  {
    kind: "coming-soon",
    id: "store",
    label: "Store",
    description: "Sell products right from your page.",
    icon: ShoppingBag,
    category: "coming-soon",
  },
  {
    kind: "coming-soon",
    id: "newsletter",
    label: "Newsletter",
    description: "Collect emails from your visitors.",
    icon: Mail,
    category: "coming-soon",
  },
  {
    kind: "coming-soon",
    id: "maps",
    label: "Maps",
    description: "Show a location on a map.",
    icon: MapPin,
    category: "coming-soon",
  },
];

// Flattened list the Block Library / Command Palette actually iterate —
// flow entries in a stable, deliberate order (not just Object.values'
// insertion order, which would otherwise silently depend on registry edit
// history), then singletons, then coming-soon stubs last.
const FLOW_ORDER: LinkBlockType[] = [
  "header",
  "text",
  "divider",
  "quote",
  "image",
  "gallery",
  "video",
  "banner",
  "link",
  "social",
  "contact",
  "timeline",
  "countdown",
  "faq",
];

export const BLOCK_LIBRARY_ENTRIES: BlockLibraryEntry[] = [
  ...FLOW_ORDER.map((type) => BLOCK_REGISTRY[type]),
  ...SINGLETON_ENTRIES,
  ...COMING_SOON_ENTRIES,
];
