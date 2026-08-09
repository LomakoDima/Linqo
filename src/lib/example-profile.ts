import type { Profile } from "@/lib/link-store";

// Shared demo persona used anywhere the app shows off what a finished page
// looks like (landing hero, login page) — one profile, so the two stay in
// sync instead of drifting apart as separate copies.
export const exampleProfile: Profile = {
  slug: "mayadesigns",
  name: "Maya Reyes",
  bio: "Graphic designer & illustrator\nBrand identity, editorial, and web ✨",
  avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Maya-Reyes&backgroundColor=b6e3f4",
  cover: "",
  theme: "sunset",
  blocks: [
    {
      id: "e-social",
      type: "social",
      socials: [
        { kind: "instagram", url: "https://instagram.com/mayadesigns" },
        { kind: "dribbble", url: "https://dribbble.com/mayadesigns" },
        { kind: "website", url: "https://mayareyes.design" },
      ],
    },
    {
      id: "e-banner",
      type: "banner",
      title: "My portfolio",
      subtitle: "Branding, illustration & web design",
      url: "https://mayareyes.design",
      image: "",
      bannerStyle: "sand",
    },
    {
      id: "e-link",
      type: "link",
      title: "Book a design consult",
      url: "https://mayareyes.design/contact",
    },
    {
      id: "e-contact",
      type: "contact",
      email: "hello@mayareyes.design",
      phone: "+1 (555) 018-2394",
    },
  ],
};
