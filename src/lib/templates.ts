import { uid, type LinkBlock, type ThemeName } from "./link-store";

export interface Template {
  id: string;
  name: string;
  description: string;
  theme: ThemeName;
  blocks: Omit<LinkBlock, "id">[];
}

export const TEMPLATES: Template[] = [
  {
    id: "standard",
    name: "Standard",
    description: "A blank canvas with no preset blocks — build it up yourself from scratch.",
    theme: "dark",
    blocks: [],
  },
  {
    id: "creator",
    name: "Creator",
    description: "Socials up front, a big banner for your latest drop, and a bold display heading.",
    theme: "sunset",
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
    description: "A restrained case-study layout with a vertical feature and a mono-styled label.",
    theme: "slate",
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
    id: "business",
    name: "Business",
    description: "Clean and simple — a services header, booking link, pricing, and contact info.",
    theme: "light",
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
    id: "musician",
    name: "Musician",
    description:
      "A tall release banner under a serif wordmark, then streaming links and tour dates.",
    theme: "grape",
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
    id: "minimal",
    name: "Minimal",
    description: "Just the essentials — a short list of links, nothing else.",
    theme: "noir",
    blocks: [
      { type: "link", title: "My website", url: "https://" },
      { type: "link", title: "Newsletter", url: "https://" },
      { type: "link", title: "Say hello", url: "https://" },
    ],
  },
  {
    id: "streamer",
    name: "Streamer",
    description: "A go-live banner under a mono-tag heading, socials, and support links.",
    theme: "twilight",
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
    description: "An editorial new-episode banner, listening links, and your show's socials.",
    theme: "navy",
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
    id: "photographer",
    name: "Photographer",
    description: "An airy gallery layout for recent work, a booking link, and contact info.",
    theme: "arctic",
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
    id: "coach",
    name: "Coach",
    description: "A bold program banner with an uppercase display heading, booking, and socials.",
    theme: "wildfire",
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
    id: "community",
    name: "Community",
    description:
      "A mission-first layout with a statement, donate link, volunteer signup, and contact.",
    theme: "sage",
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
    id: "writer",
    name: "Writer",
    description: "An editorial serif heading, a pull-quote intro, and links to your latest issue.",
    theme: "cream",
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
