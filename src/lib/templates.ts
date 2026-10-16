import { uid, type LinkBlock, type Profile, type ThemeName } from "./link-store";

export type TemplateCategory =
  "personal" | "creator" | "portfolio" | "business" | "developer" | "artist" | "student";

// Display order for every category chip in the filter bar — "All" is
// prepended by the component itself, not stored here.
export const TEMPLATE_CATEGORY_ORDER: TemplateCategory[] = [
  "personal",
  "creator",
  "portfolio",
  "business",
  "developer",
  "artist",
  "student",
];

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string }> = {
  personal: { label: "Personal" },
  creator: { label: "Creator" },
  portfolio: { label: "Portfolio" },
  business: { label: "Business" },
  developer: { label: "Developer" },
  artist: { label: "Artist" },
  student: { label: "Student" },
};

// Used sparingly — see TEMPLATES below, most templates carry none.
export type TemplateBadgeKind = "popular" | "new" | "featured" | "minimal" | "creator-pick";

export const TEMPLATE_BADGE_LABEL: Record<TemplateBadgeKind, string> = {
  popular: "Popular",
  new: "New",
  featured: "Featured",
  minimal: "Minimal",
  "creator-pick": "Creator Pick",
};

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  // Short personality line under the name — "Bold • Social" — the thing
  // that differentiates templates beyond color, alongside their actual
  // block arrangement below.
  tagline: string;
  description: string;
  theme: ThemeName;
  blocks: Omit<LinkBlock, "id">[];
  badges?: TemplateBadgeKind[];
  // Shown in the Featured row up top. Keep this to 2-3 templates total.
  featured?: boolean;
  // The one "start from scratch" template — gets its own empty-canvas
  // preview treatment instead of rendering a blank LinkPreview.
  blank?: boolean;
  // 0-100, drives the "Popular" sort.
  popularity: number;
  // ISO date, drives the "Newest" sort.
  createdAt: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "creator",
    name: "Creator",
    category: "creator",
    tagline: "Bold • Social",
    description: "Socials up front, a big banner for your latest drop, and a bold display heading.",
    theme: "sunset",
    featured: true,
    badges: ["popular"],
    popularity: 97,
    createdAt: "2024-01-10",
    blocks: [
      {
        type: "social",
        socials: [
          { kind: "instagram", url: "" },
          { kind: "youtube", url: "" },
          { kind: "tiktok", url: "" },
        ],
      },
      {
        type: "header",
        title: "New this week",
        headingFont: "unbounded",
        headingSize: "sm",
        headingUppercase: true,
        headingBold: true,
      },
      {
        type: "banner",
        title: "Watch the latest upload",
        subtitle: "New video every Tuesday",
        url: "https://",
        bannerStyle: "ember",
        bannerPattern: "sparkle",
        tall: true,
      },
      {
        type: "text",
        title: "Behind-the-scenes clips, drops, and the odd unhinged livestream — all here first.",
        textFont: "outfit",
        textAlign: "center",
        textColor: "#fdba9d",
      },
      { type: "link", title: "Subscribe on YouTube", url: "https://" },
      { type: "link", title: "Shop the merch drop", url: "https://" },
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    category: "portfolio",
    tagline: "Focused • Editorial",
    description: "A restrained case-study layout with a vertical feature and a mono-styled label.",
    theme: "slate",
    featured: true,
    badges: ["creator-pick"],
    popularity: 91,
    createdAt: "2024-01-10",
    blocks: [
      {
        type: "header",
        title: "Selected work",
        headingFont: "ibm-plex-mono",
        headingSize: "sm",
        headingUppercase: true,
        headingColor: "#7dd3fc",
      },
      {
        type: "text",
        title:
          "Product designer. I build interfaces for teams that ship fast and still sweat the details.",
        textFont: "manrope",
        textSize: "md",
      },
      {
        type: "banner",
        title: "Featured project",
        subtitle: "Case study — read the breakdown",
        url: "https://",
        bannerStyle: "midnight",
        bannerLayout: "vertical",
        bannerPattern: "none",
        tall: true,
      },
      { type: "image", image: "", url: "https://", imageShape: "landscape" },
      { type: "link", title: "View the full portfolio", url: "https://" },
      { type: "link", title: "Download my résumé", url: "https://" },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "musician",
    name: "Musician",
    category: "artist",
    tagline: "Expressive • Sonic",
    description:
      "A tall release banner under a serif wordmark, then streaming links and tour dates.",
    theme: "grape",
    featured: true,
    popularity: 78,
    createdAt: "2024-02-14",
    blocks: [
      {
        type: "header",
        title: "New single out now",
        headingFont: "fraunces",
        headingSize: "lg",
        headingUseGradient: true,
        headingGradientFrom: "#e9d5ff",
        headingGradientTo: "#f0abfc",
        headingUppercase: false,
      },
      {
        type: "banner",
        title: "Stream it everywhere",
        subtitle: "Recorded in analog, mixed at 2am",
        url: "https://",
        bannerStyle: "violet",
        bannerPattern: "stars",
        tall: true,
      },
      { type: "link", title: "Listen on Spotify", url: "https://" },
      { type: "link", title: "Listen on Apple Music", url: "https://" },
      { type: "link", title: "Tour dates & tickets", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "spotify", url: "" },
          { kind: "instagram", url: "" },
          { kind: "youtube", url: "" },
        ],
      },
    ],
  },
  {
    id: "business",
    name: "Business",
    category: "business",
    tagline: "Clean • Professional",
    description: "Clean and simple — a services header, booking link, pricing, and contact info.",
    theme: "light",
    badges: ["popular"],
    popularity: 86,
    createdAt: "2024-01-10",
    blocks: [
      {
        type: "header",
        title: "Services",
        headingFont: "manrope",
        headingSize: "sm",
        headingBold: true,
      },
      {
        type: "text",
        title:
          "Straightforward help, no jargon. Tell me what you're stuck on and I'll tell you if I can fix it.",
        textFont: "manrope",
        textSize: "sm",
      },
      { type: "link", title: "Book a 30-minute call", url: "https://" },
      { type: "link", title: "See pricing & packages", url: "https://" },
      { type: "link", title: "Read client reviews", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "linkedin", url: "" },
          { kind: "website", url: "" },
        ],
      },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "standard",
    name: "Blank Canvas",
    category: "personal",
    tagline: "Minimal • Flexible",
    description: "Start with nothing. Build your page your way.",
    theme: "dark",
    blank: true,
    popularity: 58,
    createdAt: "2024-01-10",
    blocks: [],
  },
  {
    id: "minimal",
    name: "Minimal",
    category: "personal",
    tagline: "Simple • Essential",
    description: "Just the essentials — a short list of links, nothing else.",
    theme: "noir",
    badges: ["minimal"],
    popularity: 74,
    createdAt: "2024-01-10",
    blocks: [
      { type: "link", title: "My website", url: "https://" },
      { type: "link", title: "Newsletter", url: "https://" },
      { type: "link", title: "Say hello", url: "https://" },
    ],
  },
  {
    id: "photographer",
    name: "Photographer",
    category: "artist",
    tagline: "Expressive • Visual",
    description: "An airy gallery layout for recent work, a booking link, and contact info.",
    theme: "arctic",
    popularity: 70,
    createdAt: "2024-02-14",
    blocks: [
      {
        type: "header",
        title: "Recent work",
        headingFont: "urbanist",
        headingSize: "sm",
        headingColor: "#0369a1",
      },
      { type: "image", image: "", url: "https://", imageShape: "landscape" },
      { type: "image", image: "", url: "https://", imageShape: "square" },
      {
        type: "text",
        title: "Available for weddings, portraits, and editorial bookings — worldwide.",
        textFont: "urbanist",
        textAlign: "center",
        textSize: "sm",
      },
      { type: "link", title: "Book a session", url: "https://" },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "streamer",
    name: "Streamer",
    category: "creator",
    tagline: "Live • Energetic",
    description: "A go-live banner under a mono-tag heading, socials, and support links.",
    theme: "twilight",
    popularity: 66,
    createdAt: "2024-02-14",
    blocks: [
      {
        type: "header",
        title: "Live on Twitch",
        headingFont: "jetbrains-mono",
        headingSize: "sm",
        headingUppercase: true,
        headingColor: "#c4b5fd",
      },
      {
        type: "banner",
        title: "Streaming most nights",
        subtitle: "Chat's always open — pull up",
        url: "https://",
        bannerStyle: "storm",
        bannerPattern: "bolts",
      },
      {
        type: "social",
        socials: [
          { kind: "twitch", url: "" },
          { kind: "discord", url: "" },
          { kind: "twitter", url: "" },
        ],
      },
      { type: "link", title: "Support the stream", url: "https://" },
      { type: "link", title: "Stream schedule", url: "https://" },
    ],
  },
  {
    id: "podcast",
    name: "Podcast",
    category: "creator",
    tagline: "Editorial • Consistent",
    description: "An editorial new-episode banner, listening links, and your show's socials.",
    theme: "navy",
    popularity: 64,
    createdAt: "2024-02-14",
    blocks: [
      {
        type: "header",
        title: "New episode is live",
        headingFont: "spectral",
        headingSize: "md",
        headingUppercase: false,
      },
      {
        type: "banner",
        title: "Tune in now",
        subtitle: "New episodes every Thursday",
        url: "https://",
        bannerStyle: "teal",
        bannerPattern: "ripples",
      },
      { type: "link", title: "Listen on Spotify", url: "https://" },
      { type: "link", title: "Listen on Apple Podcasts", url: "https://" },
      { type: "link", title: "Watch on YouTube", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "youtube", url: "" },
          { kind: "instagram", url: "" },
          { kind: "twitter", url: "" },
        ],
      },
    ],
  },
  {
    id: "coach",
    name: "Coach",
    category: "business",
    tagline: "Bold • Motivating",
    description: "A bold program banner with an uppercase display heading, booking, and socials.",
    theme: "wildfire",
    popularity: 60,
    createdAt: "2024-03-05",
    blocks: [
      {
        type: "header",
        title: "New 8-week program",
        headingFont: "archivo-black",
        headingSize: "sm",
        headingUseGradient: true,
        headingGradientFrom: "#fca5a5",
        headingGradientTo: "#fdba74",
      },
      {
        type: "banner",
        title: "Enrollment is open now",
        subtitle: "Limited spots this cycle",
        url: "https://",
        bannerStyle: "coral",
        bannerPattern: "chevron",
        tall: true,
      },
      { type: "link", title: "Book a free consult", url: "https://" },
      { type: "link", title: "Join the program", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "instagram", url: "" },
          { kind: "youtube", url: "" },
          { kind: "tiktok", url: "" },
        ],
      },
    ],
  },
  {
    id: "developer",
    name: "Developer",
    category: "developer",
    tagline: "Technical • Minimal",
    description:
      "A terminal-clean layout for shipping in public — projects, repos, and a way to reach you.",
    theme: "steel",
    badges: ["new"],
    popularity: 45,
    createdAt: "2025-11-20",
    blocks: [
      {
        type: "header",
        title: "Now building",
        headingFont: "jetbrains-mono",
        headingSize: "sm",
        headingUppercase: true,
      },
      {
        type: "text",
        title: "Full-stack engineer. I write about the stuff that breaks in production.",
        textFont: "ibm-plex-mono",
        textSize: "sm",
      },
      { type: "link", title: "View source on GitHub", url: "https://" },
      { type: "link", title: "Read the changelog", url: "https://" },
      { type: "link", title: "Latest project", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "github", url: "" },
          { kind: "x", url: "" },
          { kind: "website", url: "" },
        ],
      },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "community",
    name: "Community",
    category: "business",
    tagline: "Warm • Mission-driven",
    description:
      "A mission-first layout with a statement, donate link, volunteer signup, and contact.",
    theme: "sage",
    popularity: 52,
    createdAt: "2024-03-05",
    blocks: [
      {
        type: "header",
        title: "Our mission",
        headingFont: "plus-jakarta",
        headingSize: "sm",
        headingColor: "#15803d",
      },
      {
        type: "text",
        title:
          "We're neighbors showing up for neighbors — every donation and every hour goes straight back into this block.",
        textFont: "plus-jakarta",
        textAlign: "center",
      },
      { type: "link", title: "Donate now", url: "https://" },
      { type: "link", title: "Volunteer with us", url: "https://" },
      { type: "link", title: "Upcoming events", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "instagram", url: "" },
          { kind: "facebook", url: "" },
          { kind: "website", url: "" },
        ],
      },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "student",
    name: "Student",
    category: "student",
    tagline: "Organized • Approachable",
    description:
      "A tidy landing spot for coursework, a résumé, and ways to connect — built for internship season.",
    theme: "mint",
    badges: ["new"],
    popularity: 42,
    createdAt: "2025-11-20",
    blocks: [
      {
        type: "header",
        title: "About me",
        headingFont: "urbanist",
        headingSize: "sm",
      },
      {
        type: "text",
        title:
          "Computer Science student — always down to talk about internships, projects, or a good study playlist.",
        textFont: "urbanist",
        textSize: "sm",
      },
      { type: "link", title: "View my résumé", url: "https://" },
      { type: "link", title: "See my portfolio", url: "https://" },
      { type: "link", title: "Book a coffee chat", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "linkedin", url: "" },
          { kind: "github", url: "" },
          { kind: "instagram", url: "" },
        ],
      },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "writer",
    name: "Writer",
    category: "artist",
    tagline: "Editorial • Personal",
    description: "An editorial serif heading, a pull-quote intro, and links to your latest issue.",
    theme: "cream",
    popularity: 55,
    createdAt: "2024-03-05",
    blocks: [
      {
        type: "header",
        title: "Latest issue",
        headingFont: "cormorant",
        headingSize: "lg",
        headingUppercase: false,
      },
      {
        type: "text",
        title: "Essays on the small decisions that build a life — one letter, every other Sunday.",
        textFont: "cormorant",
        textItalic: true,
        textAlign: "center",
        textSize: "lg",
      },
      { type: "link", title: "Read the latest issue", url: "https://" },
      { type: "link", title: "Subscribe for free", url: "https://" },
      { type: "link", title: "Browse the archive", url: "https://" },
      {
        type: "social",
        socials: [
          { kind: "twitter", url: "" },
          { kind: "website", url: "" },
        ],
      },
    ],
  },
];

export function instantiateTemplate(t: Template): LinkBlock[] {
  return t.blocks.map((b) => ({ ...b, id: uid() }));
}

// The Profile shown in every template preview — card thumbnails, the hover
// sync to the phone frame, and the preview modal all build it the same way:
// the visitor's own identity (name/avatar/bio/atmosphere) with just the
// template's theme and blocks swapped in. That's what makes a preview read
// as "my page with this layout" instead of a generic mockup.
export function previewProfileForTemplate(base: Profile, t: Template): Profile {
  return { ...base, theme: t.theme, blocks: instantiateTemplate(t) };
}

export type TemplateSortMode = "recommended" | "popular" | "newest";

// "recommended" trusts TEMPLATES' own curated order (already filtered, so
// Array.filter's stable order carries through) — no extra sort pass needed.
export function sortTemplates(list: Template[], mode: TemplateSortMode): Template[] {
  if (mode === "popular") return [...list].sort((a, b) => b.popularity - a.popularity);
  if (mode === "newest") {
    return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return list;
}
