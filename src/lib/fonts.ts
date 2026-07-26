export type HeadingFontCategory = "sans" | "serif" | "display" | "mono";

export interface HeadingFont {
  key: string;
  label: string;
  family: string;
  category: HeadingFontCategory;
  // Google Fonts css2 "family=" query value. Empty for the app's own default,
  // which is already loaded globally via the @import in styles.css.
  googleFamily: string;
}

export const HEADING_FONTS: HeadingFont[] = [
  {
    key: "default",
    label: "Theme default",
    family: "var(--font-heading)",
    category: "sans",
    googleFamily: "",
  },
  {
    key: "dm-sans",
    label: "DM Sans",
    family: '"DM Sans", sans-serif',
    category: "sans",
    googleFamily: "",
  },
  {
    key: "sora",
    label: "Sora",
    family: '"Sora", sans-serif',
    category: "sans",
    googleFamily: "Sora:wght@600;700;800",
  },
  {
    key: "outfit",
    label: "Outfit",
    family: '"Outfit", sans-serif',
    category: "sans",
    googleFamily: "Outfit:wght@600;700;800",
  },
  {
    key: "manrope",
    label: "Manrope",
    family: '"Manrope", sans-serif',
    category: "sans",
    googleFamily: "Manrope:wght@600;700;800",
  },
  {
    key: "epilogue",
    label: "Epilogue",
    family: '"Epilogue", sans-serif',
    category: "sans",
    googleFamily: "Epilogue:wght@600;700;800",
  },
  {
    key: "urbanist",
    label: "Urbanist",
    family: '"Urbanist", sans-serif',
    category: "sans",
    googleFamily: "Urbanist:wght@600;700;800",
  },
  {
    key: "plus-jakarta",
    label: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans", sans-serif',
    category: "sans",
    googleFamily: "Plus+Jakarta+Sans:wght@600;700;800",
  },
  {
    key: "playfair",
    label: "Playfair Display",
    family: '"Playfair Display", serif',
    category: "serif",
    googleFamily: "Playfair+Display:wght@600;700;800",
  },
  {
    key: "fraunces",
    label: "Fraunces",
    family: '"Fraunces", serif',
    category: "serif",
    googleFamily: "Fraunces:opsz,wght@9..144,600..700",
  },
  {
    key: "cormorant",
    label: "Cormorant Garamond",
    family: '"Cormorant Garamond", serif',
    category: "serif",
    googleFamily: "Cormorant+Garamond:wght@600;700",
  },
  {
    key: "instrument-serif",
    label: "Instrument Serif",
    family: '"Instrument Serif", serif',
    category: "serif",
    googleFamily: "Instrument+Serif",
  },
  {
    key: "spectral",
    label: "Spectral",
    family: '"Spectral", serif',
    category: "serif",
    googleFamily: "Spectral:wght@600;700",
  },
  {
    key: "libre-caslon",
    label: "Libre Caslon Text",
    family: '"Libre Caslon Text", serif',
    category: "serif",
    googleFamily: "Libre+Caslon+Text:wght@700",
  },
  {
    key: "bricolage",
    label: "Bricolage Grotesque",
    family: '"Bricolage Grotesque", sans-serif',
    category: "display",
    googleFamily: "Bricolage+Grotesque:wght@600..800",
  },
  {
    key: "unbounded",
    label: "Unbounded",
    family: '"Unbounded", sans-serif',
    category: "display",
    googleFamily: "Unbounded:wght@600;700;800",
  },
  {
    key: "syne",
    label: "Syne",
    family: '"Syne", sans-serif',
    category: "display",
    googleFamily: "Syne:wght@600;700;800",
  },
  {
    key: "bebas-neue",
    label: "Bebas Neue",
    family: '"Bebas Neue", sans-serif',
    category: "display",
    googleFamily: "Bebas+Neue",
  },
  {
    key: "archivo-black",
    label: "Archivo Black",
    family: '"Archivo Black", sans-serif',
    category: "display",
    googleFamily: "Archivo+Black",
  },
  {
    key: "jetbrains-mono",
    label: "JetBrains Mono",
    family: '"JetBrains Mono", monospace',
    category: "mono",
    googleFamily: "JetBrains+Mono:wght@600;700",
  },
  {
    key: "ibm-plex-mono",
    label: "IBM Plex Mono",
    family: '"IBM Plex Mono", monospace',
    category: "mono",
    googleFamily: "IBM+Plex+Mono:wght@600;700",
  },
];

export const HEADING_FONT_CATEGORY_LABEL: Record<HeadingFontCategory, string> = {
  sans: "Sans",
  serif: "Serif",
  display: "Display",
  mono: "Mono",
};

export function getHeadingFont(key: string | undefined): HeadingFont {
  return HEADING_FONTS.find((f) => f.key === (key ?? "default")) ?? HEADING_FONTS[0];
}

const loadedFontKeys = new Set<string>();

// Injects a single Google Fonts stylesheet link for one font, idempotently.
// Used on the live/published page, which only ever needs the one font a
// heading actually picked.
export function loadGoogleFont(key: string) {
  if (typeof document === "undefined" || loadedFontKeys.has(key)) return;
  const font = HEADING_FONTS.find((f) => f.key === key);
  loadedFontKeys.add(key);
  if (!font || !font.googleFamily) return;
  const id = `heading-font-${font.key}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFamily}&display=swap`;
  document.head.appendChild(link);
}

// Loads every curated font at once, as a single request — used only by the
// font picker popover, so its previews render in their real typefaces.
export function loadAllHeadingFonts() {
  if (typeof document === "undefined") return;
  const id = "heading-fonts-all";
  if (document.getElementById(id)) return;
  const families = HEADING_FONTS.filter((f) => f.googleFamily)
    .map((f) => `family=${f.googleFamily}`)
    .join("&");
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
  HEADING_FONTS.forEach((f) => loadedFontKeys.add(f.key));
}
