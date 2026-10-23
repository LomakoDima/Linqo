import { MUSIC_LIBRARY } from "./music-library";

export type LinkBlockType =
  | "link"
  | "banner"
  | "header"
  | "social"
  | "contact"
  | "image"
  | "text"
  | "divider"
  | "quote"
  | "gallery"
  | "video"
  | "timeline"
  | "countdown"
  | "faq";

export type SocialKind =
  | "instagram"
  | "telegram"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "x"
  | "threads"
  | "facebook"
  | "whatsapp"
  | "discord"
  | "twitch"
  | "pinterest"
  | "spotify"
  | "dribbble"
  | "figma"
  | "slack"
  | "linkedin"
  | "github"
  | "website";

export type BannerStyle =
  | "dark"
  | "ember"
  | "crimson"
  | "midnight"
  | "sand"
  | "violet"
  | "teal"
  | "rose"
  | "gold"
  | "pine"
  | "storm"
  | "coral"
  | "sunset"
  | "ocean"
  | "candy"
  | "citrus"
  | "peach"
  | "grape"
  | "arctic"
  | "mint"
  | "wildfire"
  | "twilight";

export type BannerStyleKind = "moody" | "gradient";

// "image" (the default, matching profiles created before this existed) shows
// `cover` as a photo; "color" shows a solid/gradient swatch from BANNER_STYLES
// instead — same curated palette the banner blocks use, rather than a raw
// color picker.
export type CoverType = "image" | "color";

export type BannerLayout = "horizontal" | "vertical";

export type HeadingSize = "sm" | "md" | "lg" | "xl" | "2xl";

export type TextAlign = "left" | "center" | "right";

// One inline run of a "text" block's rich content: plain text, optionally
// overriding any of the block's own default styling (LinkBlock.textFont/
// textColor/textSize/textBold/etc.) for just that run — like selecting a
// word in Word and changing only its font or color. A run whose text is
// exactly "\n" is a line break, not literal text. This is the only structure
// a "text" block's content ever carries — no HTML — so rendering it is
// always just plain strings, never markup to trust.
export interface TextRun {
  text: string;
  font?: string;
  color?: string;
  size?: HeadingSize;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

// "rounded" (the default, matching image blocks created before this existed)
// keeps the image's natural proportions; the rest crop to a fixed ratio via
// object-cover.
export type ImageShape = "rounded" | "square" | "circle" | "landscape" | "portrait";

export type BannerPattern =
  | "none"
  | "honeycomb"
  | "spikes"
  | "dots"
  | "stars"
  | "dunes"
  | "diamonds"
  | "chevron"
  | "ripples"
  | "sparkle"
  | "trees"
  | "bolts"
  | "coral";

// These IDs were used by the short-lived generated-image collection. They
// remain accepted when decoding stored data, but normalize to the refined
// geometric collection below so saved profiles never render a broken banner.
export type LegacyBannerPattern =
  | "topographic"
  | "isometric"
  | "orbit"
  | "waveform"
  | "diamond-grid"
  | "constellation"
  | "circuit"
  | "prism"
  | "aurora";

export type StoredBannerPattern = BannerPattern | LegacyBannerPattern;

export type DividerStyle = "solid" | "dashed" | "dotted" | "icon";

// The finite set of icon names a "divider" block's icon style can use. Pure
// data (no lucide-react import here — this file stays framework-free) —
// LinkPreview.tsx and BlockEditor.tsx each map these names to their own
// lucide icon component for rendering and for the picker, respectively.
export const DIVIDER_ICON_NAMES = ["sparkles", "star", "heart", "sun", "moon", "feather"] as const;

export type QuoteStyle = "plain" | "card" | "bigmark";

export type GalleryLayout = "grid" | "carousel" | "masonry";

export type VideoProvider = "youtube" | "vimeo" | "file";

export type VideoAspect = "16:9" | "9:16" | "1:1";

export type CountdownStyle = "digits" | "words";

export type FaqDefaultOpen = "first" | "none" | "all";

export interface GalleryImageItem {
  id: string;
  image: string;
  imageName?: string;
  caption?: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  date?: string;
  description?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LinkBlock {
  id: string;
  type: LinkBlockType;
  title?: string;
  subtitle?: string;
  url?: string;
  socials?: { kind: SocialKind; url: string }[];
  email?: string;
  phone?: string;
  // "contact" block visibility toggles — let the field stay filled in but
  // hidden from the public page, rather than forcing it to be deleted to
  // hide it. Undefined behaves as true, matching contact blocks created
  // before these existed.
  contactEmailEnabled?: boolean;
  contactPhoneEnabled?: boolean;
  image?: string;
  // Original filename of an uploaded image, shown in place of its (huge)
  // data URL so the field reads like "1.png" instead of a wall of base64.
  imageName?: string;
  // "image" block crop. Undefined behaves as "rounded" (natural proportions),
  // matching image blocks created before this field existed.
  imageShape?: ImageShape;
  // 0-100; how opaque the "image" block's picture is over the page
  // background. Undefined behaves as 100 (fully opaque), matching image
  // blocks created before this field existed — same convention as
  // bannerOpacity below.
  imageOpacity?: number;
  bannerStyle?: BannerStyle;
  // When true, the fields below replace bannerStyle entirely with a
  // hand-picked color or gradient instead of one of the curated presets.
  bannerUseCustomColor?: boolean;
  bannerCustomUseGradient?: boolean;
  bannerCustomColor?: string;
  bannerCustomGradientFrom?: string;
  bannerCustomGradientTo?: string;
  bannerPattern?: StoredBannerPattern;
  // 0-100; opacity of the pattern layer itself. Undefined keeps the previous
  // visual balance at 70% while older saved banners gain the new controls.
  bannerPatternOpacity?: number;
  // 50-200; tile scale for the selected pattern. Undefined behaves as 100.
  bannerPatternScale?: number;
  // 0-100; how opaque the banner's color/pattern/image is over the page
  // background. Undefined behaves as 100 (fully opaque), matching banners
  // created before this field existed.
  bannerOpacity?: number;
  // Undefined behaves as "horizontal" (image masked in behind the text on
  // the right), matching banners created before this field existed.
  bannerLayout?: BannerLayout;
  tall?: boolean;
  // "header" block customization. All optional — undefined falls back to the
  // theme's own heading treatment (var(--font-heading), theme.accent color,
  // semibold, uppercase, no underline), matching headers created before
  // these existed.
  headingFont?: string;
  headingSize?: HeadingSize;
  headingColor?: string;
  headingBold?: boolean;
  headingItalic?: boolean;
  headingUnderline?: boolean;
  headingStrikethrough?: boolean;
  // Undefined behaves as true — headers were always uppercase before this
  // toggle existed.
  headingUppercase?: boolean;
  // When true, headingGradientFrom/To (a left-to-right text-clip gradient)
  // replace headingColor entirely.
  headingUseGradient?: boolean;
  headingGradientFrom?: string;
  headingGradientTo?: string;
  // A pill-shaped background behind the heading text, independent of the
  // text's own color/gradient.
  headingBgColor?: string;
  // "text" block customization. Rich content lives in textRuns (see
  // TextRun) — everything else here applies to the whole block, matching how
  // every other block's customization works. `title` is kept only as a
  // plain-text fallback for text blocks created before textRuns existed (see
  // resolveTextRuns).
  textRuns?: TextRun[];
  textFont?: string;
  textColor?: string;
  textAlign?: TextAlign;
  textSize?: HeadingSize;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textStrikethrough?: boolean;
  // "divider" block. Undefined behaves as "solid"; dividerIcon (a lucide
  // icon name) only applies when dividerStyle is "icon"; undefined
  // dividerColor falls back to the theme's own muted color.
  dividerStyle?: DividerStyle;
  dividerIcon?: string;
  dividerColor?: string;
  // Divider line controls. Undefined keeps the original full-width, 1px
  // appearance for blocks created before these options existed.
  dividerWidth?: number;
  dividerThickness?: number;
  // 0-100 opacity; undefined preserves the theme's original divider contrast.
  dividerOpacity?: number;
  // "quote" block. Undefined quoteStyle behaves as "plain".
  quoteText?: string;
  quoteAuthor?: string;
  quoteFont?: string;
  quoteColor?: string;
  quoteAlign?: TextAlign;
  quoteSize?: HeadingSize;
  quoteStyle?: QuoteStyle;
  // "gallery" block. Undefined galleryImages behaves as [] (empty gallery,
  // same convention as resolveTextRuns falling back on an empty array).
  // Undefined galleryLayout behaves as "grid"; undefined galleryShape reuses
  // ImageShape and behaves as "rounded".
  galleryImages?: GalleryImageItem[];
  galleryLayout?: GalleryLayout;
  galleryShape?: ImageShape;
  // "video" block. Undefined videoProvider is inferred from videoUrl at
  // render time. Undefined videoAutoplay behaves as false; undefined
  // videoAspect behaves as "16:9".
  videoUrl?: string;
  videoProvider?: VideoProvider;
  videoTitle?: string;
  videoAutoplay?: boolean;
  videoAspect?: VideoAspect;
  // "timeline" block. Undefined timelineItems behaves as [].  Undefined
  // timelineOrientation behaves as "vertical".
  timelineItems?: TimelineItem[];
  timelineOrientation?: "vertical" | "horizontal";
  // "countdown" block. countdownTarget is an ISO date string. Undefined
  // countdownStyle behaves as "digits"; undefined countdownExpiredMessage
  // behaves as "We're live!".
  countdownTarget?: string;
  countdownLabel?: string;
  countdownStyle?: CountdownStyle;
  countdownExpiredMessage?: string;
  // "faq" block. Undefined faqItems behaves as []. Undefined
  // faqDefaultOpen behaves as "none".
  faqItems?: FaqItem[];
  faqDefaultOpen?: FaqDefaultOpen;
}

export type ThemeName =
  | "dark"
  | "light"
  | "sunset"
  | "ocean"
  | "forest"
  | "aurora"
  | "candy"
  | "slate"
  | "blush"
  | "lavender"
  | "citrus"
  | "mint"
  | "noir"
  | "charcoal"
  | "cream"
  | "navy"
  | "sage"
  | "plum"
  | "tan"
  | "steel"
  | "peach"
  | "grape"
  | "arctic"
  | "wildfire"
  | "twilight";

export type MusicGenre =
  | "lofi"
  | "chill"
  | "relax"
  | "focus"
  | "jazz"
  | "ambient"
  | "piano"
  | "synthwave"
  | "acoustic"
  | "upbeat";

// Which real-time visualization plays next to the "now playing" pill once a
// track is actually running (see AudioVisualizer) — "off" keeps the plain
// icon + label with no motion. Undefined behaves as "bars", matching music
// widgets created before this existed.
export type MusicVisualizerStyle =
  "bars" | "wave" | "pulse" | "waveform" | "circular" | "spectrum" | "off";

// Undefined behaves as "md" / "right", matching widgets created before
// these existed.
export type MusicVisualizerSize = "sm" | "md" | "lg";
export type MusicVisualizerPosition = "left" | "center" | "right";

export interface MusicSettings {
  enabled: boolean;
  genre?: MusicGenre;
  // A URL to the track — either pasted in directly, or filled in after an
  // upload (see uploadMusicTrack in lib/publish.ts, which stores the file
  // in the backend's own database rather than embedding it in the profile
  // JSON, since that JSON has a ~400KB budget an audio file would blow
  // straight through).
  url?: string;
  loop?: boolean;
  volume?: number;
  // Whether the visualizer widget shows on the public page — independent
  // of Background Music's own on/off switch. Undefined defaults to
  // whatever Background Music already is (see NowPlayingWidget /
  // VisualizerOnlyWidget in LinkPreview.tsx), so a profile saved before
  // this toggle existed renders exactly as before: visualizer on while
  // music plays, off otherwise. An explicit value overrides that in
  // either direction — true shows the visualizer (static, since it only
  // moves while music plays) even with music off; false hides it, and the
  // tap-to-pause button with it, even while music plays.
  visualizerEnabled?: boolean;
  visualizer?: MusicVisualizerStyle;
  visualizerSize?: MusicVisualizerSize;
  visualizerPosition?: MusicVisualizerPosition;
  // 0-100; undefined behaves as 100 (fully opaque), matching widgets created
  // before this field existed — same convention as bannerOpacity.
  visualizerOpacity?: number;
  // 0-100; how squared-off (0) vs. pill-rounded (100) the bars/waveform
  // read. Undefined behaves as 100 — today's fixed roundness — so existing
  // profiles render pixel-identical to before this field existed.
  visualizerRoundness?: number;
  // A multiplier on the visualizer's own animation timing (envelope/idle
  // motion), not playback speed. Undefined behaves as 1 — today's exact
  // constants.
  visualizerSpeed?: number;
  // Hex/rgba override. Undefined falls back to the existing genre.light-based
  // black/white contrast logic in NowPlayingWidget.
  visualizerColor?: string;
}

// The 10 environmental sound categories layerable underneath (or instead
// of) Background Music, each with independent volume. Unlike MUSIC_GENRES,
// there is no bundled/curated audio here — each layer is a user-supplied
// upload or URL, same convention as MusicSettings.url.
export type AmbientSoundKind =
  | "rain"
  | "forest"
  | "ocean"
  | "wind"
  | "night"
  | "coffee-shop"
  | "fireplace"
  | "thunder"
  | "river"
  | "birds";

export interface AmbientLayer {
  kind: AmbientSoundKind;
  enabled: boolean;
  url?: string;
  urlName?: string;
  // 0-100; undefined behaves as 50.
  volume?: number;
}

export interface AmbientSettings {
  enabled: boolean;
  // Undefined behaves as [] — same "absent means empty list" convention as
  // LinkBlock.galleryImages/timelineItems/faqItems.
  layers?: AmbientLayer[];
}

export const AMBIENT_SOUNDS: Record<AmbientSoundKind, { label: string; blurb: string }> = {
  rain: { label: "Rain", blurb: "Steady rainfall." },
  forest: { label: "Forest", blurb: "Rustling leaves, distant birdsong." },
  ocean: { label: "Ocean", blurb: "Rolling waves." },
  wind: { label: "Wind", blurb: "A soft, steady breeze." },
  night: { label: "Night", blurb: "Crickets and quiet dark." },
  "coffee-shop": { label: "Coffee Shop", blurb: "Murmured chatter, cups and saucers." },
  fireplace: { label: "Fireplace", blurb: "A crackling, popping fire." },
  thunder: { label: "Thunder", blurb: "Distant rolling thunder." },
  river: { label: "River", blurb: "A running stream." },
  birds: { label: "Birds", blurb: "Morning birdsong." },
};

// A single decorative effect drifting over the whole page — one active kind
// at a time (alternatives, not a layered stack like Ambient Sounds).
export type ParticleKind =
  | "snow"
  | "rain"
  | "leaves"
  | "stars"
  | "fireflies"
  | "sakura"
  | "dust"
  | "bubbles"
  | "hearts"
  | "sparkles";

export interface ParticleSettings {
  enabled: boolean;
  // Undefined behaves as "snow".
  kind?: ParticleKind;
  // Particles on screen at once. Undefined uses the kind's own default.
  density?: number;
  // Fall/drift speed multiplier. Undefined uses the kind's own default.
  speed?: number;
  // Size multiplier. Undefined uses the kind's own default.
  size?: number;
  // 0-100. Undefined uses the kind's own default.
  opacity?: number;
  // Hex/rgba override. Undefined uses the kind's own default (or the
  // page theme's accent color, per-kind). Ignored for "emoji" — emoji carry
  // their own colours.
  color?: string;
  // What each particle looks like. Undefined (or "default") keeps the kind's
  // own look, so profiles saved before this existed render unchanged.
  shape?: ParticleShape;
  // The character drawn when shape is "emoji" (first 1-2 characters used).
  emoji?: string;
}

export type ParticleShape =
  "default" | "circle" | "square" | "star" | "heart" | "sparkle" | "emoji";

// Real, working page-wide visual effects (see LinkPreview) — each toggle is
// independent and narrowly scoped to one overlay or one existing usage site,
// not a full re-theme. Undefined behaves as false/off throughout.
export interface EffectsSettings {
  glass?: boolean;
  noise?: boolean;
  // 0-100; undefined behaves as 30.
  noiseIntensity?: number;
  glow?: boolean;
  // 0-100; undefined behaves as 50.
  glowIntensity?: number;
  gradientAnimation?: boolean;
  // Blurs the existing background image layer only — a no-op without one.
  blur?: boolean;
  // 0-100; undefined behaves as 40.
  blurIntensity?: number;
}

export interface Profile {
  slug: string;
  avatar: string;
  avatarName?: string;
  cover: string;
  coverName?: string;
  coverType?: CoverType;
  coverStyle?: BannerStyle;
  name: string;
  bio: string;
  theme: ThemeName;
  // Hex override for the active theme's own `accentHex`. Undefined falls
  // back to THEMES[theme].accentHex.
  accentColor?: string;
  // Optional photo layered behind the theme's colors/gradient as the page
  // background, scrimmed for text contrast. Independent of `theme` itself so
  // any theme's palette (card/text/accent colors) still applies on top of it.
  bgImage?: string;
  bgImageName?: string;
  // The page's base background, independent of `theme` — same coverType/
  // coverStyle pattern Cover already uses. Undefined behaves as "image"
  // (today's only-ever-image behavior); "color" replaces theme.bg's
  // background (not its text color) with a BANNER_STYLES swatch.
  bgType?: CoverType;
  bgStyle?: BannerStyle;
  // A decorative, page-wide visual treatment layer (Glass/Noise/Glow/
  // Gradient Animation/Blur) — distinct from `particles`, a single drifting
  // sprite effect edited from the Atmosphere tab.
  effects?: EffectsSettings;
  music?: MusicSettings;
  // Environmental sound layers — independent of, and mixable with, music.
  ambient?: AmbientSettings;
  // A decorative effect drifting over the whole page.
  particles?: ParticleSettings;
  // Undefined -> falls back to name || slug at render sites (public page
  // <head>, Social Preview card).
  seoTitle?: string;
  // Undefined -> falls back to bio.
  seoDescription?: string;
  // A real hosted URL (from uploadOgImage — never a data: URL, since social
  // crawlers fetch og:image directly and can't resolve one). Undefined ->
  // falls back to avatar for in-app preview only, then a generated
  // placeholder; the public <head> only ever emits a real ogImage URL.
  ogImage?: string;
  ogImageName?: string;
  blocks: LinkBlock[];
  // id of the template gallery card last applied — drives the "in use" badge
  // there. Defaults to "standard" (the blank starting point) for new profiles.
  templateId?: string;
}

export type ThemeKind = "solid" | "gradient";

export const THEMES: Record<
  ThemeName,
  {
    bg: string;
    card: string;
    text: string;
    muted: string;
    accent: string;
    label: string;
    kind: ThemeKind;
    // Mirrors BANNER_STYLES' existing convention — used to pick a readable
    // glass/noise overlay color per theme.
    light: boolean;
    // A real hex counterpart to `accent` (a Tailwind class string, which
    // can't be dropped into a CSS radial-gradient()/box-shadow value) — used
    // by Glow, Gradient Animation, and Accent Color's own default.
    accentHex: string;
  }
> = {
  dark: {
    label: "Midnight",
    kind: "solid",
    bg: "bg-[#0b0b0f] text-white",
    card: "bg-white/5 hover:bg-white/10 border border-white/10",
    text: "text-white",
    muted: "text-white/60",
    accent: "text-orange-400",
    light: false,
    accentHex: "#fb923c",
  },
  light: {
    label: "Paper",
    kind: "solid",
    bg: "bg-[#f6f4ef] text-neutral-900",
    card: "bg-white hover:bg-neutral-50 border border-neutral-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-neutral-500",
    accent: "text-orange-600",
    light: true,
    accentHex: "#ea580c",
  },
  sunset: {
    label: "Sunset",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#2a0a0a] via-[#3b0f05] to-[#1a0505] text-white",
    card: "bg-gradient-to-r from-orange-600/30 to-red-700/30 hover:from-orange-600/40 hover:to-red-700/40 border border-orange-500/30",
    text: "text-white",
    muted: "text-orange-100/70",
    accent: "text-orange-300",
    light: false,
    accentHex: "#fdba74",
  },
  ocean: {
    label: "Ocean",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#031b2f] via-[#062a45] to-[#01111d] text-white",
    card: "bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30",
    text: "text-white",
    muted: "text-cyan-100/70",
    accent: "text-cyan-300",
    light: false,
    accentHex: "#67e8f9",
  },
  forest: {
    label: "Forest",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#0a1f14] via-[#0f2d1c] to-[#04120a] text-white",
    text: "text-white",
    card: "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30",
    muted: "text-emerald-100/70",
    accent: "text-emerald-300",
    light: false,
    accentHex: "#6ee7b7",
  },
  aurora: {
    label: "Aurora",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#052e2b] via-[#0a3d55] to-[#1a0a3d] text-white",
    card: "bg-teal-400/10 hover:bg-teal-400/20 border border-teal-300/30",
    text: "text-white",
    muted: "text-teal-100/70",
    accent: "text-teal-300",
    light: false,
    accentHex: "#5eead4",
  },
  candy: {
    label: "Candy",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#3a0a2e] via-[#5a1050] to-[#1a0a2e] text-white",
    card: "bg-pink-400/10 hover:bg-pink-400/20 border border-pink-300/30",
    text: "text-white",
    muted: "text-pink-100/70",
    accent: "text-pink-300",
    light: false,
    accentHex: "#f9a8d4",
  },
  slate: {
    label: "Slate",
    kind: "solid",
    bg: "bg-[#1b2430] text-white",
    card: "bg-white/5 hover:bg-white/10 border border-white/10",
    text: "text-white",
    muted: "text-slate-300/70",
    accent: "text-sky-400",
    light: false,
    accentHex: "#38bdf8",
  },
  blush: {
    label: "Blush",
    kind: "solid",
    bg: "bg-[#fdf1f3] text-neutral-900",
    card: "bg-white hover:bg-rose-50 border border-rose-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-rose-500/70",
    accent: "text-rose-600",
    light: true,
    accentHex: "#e11d48",
  },
  lavender: {
    label: "Lavender",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#efeaff] via-[#e4dbfb] to-[#d9cdf7] text-neutral-900",
    card: "bg-white/70 hover:bg-white/90 border border-purple-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-purple-700/60",
    accent: "text-purple-600",
    light: true,
    accentHex: "#9333ea",
  },
  citrus: {
    label: "Citrus",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#3a1f02] via-[#5a3405] to-[#2a1601] text-white",
    card: "bg-amber-400/10 hover:bg-amber-400/20 border border-amber-300/30",
    text: "text-white",
    muted: "text-amber-100/70",
    accent: "text-amber-300",
    light: false,
    accentHex: "#fcd34d",
  },
  mint: {
    label: "Mint",
    kind: "solid",
    bg: "bg-[#eefaf3] text-neutral-900",
    card: "bg-white hover:bg-emerald-50 border border-emerald-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-emerald-600/70",
    accent: "text-emerald-600",
    light: true,
    accentHex: "#059669",
  },
  noir: {
    label: "Noir",
    kind: "solid",
    bg: "bg-black text-white",
    card: "bg-white/10 hover:bg-white/20 border border-white/20",
    text: "text-white",
    muted: "text-white/50",
    accent: "text-white",
    light: false,
    accentHex: "#ffffff",
  },
  charcoal: {
    label: "Charcoal",
    kind: "solid",
    bg: "bg-[#2b2b2b] text-white",
    card: "bg-white/5 hover:bg-white/10 border border-white/10",
    text: "text-white",
    muted: "text-white/55",
    accent: "text-orange-300",
    light: false,
    accentHex: "#fdba74",
  },
  cream: {
    label: "Cream",
    kind: "solid",
    bg: "bg-[#faf6ec] text-neutral-900",
    card: "bg-white hover:bg-neutral-50 border border-neutral-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-neutral-500",
    accent: "text-amber-600",
    light: true,
    accentHex: "#d97706",
  },
  navy: {
    label: "Navy",
    kind: "solid",
    bg: "bg-[#0d1b2a] text-white",
    card: "bg-blue-400/10 hover:bg-blue-400/20 border border-blue-300/25",
    text: "text-white",
    muted: "text-blue-100/70",
    accent: "text-blue-300",
    light: false,
    accentHex: "#93c5fd",
  },
  sage: {
    label: "Sage",
    kind: "solid",
    bg: "bg-[#eef1e8] text-neutral-900",
    card: "bg-white hover:bg-green-50 border border-green-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-green-700/60",
    accent: "text-green-700",
    light: true,
    accentHex: "#15803d",
  },
  plum: {
    label: "Plum",
    kind: "solid",
    bg: "bg-[#2a1030] text-white",
    card: "bg-fuchsia-400/10 hover:bg-fuchsia-400/20 border border-fuchsia-300/25",
    text: "text-white",
    muted: "text-fuchsia-100/70",
    accent: "text-fuchsia-300",
    light: false,
    accentHex: "#f0abfc",
  },
  tan: {
    label: "Tan",
    kind: "solid",
    bg: "bg-[#e8dcc8] text-neutral-900",
    card: "bg-white hover:bg-amber-50 border border-amber-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-amber-800/60",
    accent: "text-amber-800",
    light: true,
    accentHex: "#92400e",
  },
  steel: {
    label: "Steel",
    kind: "solid",
    bg: "bg-[#3a4550] text-white",
    card: "bg-white/10 hover:bg-white/15 border border-white/15",
    text: "text-white",
    muted: "text-slate-200/70",
    accent: "text-cyan-300",
    light: false,
    accentHex: "#67e8f9",
  },
  peach: {
    label: "Peach",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#ffe8d6] via-[#ffd3b0] to-[#ffb98a] text-neutral-900",
    card: "bg-white/70 hover:bg-white/90 border border-orange-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-orange-700/60",
    accent: "text-orange-600",
    light: true,
    accentHex: "#ea580c",
  },
  grape: {
    label: "Grape",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#1f0a2e] via-[#3a1050] to-[#150620] text-white",
    card: "bg-purple-400/10 hover:bg-purple-400/20 border border-purple-300/30",
    text: "text-white",
    muted: "text-purple-100/70",
    accent: "text-purple-300",
    light: false,
    accentHex: "#d8b4fe",
  },
  arctic: {
    label: "Arctic",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#e8f4f8] via-[#d0e8f0] to-[#b8dce8] text-neutral-900",
    card: "bg-white/70 hover:bg-white/90 border border-sky-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-sky-700/60",
    accent: "text-sky-600",
    light: true,
    accentHex: "#0284c7",
  },
  wildfire: {
    label: "Wildfire",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#3a0505] via-[#7a1f05] to-[#2a0a02] text-white",
    card: "bg-red-500/10 hover:bg-red-500/20 border border-red-400/30",
    text: "text-white",
    muted: "text-red-100/70",
    accent: "text-red-300",
    light: false,
    accentHex: "#fca5a5",
  },
  twilight: {
    label: "Twilight",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#0a1030] via-[#2a1550] to-[#3a1030] text-white",
    card: "bg-indigo-400/10 hover:bg-indigo-400/20 border border-indigo-300/30",
    text: "text-white",
    muted: "text-indigo-100/70",
    accent: "text-indigo-300",
    light: false,
    accentHex: "#a5b4fc",
  },
};

export const BANNER_STYLES: Record<
  BannerStyle,
  { gradient: string; ring: string; label: string; kind: BannerStyleKind; light: boolean }
> = {
  dark: {
    label: "Graphite",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_top_right,rgba(234,88,12,0.15),transparent_60%),linear-gradient(135deg,#111114,#1c1c22)]",
    ring: "ring-1 ring-white/10",
  },
  ember: {
    label: "Ember",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_right,rgba(255,120,50,0.35),transparent_65%),linear-gradient(135deg,#2a0f06,#4a1608)]",
    ring: "ring-1 ring-orange-500/30",
  },
  crimson: {
    label: "Crimson",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_left,rgba(220,38,38,0.35),transparent_60%),linear-gradient(135deg,#3a0808,#7a0f0f)]",
    ring: "ring-1 ring-red-500/30",
  },
  midnight: {
    label: "Midnight",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.35),transparent_60%),linear-gradient(135deg,#0a1e3a,#1e3a6a)]",
    ring: "ring-1 ring-blue-400/30",
  },
  sand: {
    label: "Sand",
    kind: "moody",
    light: true,
    gradient: "bg-[linear-gradient(135deg,#f5efe4,#e6d9c2)]",
    ring: "ring-1 ring-amber-900/20",
  },
  violet: {
    label: "Violet",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.35),transparent_65%),linear-gradient(135deg,#1e0a30,#3a1050)]",
    ring: "ring-1 ring-purple-500/30",
  },
  teal: {
    label: "Teal",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_right,rgba(45,212,191,0.35),transparent_65%),linear-gradient(135deg,#042a28,#0a4a45)]",
    ring: "ring-1 ring-teal-400/30",
  },
  rose: {
    label: "Rose",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.35),transparent_60%),linear-gradient(135deg,#3a0818,#6a1030)]",
    ring: "ring-1 ring-rose-500/30",
  },
  gold: {
    label: "Gold",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_top,rgba(250,204,21,0.35),transparent_60%),linear-gradient(135deg,#2a1e02,#4a3508)]",
    ring: "ring-1 ring-yellow-400/30",
  },
  pine: {
    label: "Pine",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_left,rgba(52,211,153,0.3),transparent_65%),linear-gradient(135deg,#04160c,#0a2e1a)]",
    ring: "ring-1 ring-emerald-500/30",
  },
  storm: {
    label: "Storm",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_bottom,rgba(100,116,139,0.35),transparent_60%),linear-gradient(135deg,#12181f,#252f3a)]",
    ring: "ring-1 ring-slate-400/30",
  },
  coral: {
    label: "Coral",
    kind: "moody",
    light: false,
    gradient:
      "bg-[radial-gradient(ellipse_at_right,rgba(251,146,60,0.35),transparent_65%),linear-gradient(135deg,#3a1206,#5a2410)]",
    ring: "ring-1 ring-orange-400/30",
  },
  // Smooth two-tone diagonal washes — no radial highlight — for a brighter,
  // more colorful look than the moody presets above.
  sunset: {
    label: "Sunset",
    kind: "gradient",
    light: false,
    gradient: "bg-[linear-gradient(135deg,#fb923c,#f43f5e)]",
    ring: "ring-1 ring-orange-400/30",
  },
  ocean: {
    label: "Ocean",
    kind: "gradient",
    light: false,
    gradient: "bg-[linear-gradient(135deg,#0ea5e9,#06b6d4)]",
    ring: "ring-1 ring-cyan-400/30",
  },
  candy: {
    label: "Candy",
    kind: "gradient",
    light: false,
    gradient: "bg-[linear-gradient(135deg,#f472b6,#a855f7)]",
    ring: "ring-1 ring-pink-400/30",
  },
  citrus: {
    label: "Citrus",
    kind: "gradient",
    light: true,
    gradient: "bg-[linear-gradient(135deg,#facc15,#f97316)]",
    ring: "ring-1 ring-amber-900/20",
  },
  peach: {
    label: "Peach",
    kind: "gradient",
    light: true,
    gradient: "bg-[linear-gradient(135deg,#fed7aa,#fca5a5)]",
    ring: "ring-1 ring-orange-900/15",
  },
  grape: {
    label: "Grape",
    kind: "gradient",
    light: false,
    gradient: "bg-[linear-gradient(135deg,#a855f7,#4f46e5)]",
    ring: "ring-1 ring-purple-400/30",
  },
  arctic: {
    label: "Arctic",
    kind: "gradient",
    light: true,
    gradient: "bg-[linear-gradient(135deg,#e0f2fe,#bae6fd)]",
    ring: "ring-1 ring-sky-900/15",
  },
  mint: {
    label: "Mint",
    kind: "gradient",
    light: true,
    gradient: "bg-[linear-gradient(135deg,#6ee7b7,#34d399)]",
    ring: "ring-1 ring-emerald-900/15",
  },
  wildfire: {
    label: "Wildfire",
    kind: "gradient",
    light: false,
    gradient: "bg-[linear-gradient(135deg,#ef4444,#7c2d12)]",
    ring: "ring-1 ring-red-400/30",
  },
  twilight: {
    label: "Twilight",
    kind: "gradient",
    light: false,
    gradient: "bg-[linear-gradient(135deg,#312e81,#7c3aed)]",
    ring: "ring-1 ring-indigo-400/30",
  },
};

export const HEADING_SIZES: Record<HeadingSize, { label: string; className: string }> = {
  sm: { label: "Small", className: "text-xs" },
  md: { label: "Medium", className: "text-sm" },
  lg: { label: "Large", className: "text-base" },
  xl: { label: "XL", className: "text-lg" },
  "2xl": { label: "XXL", className: "text-2xl" },
};

// `boxClassName` goes on the image's wrapper link (crop shape + corners);
// `hasFixedAspect` tells the renderer whether the <img> itself needs h-full
// to actually fill that shape — "rounded" has no fixed ratio, so the image
// keeps sizing itself the way it always did.
export const IMAGE_SHAPES: Record<
  ImageShape,
  { label: string; boxClassName: string; hasFixedAspect: boolean }
> = {
  rounded: { label: "Rounded", boxClassName: "rounded-2xl", hasFixedAspect: false },
  square: { label: "Square", boxClassName: "aspect-square rounded-none", hasFixedAspect: true },
  circle: { label: "Circle", boxClassName: "aspect-square rounded-full", hasFixedAspect: true },
  landscape: {
    label: "Landscape",
    boxClassName: "aspect-video rounded-2xl",
    hasFixedAspect: true,
  },
  portrait: { label: "Portrait", boxClassName: "aspect-[3/4] rounded-2xl", hasFixedAspect: true },
};

// A vibe picker first, a sample playlist second. `tracks` are the bundled
// loops from MUSIC_LIBRARY (static files under public/music, rendered by
// scripts/music-gen) that GenrePlaylistModal offers per genre. `image`,
// where set, replaces the gradient+icon+label with an illustrated banner
// (its own label/blurb already baked into the artwork).
export const MUSIC_GENRES: Record<
  MusicGenre,
  {
    label: string;
    blurb: string;
    gradient: string;
    ring: string;
    light: boolean;
    image?: string;
    tracks?: { label: string; url: string }[];
  }
> = {
  lofi: {
    label: "Lo-fi",
    blurb: "Dusty beats to study to",
    gradient: "bg-[linear-gradient(135deg,#8b5e3c,#3b2a4a)]",
    ring: "ring-1 ring-amber-700/30",
    light: false,
    image: "/banners/badges/lofi-badge.png",
    tracks: MUSIC_LIBRARY.lofi,
  },
  chill: {
    label: "Chill",
    blurb: "Laid-back and breezy",
    gradient: "bg-[linear-gradient(135deg,#0ea5e9,#1e293b)]",
    ring: "ring-1 ring-sky-400/30",
    light: false,
    image: "/banners/badges/chill-badge.png",
    tracks: MUSIC_LIBRARY.chill,
  },
  relax: {
    label: "Relax",
    blurb: "Slow down, breathe",
    gradient: "bg-[linear-gradient(135deg,#5eead4,#3b82f6)]",
    ring: "ring-1 ring-teal-300/30",
    light: false,
    image: "/banners/badges/relax-badge.png",
    tracks: MUSIC_LIBRARY.relax,
  },
  focus: {
    label: "Focus",
    blurb: "Deep work, no distractions",
    gradient: "bg-[linear-gradient(135deg,#4338ca,#1e1b4b)]",
    ring: "ring-1 ring-indigo-400/30",
    light: false,
    image: "/banners/badges/focus-badge.png",
    tracks: MUSIC_LIBRARY.focus,
  },
  jazz: {
    label: "Jazz",
    blurb: "Smooth and soulful",
    gradient: "bg-[linear-gradient(135deg,#b45309,#450a0a)]",
    ring: "ring-1 ring-amber-600/30",
    light: false,
    image: "/banners/badges/jazz-badge.png",
    tracks: MUSIC_LIBRARY.jazz,
  },
  ambient: {
    label: "Ambient",
    blurb: "Atmospheric and spacious",
    gradient: "bg-[linear-gradient(135deg,#134e4a,#020617)]",
    ring: "ring-1 ring-teal-500/20",
    light: false,
    image: "/banners/badges/ambient-badge.png",
    tracks: MUSIC_LIBRARY.ambient,
  },
  piano: {
    label: "Piano",
    blurb: "Soft keys, gentle mood",
    gradient: "bg-[linear-gradient(135deg,#e5e7eb,#6b7280)]",
    ring: "ring-1 ring-neutral-900/15",
    light: true,
    image: "/banners/badges/piano-badge.png",
    tracks: MUSIC_LIBRARY.piano,
  },
  synthwave: {
    label: "Synthwave",
    blurb: "Neon-lit retro energy",
    gradient: "bg-[linear-gradient(135deg,#f472b6,#7c3aed)]",
    ring: "ring-1 ring-pink-400/30",
    light: false,
    image: "/banners/badges/synthwave-badge.png",
    tracks: MUSIC_LIBRARY.synthwave,
  },
  acoustic: {
    label: "Acoustic",
    blurb: "Warm strings, unplugged",
    gradient: "bg-[linear-gradient(135deg,#f59e0b,#78350f)]",
    ring: "ring-1 ring-orange-500/30",
    light: false,
    image: "/banners/badges/acoustic-badge.png",
    tracks: MUSIC_LIBRARY.acoustic,
  },
  upbeat: {
    label: "Upbeat",
    blurb: "Energetic and bright",
    gradient: "bg-[linear-gradient(135deg,#fb923c,#ec4899)]",
    ring: "ring-1 ring-pink-400/30",
    light: false,
    image: "/banners/badges/upbeat-badge.png",
    tracks: MUSIC_LIBRARY.upbeat,
  },
};

export const MUSIC_VISUALIZER_STYLES: Record<MusicVisualizerStyle, { label: string }> = {
  bars: { label: "Bars" },
  wave: { label: "Wave" },
  pulse: { label: "Pulse" },
  waveform: { label: "Waveform" },
  circular: { label: "Circular" },
  spectrum: { label: "Spectrum" },
  off: { label: "Off" },
};

export const MUSIC_VISUALIZER_SIZES: Record<MusicVisualizerSize, { label: string }> = {
  sm: { label: "S" },
  md: { label: "M" },
  lg: { label: "L" },
};

export const MUSIC_VISUALIZER_POSITIONS: Record<MusicVisualizerPosition, { label: string }> = {
  left: { label: "Left" },
  center: { label: "Center" },
  right: { label: "Right" },
};

// Refined geometric motifs for banner backgrounds. The collection keeps the
// original visual vocabulary, but uses calmer spacing, rounded joins and
// edge-safe repetition so every tile feels intentional inside a narrow card.
const PATTERN_SHAPES: Record<
  Exclude<BannerPattern, "none">,
  { label: string; w: number; h: number; inner: string }
> = {
  honeycomb: {
    label: "Honeycomb",
    w: 96,
    h: 70,
    inner:
      "<path d='M24 1 48 15v26L24 55 0 41V15zM72 1 96 15v26L72 55 48 41V15zM48 15l24 14v26L48 69 24 55V29z'/><path d='M24 15 38 23v10L24 41 10 33V23zM72 15l14 8v10L72 41 58 33V23z' opacity='.55'/>",
  },
  spikes: {
    label: "Spikes",
    w: 72,
    h: 44,
    inner:
      "<path d='M0 43 12 21l12 22 12-22 12 22 12-22 12 22'/><path d='M-12 21 0 0l12 21 12-21 12 21 12-21 12 21 12-21 12 21' opacity='.52'/>",
  },
  dots: {
    label: "Dots",
    w: 48,
    h: 48,
    inner:
      "<circle cx='6' cy='6' r='1.7'/><circle cx='24' cy='6' r='1.7'/><circle cx='42' cy='6' r='1.7'/><circle cx='15' cy='24' r='1.7'/><circle cx='33' cy='24' r='1.7'/><circle cx='6' cy='42' r='1.7'/><circle cx='24' cy='42' r='1.7'/><circle cx='42' cy='42' r='1.7'/><circle cx='24' cy='24' r='1' opacity='.55'/>",
  },
  stars: {
    label: "Stars",
    w: 108,
    h: 72,
    inner:
      "<path d='M18 4 20.5 12 29 14.5l-8.5 2.5L18 25l-2.5-8-8.5-2.5 8.5-2.5zM78 18l1.7 5.3 5.3 1.7-5.3 1.7L78 32l-1.7-5.3-5.3-1.7 5.3-1.7zM48 48l2.2 6.8 6.8 2.2-6.8 2.2L48 66l-2.2-6.8-6.8-2.2 6.8-2.2z'/><circle cx='101' cy='52' r='1.4'/><circle cx='54' cy='11' r='1.4'/><circle cx='9' cy='56' r='1.4'/>",
  },
  dunes: {
    label: "Dunes",
    w: 120,
    h: 48,
    inner:
      "<path d='M0 15C20 2 40 2 60 15s40 13 60 0M0 30c20-13 40-13 60 0s40 13 60 0M0 45c20-13 40-13 60 0s40 13 60 0'/>",
  },
  diamonds: {
    label: "Diamonds",
    w: 64,
    h: 64,
    inner:
      "<path d='M16 0 32 16 16 32 0 16zM48 0l16 16-16 16-16-16zM16 32l16 16-16 16L0 48zM48 32l16 16-16 16-16-16z'/><path d='M16 8 24 16l-8 8-8-8zM48 8l8 8-8 8-8-8z' opacity='.48'/>",
  },
  chevron: {
    label: "Chevron",
    w: 84,
    h: 42,
    inner:
      "<path d='M0 12 21 0l21 12L63 0l21 12M0 33l21-12 21 12 21-12 21 12'/><path d='M-42 12-21 0 0 12M84 12l21-12 21 12M-42 33l21-12 21 12M84 33l21-12 21 12' opacity='.48'/>",
  },
  ripples: {
    label: "Ripples",
    w: 96,
    h: 72,
    inner:
      "<ellipse cx='24' cy='24' rx='7' ry='5'/><ellipse cx='24' cy='24' rx='15' ry='11'/><ellipse cx='24' cy='24' rx='24' ry='18'/><ellipse cx='72' cy='60' rx='7' ry='5'/><ellipse cx='72' cy='60' rx='15' ry='11'/><ellipse cx='72' cy='60' rx='24' ry='18'/>",
  },
  sparkle: {
    label: "Sparkle",
    w: 84,
    h: 72,
    inner:
      "<path d='M21 3 24 15l12 3-12 3-3 12-3-12-12-3 12-3zM63 36l2.2 8.8L74 47l-8.8 2.2L63 58l-2.2-8.8L52 47l8.8-2.2z'/><circle cx='53' cy='12' r='1.5'/><circle cx='12' cy='57' r='1.5'/><circle cx='78' cy='16' r='1.2'/>",
  },
  trees: {
    label: "Trees",
    w: 72,
    h: 68,
    inner:
      "<path d='M12 47 23 28h-7L28 7l12 21h-7l11 19zM60 55 68 41h-5l9-15 9 15h-5l8 14zM28 47v12M60 55v8'/>",
  },
  bolts: {
    label: "Bolts",
    w: 72,
    h: 72,
    inner: "<path d='M15 4 5 31h12L7 59l30-37H23zM58 15 49 38h10L50 67l27-38H65z'/>",
  },
  coral: {
    label: "Coral",
    w: 88,
    h: 72,
    inner:
      "<path d='M18 68V39m0 12L6 40m12 7 13-14m-13-7L9 15m9 11 10-17M62 68V39m0 15 12-12m-12 1-11-12m11-2 9-17m-9 9-10-9'/>",
  },
};

export const BANNER_PATTERNS: Record<BannerPattern, { label: string }> = {
  none: { label: "None" },
  ...(Object.fromEntries(
    (Object.keys(PATTERN_SHAPES) as Exclude<BannerPattern, "none">[]).map((k) => [
      k,
      { label: PATTERN_SHAPES[k].label },
    ]),
  ) as Record<Exclude<BannerPattern, "none">, { label: string }>),
};

const LEGACY_PATTERN_MAP: Record<LegacyBannerPattern, Exclude<BannerPattern, "none">> = {
  topographic: "dunes",
  isometric: "diamonds",
  orbit: "ripples",
  waveform: "chevron",
  "diamond-grid": "diamonds",
  constellation: "stars",
  circuit: "bolts",
  prism: "diamonds",
  aurora: "dunes",
};

// Normalize both current and short-lived generated-image IDs to the refined
// geometric collection. This keeps existing saved profiles visually stable.
export function normalizeBannerPattern(name: string | undefined): BannerPattern {
  if (name === "none") return "none";
  if (name && Object.prototype.hasOwnProperty.call(PATTERN_SHAPES, name)) {
    return name as Exclude<BannerPattern, "none">;
  }
  if (name && Object.prototype.hasOwnProperty.call(LEGACY_PATTERN_MAP, name)) {
    return LEGACY_PATTERN_MAP[name as LegacyBannerPattern];
  }
  return "dots";
}

// Builds a subtle, tinted SVG data URI. The artwork remains geometric and
// lightweight, but the tuned spacing, joins, and opacity make it feel like a
// polished texture instead of a debug overlay.
export function bannerPatternUrl(name: string | undefined, light: boolean): string {
  const normalized = normalizeBannerPattern(name);
  if (normalized === "none") return "";
  const shape = PATTERN_SHAPES[normalized];
  const color = light ? "#0f172a" : "#ffffff";
  const opacity = light ? 0.18 : 0.2;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${shape.w}' height='${shape.h}' viewBox='0 0 ${shape.w} ${shape.h}'><g fill='none' stroke='${color}' stroke-opacity='${opacity}' stroke-width='1.15' stroke-linecap='round' stroke-linejoin='round'>${shape.inner}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function bannerPatternSize(name: string | undefined, scale = 100): string {
  const normalized = normalizeBannerPattern(name);
  if (normalized === "none") return "auto";
  const shape = PATTERN_SHAPES[normalized];
  const factor = Math.max(50, Math.min(200, scale)) / 100;
  return `${Math.round(shape.w * factor)}px ${Math.round(shape.h * factor)}px`;
}

// A curated BannerStyle already knows whether it's "light"; a hand-picked
// custom color doesn't, so its text/pattern contrast is decided from actual
// relative luminance instead.
export function isLightHex(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

// Old text blocks (from before textRuns existed) just have a plain `title`
// string; split it into runs the same way whitespace-pre-line used to
// render it, so they open in the rich editor exactly as they used to look.
export function plainTextToRuns(text: string): TextRun[] {
  const parts = text.split("\n");
  const runs: TextRun[] = [];
  parts.forEach((part, i) => {
    if (part) runs.push({ text: part });
    if (i < parts.length - 1) runs.push({ text: "\n" });
  });
  return runs;
}

export function resolveTextRuns(block: LinkBlock): TextRun[] {
  return block.textRuns ?? (block.title ? plainTextToRuns(block.title) : []);
}

export function textRunsAreEmpty(runs: TextRun[]): boolean {
  return !runs.some((r) => r.text !== "\n" && r.text.trim().length > 0);
}

const STORAGE_KEY = "linqo_profile_v2";

export const defaultProfile: Profile = {
  slug: "yourname",
  name: "yourname",
  bio: "A few words about yourself\nand your project ✨",
  avatar: "",
  cover: "",
  theme: "dark",
  blocks: [],
  templateId: "standard",
};

export function normalizeProfile(raw: unknown): Profile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Profile>;
  return {
    slug: typeof r.slug === "string" ? r.slug : defaultProfile.slug,
    name: typeof r.name === "string" ? r.name : defaultProfile.name,
    bio: typeof r.bio === "string" ? r.bio : defaultProfile.bio,
    avatar: typeof r.avatar === "string" ? r.avatar : defaultProfile.avatar,
    avatarName: typeof r.avatarName === "string" ? r.avatarName : undefined,
    cover: typeof r.cover === "string" ? r.cover : defaultProfile.cover,
    coverName: typeof r.coverName === "string" ? r.coverName : undefined,
    coverType: r.coverType === "color" ? "color" : "image",
    coverStyle:
      typeof r.coverStyle === "string" && r.coverStyle in BANNER_STYLES ? r.coverStyle : undefined,
    theme: typeof r.theme === "string" && r.theme in THEMES ? r.theme : defaultProfile.theme,
    accentColor: typeof r.accentColor === "string" ? r.accentColor : undefined,
    bgImage: typeof r.bgImage === "string" ? r.bgImage : undefined,
    bgImageName: typeof r.bgImageName === "string" ? r.bgImageName : undefined,
    bgType: r.bgType === "color" ? "color" : "image",
    bgStyle: typeof r.bgStyle === "string" && r.bgStyle in BANNER_STYLES ? r.bgStyle : undefined,
    effects:
      r.effects && typeof r.effects === "object" ? (r.effects as EffectsSettings) : undefined,
    music: r.music && typeof r.music === "object" ? (r.music as MusicSettings) : undefined,
    ambient:
      r.ambient && typeof r.ambient === "object" ? (r.ambient as AmbientSettings) : undefined,
    particles:
      r.particles && typeof r.particles === "object"
        ? (r.particles as ParticleSettings)
        : undefined,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : undefined,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : undefined,
    ogImage: typeof r.ogImage === "string" ? r.ogImage : undefined,
    ogImageName: typeof r.ogImageName === "string" ? r.ogImageName : undefined,
    blocks: Array.isArray(r.blocks) ? r.blocks : defaultProfile.blocks,
    templateId: typeof r.templateId === "string" ? r.templateId : defaultProfile.templateId,
  };
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function encodeProfile(p: Profile): string {
  const json = JSON.stringify(p);
  // Plain percent-encoding instead of base64: the JSON already contains
  // base64 image data, so re-encoding the whole thing as base64 on top
  // just adds another ~33% size for no reason — that extra bulk is what
  // was pushing shared links (and mobile clipboards) over their limits.
  return encodeURIComponent(json);
}

export function decodeProfile(s: string): Profile | null {
  try {
    const json = decodeURIComponent(s);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") return normalizeProfile(parsed);
  } catch {
    // fall through — may be a link shared before this encoding changed
  }
  try {
    const json = decodeURIComponent(escape(atob(s)));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeProfile(parsed);
  } catch {
    return null;
  }
}

// What an image field should show: the uploaded file's own name, or an
// upload's fallback label if we don't have one — never the raw data URL,
// which is just noise to a human and can be megabytes long.
export function imageFieldDisplay(value: string, name?: string): string {
  if (value.startsWith("data:")) return name || "Uploaded image";
  return value;
}

export function mailtoHref(value: string): string {
  if (!value) return "#";
  return value.startsWith("mailto:") ? value : `mailto:${value}`;
}

export function telHref(value: string): string {
  if (!value) return "#";
  if (value.startsWith("tel:")) return value;
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
