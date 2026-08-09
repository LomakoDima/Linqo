import type { ThemeName } from "@/lib/link-store";

// Purely presentational — never stored on Profile. profile.theme only ever
// holds the real ThemeName key; this is what turns that key into something
// browsable (search, filter chips, featured row) in the Theme Library.
export type ThemeCategory =
  "Minimal" | "Dark" | "Gradient" | "Nature" | "Creative" | "Business" | "Seasonal";

export interface ThemeMeta {
  emoji: string;
  tagline: string;
  categories: ThemeCategory[];
  featured?: boolean;
}

// The user's brief named 5 example themes (Inferno, Ocean, Forest, Midnight,
// Sakura) that aren't literal ThemeName keys — mapped onto the closest real
// theme rather than renaming stored keys, which would break already-saved
// profiles: 🔥 Inferno -> wildfire, 🌊 Ocean -> ocean, 🌲 Forest -> forest,
// 🌌 Midnight -> dark (already labeled "Midnight" in THEMES), 🌸 Sakura -> blush.
export const THEME_META: Record<ThemeName, ThemeMeta> = {
  dark: {
    emoji: "🌌",
    tagline: "Minimal • Professional",
    categories: ["Minimal", "Dark", "Business"],
    featured: true,
  },
  light: { emoji: "📄", tagline: "Crisp • Timeless", categories: ["Minimal", "Business"] },
  sunset: { emoji: "🌅", tagline: "Warm • Nostalgic", categories: ["Gradient", "Creative"] },
  ocean: {
    emoji: "🌊",
    tagline: "Clean • Calm",
    categories: ["Gradient", "Nature"],
    featured: true,
  },
  forest: {
    emoji: "🌲",
    tagline: "Natural • Organic",
    categories: ["Gradient", "Nature"],
    featured: true,
  },
  aurora: { emoji: "🌠", tagline: "Ethereal • Dreamy", categories: ["Gradient", "Creative"] },
  candy: { emoji: "🍬", tagline: "Playful • Vivid", categories: ["Gradient", "Creative"] },
  slate: {
    emoji: "🪨",
    tagline: "Cool • Understated",
    categories: ["Minimal", "Dark", "Business"],
  },
  blush: {
    emoji: "🌸",
    tagline: "Soft • Elegant",
    categories: ["Minimal", "Creative"],
    featured: true,
  },
  lavender: { emoji: "🪻", tagline: "Gentle • Refined", categories: ["Gradient", "Creative"] },
  citrus: {
    emoji: "🍊",
    tagline: "Zesty • Energetic",
    categories: ["Gradient", "Creative", "Seasonal"],
  },
  mint: { emoji: "🌿", tagline: "Fresh • Light", categories: ["Minimal", "Nature"] },
  noir: { emoji: "🖤", tagline: "Stark • Bold", categories: ["Dark", "Minimal"] },
  charcoal: { emoji: "⚫", tagline: "Muted • Grounded", categories: ["Dark", "Business"] },
  cream: { emoji: "🥐", tagline: "Warm • Inviting", categories: ["Minimal", "Business"] },
  navy: { emoji: "⚓", tagline: "Trusted • Classic", categories: ["Dark", "Business"] },
  sage: { emoji: "🍃", tagline: "Earthy • Balanced", categories: ["Minimal", "Nature"] },
  plum: { emoji: "🍇", tagline: "Rich • Moody", categories: ["Dark", "Creative"] },
  tan: { emoji: "🏜️", tagline: "Grounded • Warm", categories: ["Minimal", "Nature"] },
  steel: { emoji: "🔩", tagline: "Modern • Industrial", categories: ["Dark", "Business"] },
  peach: { emoji: "🍑", tagline: "Sweet • Sunlit", categories: ["Gradient", "Seasonal"] },
  grape: { emoji: "🍷", tagline: "Deep • Dramatic", categories: ["Dark", "Creative"] },
  arctic: { emoji: "❄️", tagline: "Crisp • Icy", categories: ["Gradient", "Nature", "Seasonal"] },
  wildfire: {
    emoji: "🔥",
    tagline: "Bold • Dramatic",
    categories: ["Gradient", "Dark"],
    featured: true,
  },
  twilight: {
    emoji: "🌆",
    tagline: "Moody • Cinematic",
    categories: ["Gradient", "Dark", "Creative"],
  },
};

export const THEME_CATEGORIES: ThemeCategory[] = [
  "Minimal",
  "Dark",
  "Gradient",
  "Nature",
  "Creative",
  "Business",
  "Seasonal",
];
