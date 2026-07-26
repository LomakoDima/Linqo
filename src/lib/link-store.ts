export type LinkBlockType = "link" | "banner" | "header" | "social" | "contact" | "image" | "text";

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
  bannerStyle?: BannerStyle;
  // When true, the fields below replace bannerStyle entirely with a
  // hand-picked color or gradient instead of one of the curated presets.
  bannerUseCustomColor?: boolean;
  bannerCustomUseGradient?: boolean;
  bannerCustomColor?: string;
  bannerCustomGradientFrom?: string;
  bannerCustomGradientTo?: string;
  bannerPattern?: BannerPattern;
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

export interface MusicSettings {
  enabled: boolean;
  genre?: MusicGenre;
  // A URL to the track — either pasted in directly, or filled in after an
  // upload (see uploadMusicTrack in lib/publish.ts, which stores the file as
  // its own Blob object rather than embedding it in the profile JSON, since
  // that JSON has a ~400KB budget an audio file would blow straight through).
  url?: string;
  loop?: boolean;
  volume?: number;
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
  // Optional photo layered behind the theme's colors/gradient as the page
  // background, scrimmed for text contrast. Independent of `theme` itself so
  // any theme's palette (card/text/accent colors) still applies on top of it.
  bgImage?: string;
  bgImageName?: string;
  music?: MusicSettings;
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
  },
  light: {
    label: "Paper",
    kind: "solid",
    bg: "bg-[#f6f4ef] text-neutral-900",
    card: "bg-white hover:bg-neutral-50 border border-neutral-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-neutral-500",
    accent: "text-orange-600",
  },
  sunset: {
    label: "Sunset",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#2a0a0a] via-[#3b0f05] to-[#1a0505] text-white",
    card: "bg-gradient-to-r from-orange-600/30 to-red-700/30 hover:from-orange-600/40 hover:to-red-700/40 border border-orange-500/30",
    text: "text-white",
    muted: "text-orange-100/70",
    accent: "text-orange-300",
  },
  ocean: {
    label: "Ocean",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#031b2f] via-[#062a45] to-[#01111d] text-white",
    card: "bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30",
    text: "text-white",
    muted: "text-cyan-100/70",
    accent: "text-cyan-300",
  },
  forest: {
    label: "Forest",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#0a1f14] via-[#0f2d1c] to-[#04120a] text-white",
    text: "text-white",
    card: "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30",
    muted: "text-emerald-100/70",
    accent: "text-emerald-300",
  },
  aurora: {
    label: "Aurora",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#052e2b] via-[#0a3d55] to-[#1a0a3d] text-white",
    card: "bg-teal-400/10 hover:bg-teal-400/20 border border-teal-300/30",
    text: "text-white",
    muted: "text-teal-100/70",
    accent: "text-teal-300",
  },
  candy: {
    label: "Candy",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#3a0a2e] via-[#5a1050] to-[#1a0a2e] text-white",
    card: "bg-pink-400/10 hover:bg-pink-400/20 border border-pink-300/30",
    text: "text-white",
    muted: "text-pink-100/70",
    accent: "text-pink-300",
  },
  slate: {
    label: "Slate",
    kind: "solid",
    bg: "bg-[#1b2430] text-white",
    card: "bg-white/5 hover:bg-white/10 border border-white/10",
    text: "text-white",
    muted: "text-slate-300/70",
    accent: "text-sky-400",
  },
  blush: {
    label: "Blush",
    kind: "solid",
    bg: "bg-[#fdf1f3] text-neutral-900",
    card: "bg-white hover:bg-rose-50 border border-rose-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-rose-500/70",
    accent: "text-rose-600",
  },
  lavender: {
    label: "Lavender",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#efeaff] via-[#e4dbfb] to-[#d9cdf7] text-neutral-900",
    card: "bg-white/70 hover:bg-white/90 border border-purple-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-purple-700/60",
    accent: "text-purple-600",
  },
  citrus: {
    label: "Citrus",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#3a1f02] via-[#5a3405] to-[#2a1601] text-white",
    card: "bg-amber-400/10 hover:bg-amber-400/20 border border-amber-300/30",
    text: "text-white",
    muted: "text-amber-100/70",
    accent: "text-amber-300",
  },
  mint: {
    label: "Mint",
    kind: "solid",
    bg: "bg-[#eefaf3] text-neutral-900",
    card: "bg-white hover:bg-emerald-50 border border-emerald-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-emerald-600/70",
    accent: "text-emerald-600",
  },
  noir: {
    label: "Noir",
    kind: "solid",
    bg: "bg-black text-white",
    card: "bg-white/10 hover:bg-white/20 border border-white/20",
    text: "text-white",
    muted: "text-white/50",
    accent: "text-white",
  },
  charcoal: {
    label: "Charcoal",
    kind: "solid",
    bg: "bg-[#2b2b2b] text-white",
    card: "bg-white/5 hover:bg-white/10 border border-white/10",
    text: "text-white",
    muted: "text-white/55",
    accent: "text-orange-300",
  },
  cream: {
    label: "Cream",
    kind: "solid",
    bg: "bg-[#faf6ec] text-neutral-900",
    card: "bg-white hover:bg-neutral-50 border border-neutral-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-neutral-500",
    accent: "text-amber-600",
  },
  navy: {
    label: "Navy",
    kind: "solid",
    bg: "bg-[#0d1b2a] text-white",
    card: "bg-blue-400/10 hover:bg-blue-400/20 border border-blue-300/25",
    text: "text-white",
    muted: "text-blue-100/70",
    accent: "text-blue-300",
  },
  sage: {
    label: "Sage",
    kind: "solid",
    bg: "bg-[#eef1e8] text-neutral-900",
    card: "bg-white hover:bg-green-50 border border-green-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-green-700/60",
    accent: "text-green-700",
  },
  plum: {
    label: "Plum",
    kind: "solid",
    bg: "bg-[#2a1030] text-white",
    card: "bg-fuchsia-400/10 hover:bg-fuchsia-400/20 border border-fuchsia-300/25",
    text: "text-white",
    muted: "text-fuchsia-100/70",
    accent: "text-fuchsia-300",
  },
  tan: {
    label: "Tan",
    kind: "solid",
    bg: "bg-[#e8dcc8] text-neutral-900",
    card: "bg-white hover:bg-amber-50 border border-amber-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-amber-800/60",
    accent: "text-amber-800",
  },
  steel: {
    label: "Steel",
    kind: "solid",
    bg: "bg-[#3a4550] text-white",
    card: "bg-white/10 hover:bg-white/15 border border-white/15",
    text: "text-white",
    muted: "text-slate-200/70",
    accent: "text-cyan-300",
  },
  peach: {
    label: "Peach",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#ffe8d6] via-[#ffd3b0] to-[#ffb98a] text-neutral-900",
    card: "bg-white/70 hover:bg-white/90 border border-orange-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-orange-700/60",
    accent: "text-orange-600",
  },
  grape: {
    label: "Grape",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#1f0a2e] via-[#3a1050] to-[#150620] text-white",
    card: "bg-purple-400/10 hover:bg-purple-400/20 border border-purple-300/30",
    text: "text-white",
    muted: "text-purple-100/70",
    accent: "text-purple-300",
  },
  arctic: {
    label: "Arctic",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#e8f4f8] via-[#d0e8f0] to-[#b8dce8] text-neutral-900",
    card: "bg-white/70 hover:bg-white/90 border border-sky-200 shadow-sm",
    text: "text-neutral-900",
    muted: "text-sky-700/60",
    accent: "text-sky-600",
  },
  wildfire: {
    label: "Wildfire",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#3a0505] via-[#7a1f05] to-[#2a0a02] text-white",
    card: "bg-red-500/10 hover:bg-red-500/20 border border-red-400/30",
    text: "text-white",
    muted: "text-red-100/70",
    accent: "text-red-300",
  },
  twilight: {
    label: "Twilight",
    kind: "gradient",
    bg: "bg-gradient-to-b from-[#0a1030] via-[#2a1550] to-[#3a1030] text-white",
    card: "bg-indigo-400/10 hover:bg-indigo-400/20 border border-indigo-300/30",
    text: "text-white",
    muted: "text-indigo-100/70",
    accent: "text-indigo-300",
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

// A vibe picker, not a song catalog — there's nowhere for this app to host
// actual tracks (see MusicSettings.url), so each genre is just a premium-
// looking banner + label the profile owner picks to tag their own link.
// `image`, where set, replaces the gradient+icon+label with an illustrated
// banner (its own label/blurb already baked into the artwork).
export const MUSIC_GENRES: Record<
  MusicGenre,
  { label: string; blurb: string; gradient: string; ring: string; light: boolean; image?: string }
> = {
  lofi: {
    label: "Lo-fi",
    blurb: "Dusty beats to study to",
    gradient: "bg-[linear-gradient(135deg,#8b5e3c,#3b2a4a)]",
    ring: "ring-1 ring-amber-700/30",
    light: false,
    image: "/banners/lofi.jpg",
  },
  chill: {
    label: "Chill",
    blurb: "Laid-back and breezy",
    gradient: "bg-[linear-gradient(135deg,#0ea5e9,#1e293b)]",
    ring: "ring-1 ring-sky-400/30",
    light: false,
    image: "/banners/chill.jpg",
  },
  relax: {
    label: "Relax",
    blurb: "Slow down, breathe",
    gradient: "bg-[linear-gradient(135deg,#5eead4,#3b82f6)]",
    ring: "ring-1 ring-teal-300/30",
    light: false,
    image: "/banners/relax.jpg",
  },
  focus: {
    label: "Focus",
    blurb: "Deep work, no distractions",
    gradient: "bg-[linear-gradient(135deg,#4338ca,#1e1b4b)]",
    ring: "ring-1 ring-indigo-400/30",
    light: false,
    image: "/banners/focus.jpg",
  },
  jazz: {
    label: "Jazz",
    blurb: "Smooth and soulful",
    gradient: "bg-[linear-gradient(135deg,#b45309,#450a0a)]",
    ring: "ring-1 ring-amber-600/30",
    light: false,
    image: "/banners/jazz.jpg",
  },
  ambient: {
    label: "Ambient",
    blurb: "Atmospheric and spacious",
    gradient: "bg-[linear-gradient(135deg,#134e4a,#020617)]",
    ring: "ring-1 ring-teal-500/20",
    light: false,
    image: "/banners/ambient.jpg",
  },
  piano: {
    label: "Piano",
    blurb: "Soft keys, gentle mood",
    gradient: "bg-[linear-gradient(135deg,#e5e7eb,#6b7280)]",
    ring: "ring-1 ring-neutral-900/15",
    light: true,
    image: "/banners/piano.jpg",
  },
  synthwave: {
    label: "Synthwave",
    blurb: "Neon-lit retro energy",
    gradient: "bg-[linear-gradient(135deg,#f472b6,#7c3aed)]",
    ring: "ring-1 ring-pink-400/30",
    light: false,
    image: "/banners/synthwave.jpg",
  },
  acoustic: {
    label: "Acoustic",
    blurb: "Warm strings, unplugged",
    gradient: "bg-[linear-gradient(135deg,#f59e0b,#78350f)]",
    ring: "ring-1 ring-orange-500/30",
    light: false,
    image: "/banners/acoustic.jpg",
  },
  upbeat: {
    label: "Upbeat",
    blurb: "Energetic and bright",
    gradient: "bg-[linear-gradient(135deg,#fb923c,#ec4899)]",
    ring: "ring-1 ring-pink-400/30",
    light: false,
    image: "/banners/upbeat.jpg",
  },
};

// Geometric line-art motifs available to every banner color equally — pattern
// and color are independent choices, not paired presets. Each motif is a bare
// shape (no stroke color baked in) so `bannerPatternUrl` can tint it to
// contrast correctly against whichever color it's paired with.
const PATTERN_SHAPES: Record<
  Exclude<BannerPattern, "none">,
  { label: string; w: number; h: number; inner: string }
> = {
  honeycomb: {
    label: "Honeycomb",
    w: 84,
    h: 96,
    inner:
      "<path d='M42 2 l40 23 v46 l-40 23 l-40 -23 v-46 z'/><path d='M42 26 l20 11 v22 l-20 11 l-20 -11 v-22 z'/>",
  },
  spikes: {
    label: "Spikes",
    w: 60,
    h: 40,
    inner:
      "<path d='M0 40 L10 20 L20 40'/><path d='M20 40 L30 20 L40 40'/><path d='M40 40 L50 20 L60 40'/><path d='M-10 20 L0 0 L10 20'/><path d='M30 20 L40 0 L50 20'/>",
  },
  dots: {
    label: "Dots",
    w: 40,
    h: 40,
    inner:
      "<circle cx='6' cy='6' r='2'/><circle cx='20' cy='6' r='2'/><circle cx='34' cy='6' r='2'/><circle cx='13' cy='20' r='2'/><circle cx='27' cy='20' r='2'/><circle cx='6' cy='34' r='2'/><circle cx='20' cy='34' r='2'/><circle cx='34' cy='34' r='2'/>",
  },
  stars: {
    label: "Stars",
    w: 90,
    h: 90,
    inner:
      "<path d='M15 10 L17 16 L23 16 L18 20 L20 26 L15 22 L10 26 L12 20 L7 16 L13 16 Z'/><path d='M65 25 L66 29 L70 29 L67 32 L68 36 L65 33 L62 36 L63 32 L60 29 L64 29 Z'/><path d='M40 55 L42 61 L48 61 L43 65 L45 71 L40 67 L35 71 L37 65 L32 61 L38 61 Z'/><circle cx='75' cy='70' r='1.5'/><circle cx='25' cy='75' r='1.5'/><circle cx='55' cy='15' r='1.5'/>",
  },
  dunes: {
    label: "Dunes",
    w: 100,
    h: 40,
    inner: "<path d='M0 10 Q25 0 50 10 T100 10'/><path d='M0 25 Q25 15 50 25 T100 25'/>",
  },
  diamonds: {
    label: "Diamonds",
    w: 50,
    h: 50,
    inner:
      "<path d='M12 0 L24 12 L12 24 L0 12 Z'/><path d='M37 0 L49 12 L37 24 L25 12 Z'/><path d='M12 25 L24 37 L12 49 L0 37 Z'/><path d='M37 25 L49 37 L37 49 L25 37 Z'/>",
  },
  chevron: {
    label: "Chevron",
    w: 60,
    h: 30,
    inner:
      "<path d='M0 10 L15 0 L30 10 L45 0 L60 10'/><path d='M0 25 L15 15 L30 25 L45 15 L60 25'/>",
  },
  ripples: {
    label: "Ripples",
    w: 70,
    h: 70,
    inner:
      "<circle cx='20' cy='20' r='6'/><circle cx='20' cy='20' r='12'/><circle cx='55' cy='45' r='6'/><circle cx='55' cy='45' r='12'/>",
  },
  sparkle: {
    label: "Sparkle",
    w: 60,
    h: 60,
    inner:
      "<path d='M15 5 L17 13 L25 15 L17 17 L15 25 L13 17 L5 15 L13 13 Z'/><path d='M45 30 L46.5 36 L52 37.5 L46.5 39 L45 45 L43.5 39 L38 37.5 L43.5 36 Z'/>",
  },
  trees: {
    label: "Trees",
    w: 50,
    h: 60,
    inner:
      "<path d='M10 10 L18 25 L2 25 Z'/><path d='M10 20 L20 38 L0 38 Z'/><path d='M35 5 L42 18 L28 18 Z'/><path d='M35 15 L44 30 L26 30 Z'/>",
  },
  bolts: {
    label: "Bolts",
    w: 50,
    h: 70,
    inner: "<path d='M20 5 L10 30 L20 30 L8 55'/><path d='M40 15 L33 35 L41 35 L30 60'/>",
  },
  coral: {
    label: "Coral",
    w: 60,
    h: 60,
    inner:
      "<path d='M15 5 L15 25 M5 15 L25 15'/><path d='M45 30 L45 50 M35 40 L55 40'/><path d='M15 45 L15 55 M10 50 L20 50'/>",
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

// Builds the pattern's SVG data URI, tinted dark-on-light or light-on-dark so
// it stays visible no matter which banner color it's paired with. Returns ""
// for "none" — a solid color banner with no pattern overlay.
export function bannerPatternUrl(name: BannerPattern, light: boolean): string {
  if (name === "none") return "";
  const shape = PATTERN_SHAPES[name];
  const color = light ? "%23000000" : "%23ffffff";
  const opacity = light ? 0.25 : 0.22;
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${shape.w}' height='${shape.h}' viewBox='0 0 ${shape.w} ${shape.h}'><g fill='none' stroke='${color}' stroke-opacity='${opacity}' stroke-width='1.3'>${shape.inner}</g></svg>")`;
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
    bgImage: typeof r.bgImage === "string" ? r.bgImage : undefined,
    bgImageName: typeof r.bgImageName === "string" ? r.bgImageName : undefined,
    music: r.music && typeof r.music === "object" ? (r.music as MusicSettings) : undefined,
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
