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
    description: "Socials up front, a big banner for your latest drop.",
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
        type: "banner",
        title: "My latest video",
        subtitle: "Watch the newest upload",
        url: "https://",
        bannerStyle: "ember",
        bannerPattern: "sparkle",
      },
      { type: "link", title: "Subscribe", url: "https://" },
      { type: "link", title: "Merch store", url: "https://" },
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "A bento-style showcase for work samples and a hire link.",
    theme: "slate",
    blocks: [
      { type: "header", title: "Selected work" },
      {
        type: "banner",
        title: "Featured project",
        subtitle: "Case study",
        url: "https://",
        bannerStyle: "midnight",
        bannerLayout: "vertical",
        bannerPattern: "none",
      },
      { type: "image", image: "", url: "https://" },
      { type: "link", title: "View full portfolio", url: "https://" },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "Clean and simple — services, booking link, and contact info.",
    theme: "light",
    blocks: [
      { type: "header", title: "Services" },
      { type: "link", title: "Book a consultation", url: "https://" },
      { type: "link", title: "View pricing", url: "https://" },
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
    description: "Lead with a release banner, then streaming links and tour dates.",
    theme: "grape",
    blocks: [
      {
        type: "banner",
        title: "New single out now",
        subtitle: "Stream everywhere",
        url: "https://",
        bannerStyle: "violet",
        bannerPattern: "stars",
      },
      { type: "link", title: "Listen on Spotify", url: "https://" },
      { type: "link", title: "Tour dates", url: "https://" },
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
    description: "Go-live banner, socials, and support links for a gaming audience.",
    theme: "twilight",
    blocks: [
      {
        type: "banner",
        title: "Live on Twitch",
        subtitle: "Tap in for the schedule",
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
    ],
  },
  {
    id: "podcast",
    name: "Podcast",
    description: "A new-episode banner, listening links, and your show's socials.",
    theme: "navy",
    blocks: [
      {
        type: "banner",
        title: "New episode is live",
        subtitle: "Tune in now",
        url: "https://",
        bannerStyle: "teal",
        bannerPattern: "ripples",
      },
      { type: "link", title: "Listen on Spotify", url: "https://" },
      { type: "link", title: "Listen on Apple Podcasts", url: "https://" },
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
    description: "A gallery-style layout for recent work, a booking link, and contact info.",
    theme: "arctic",
    blocks: [
      { type: "header", title: "Recent work" },
      { type: "image", image: "", url: "https://" },
      { type: "link", title: "Book a session", url: "https://" },
      { type: "contact", email: "", phone: "" },
    ],
  },
  {
    id: "coach",
    name: "Coach",
    description: "Lead with your program, then a booking link and socials for accountability.",
    theme: "wildfire",
    blocks: [
      {
        type: "banner",
        title: "New 8-week program",
        subtitle: "Enrollment open now",
        url: "https://",
        bannerStyle: "coral",
        bannerPattern: "chevron",
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
    description: "Mission-first layout with a donate link, volunteer signup, and contact.",
    theme: "sage",
    blocks: [
      { type: "header", title: "Our mission" },
      { type: "link", title: "Donate now", url: "https://" },
      { type: "link", title: "Volunteer with us", url: "https://" },
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
    description: "Point readers to your latest piece, your newsletter, and where to follow.",
    theme: "cream",
    blocks: [
      { type: "header", title: "Latest issue" },
      { type: "link", title: "Read the newsletter", url: "https://" },
      { type: "link", title: "Subscribe", url: "https://" },
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
