import type { TourStep } from "./guide-tour";

export const BUILDER_TOUR_SEEN_KEY = "linqo_builder_tour_v2";

export function createBuilderTour(selectTab: (tab: string) => void): TourStep[] {
  return [
    {
      id: "welcome",
      target: '[data-tour="brand"]',
      title: "Meet your builder",
      body: "Choose a starting layout, add your content, then publish a page you can share. You can leave this tour at any point.",
    },
    {
      id: "templates",
      target: '[data-tour="tab-templates"]',
      title: "Start with a template",
      body: "Browse by category, search, or save favorites. Preview a template before applying its layout and theme to your page.",
      onBeforeShow: () => selectTab("templates"),
    },
    {
      id: "content",
      target: '[data-tour="add-blocks"]',
      title: "Make room for your content",
      body: "Open the block library for links, images, galleries, video, and more. Reorder your blocks or insert a new one between them.",
      onBeforeShow: () => selectTab("content"),
    },
    {
      id: "appearance",
      target: '[data-tour="tab-design"]',
      title: "Shape the look",
      body: "Choose a theme, then adjust your colors, background, and page effects. Changes stay in your draft until you publish.",
      onBeforeShow: () => selectTab("design"),
    },
    {
      id: "atmosphere",
      target: '[data-tour="tab-music"]',
      title: "Set the atmosphere",
      body: "Add music, tune a visualizer, mix ambient sounds, or choose a particle effect. Each can be switched on independently.",
      onBeforeShow: () => selectTab("music"),
    },
    {
      id: "identity",
      target: '[data-tour="tab-profile"]',
      title: "Make it yours",
      body: "Set your display name, username, and bio. Add an avatar and cover to bring your identity into the page.",
      onBeforeShow: () => selectTab("profile"),
    },
    {
      id: "preview",
      target: ['[data-tour="preview"]', '[data-tour="mobile-preview"]'],
      title: "Check as you go",
      body: "Your preview follows your edits. On smaller screens, Preview page opens the layout so you can check it before publishing.",
      onBeforeShow: () => selectTab("profile"),
    },
    {
      id: "publish",
      target: '[data-tour="tab-publish"]',
      title: "Ready to go live?",
      body: "Publish updates your live page. This section also has your link preview, sharing tools, and a downloadable QR code.",
      onBeforeShow: () => selectTab("share"),
    },
    {
      id: "share",
      target: '[data-tour="share-buttons"]',
      title: "Publish and copy your link",
      body: "Copy link publishes your latest changes and copies your address. Open shows your current draft in a new tab.",
      onBeforeShow: () => selectTab("share"),
    },
  ];
}
