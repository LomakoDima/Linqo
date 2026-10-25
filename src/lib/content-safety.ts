import { z } from "zod";
import type { LinkBlock, Profile } from "./link-store";
import {
  isBlockedContentHost,
  localTextViolation,
  localTextViolationMessage,
} from "./content-policy";
import { containsCodeContent } from "./code-content";

export const CONTENT_LIMITS = {
  profileBytes: 400_000,
  blocks: 100,
  galleryImages: 20,
  items: 50,
  text: 10_000,
  textRuns: 300,
  url: 2048,
  imageBytes: 10 * 1024 * 1024,
  audioBytes: 20 * 1024 * 1024,
  imagePixels: 16_777_216,
  imageDimension: 8192,
} as const;
export const SLUG_PATTERN = /^[a-z0-9_-]{1,64}$/;
export const ASSET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hasUnsafeControls(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.codePointAt(0)!;
    return (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      code === 127 ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    );
  });
}

export type UrlKind = "link" | "image" | "audio" | "video";
const MANAGED_ASSET = /^\/api\/(images|music)\/file\/([0-9a-f-]{36})\/?$/i;
export function managedAsset(
  value: string,
): { kind: "images" | "music"; id: string; origin: string | null } | null {
  try {
    const url = new URL(value, "https://relative.invalid");
    const match = MANAGED_ASSET.exec(decodeURIComponent(url.pathname));
    if (!match || !ASSET_ID_PATTERN.test(match[2]) || url.username || url.password) return null;
    return {
      kind: match[1].toLowerCase() as "images" | "music",
      id: match[2],
      origin: value.startsWith("/") && !value.startsWith("//") ? null : url.origin,
    };
  } catch {
    return null;
  }
}

export function isSafeContentUrl(value: string, kind: UrlKind = "link"): boolean {
  if (!value) return true;
  if (
    value.length > (kind === "image" && value.startsWith("data:") ? 200_000 : CONTENT_LIMITS.url) ||
    hasUnsafeControls(value) ||
    value !== value.trim() ||
    /[\s\\]/u.test(value)
  )
    return false;
  if (
    kind === "image" &&
    /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    return true;
  if (containsCodeContent(value)) return false;
  if (value.startsWith("/")) {
    if (kind === "image" && /^\/banners\/[a-z0-9/_-]+\.(?:png|jpe?g|webp|gif)$/i.test(value))
      return true;
    if (kind === "audio" && /^\/music\/[a-z0-9/_-]+\.(?:mp3|wav|ogg|m4a|aac)$/i.test(value))
      return true;
    const asset = managedAsset(value);
    return (
      !!asset &&
      asset.origin === null &&
      ((kind === "image" && asset.kind === "images") ||
        (kind === "audio" && asset.kind === "music"))
    );
  }
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      isBlockedContentHost(url.hostname)
    )
      return false;
    if (/%(?:00|0a|0d|1b)/i.test(value)) return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const asset = managedAsset(value);
    if (
      asset &&
      ((kind === "image" && asset.kind !== "images") ||
        (kind === "audio" && asset.kind !== "music"))
    )
      return false;
    const privateHost =
      host === "localhost" ||
      !host.includes(".") ||
      /(?:\.local|\.internal|\.localhost)$/.test(host) ||
      host.startsWith("[") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host);
    if (privateHost) {
      return (
        !!asset &&
        ["localhost", "127.0.0.1"].includes(host) &&
        ((kind === "image" && asset.kind === "images") ||
          (kind === "audio" && asset.kind === "music"))
      );
    }
    if (kind === "video")
      return (
        [
          "youtube.com",
          "www.youtube.com",
          "m.youtube.com",
          "youtu.be",
          "vimeo.com",
          "www.vimeo.com",
          "player.vimeo.com",
        ].includes(host) || /\.(mp4|webm|ogv)$/i.test(url.pathname)
      );
    if (kind === "image" && /\.(?:svg|html?|xml|pdf|js|exe)$/i.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function safeContentUrl(value: unknown, kind: UrlKind = "link"): string {
  if (typeof value !== "string" || !isSafeContentUrl(value, kind)) return "";
  return /^https?:/i.test(value) ? new URL(value).href : value;
}

// Drafts stay editable, but unsafe destinations never reach href/src in previews.
export function safePreviewProfile(profile: Profile): Profile {
  return {
    ...safeColorFields(profile),
    avatar: safeContentUrl(profile.avatar, "image"),
    cover: safeContentUrl(profile.cover, "image"),
    bgImage: safeContentUrl(profile.bgImage, "image"),
    ogImage: safeContentUrl(profile.ogImage, "image"),
    music: profile.music && {
      ...safeColorFields(profile.music),
      url: safeContentUrl(profile.music.url, "audio"),
    },
    particles: profile.particles && safeColorFields(profile.particles),
    ambient: profile.ambient && {
      ...profile.ambient,
      layers: profile.ambient.layers?.map((layer) => ({
        ...layer,
        url: safeContentUrl(layer.url, "audio"),
      })),
    },
    blocks: profile.blocks.map((block) => ({
      ...safeColorFields(block),
      textRuns: block.textRuns?.map(safeColorFields),
      url: safeContentUrl(block.url),
      image: safeContentUrl(block.image, "image"),
      videoUrl: safeContentUrl(block.videoUrl, "video"),
      email: email.safeParse(block.email ?? "").success ? block.email : "",
      phone: phone.safeParse(block.phone ?? "").success ? block.phone : "",
      socials: block.socials?.map((s) => ({ ...s, url: safeContentUrl(s.url) })),
      galleryImages: block.galleryImages?.map((i) => ({
        ...i,
        image: safeContentUrl(i.image, "image"),
      })),
    })),
  };
}

function safeColorFields<T extends object>(value: T): T {
  const safe = { ...value };
  for (const key of Object.keys(safe)) {
    if (!/(?:^color$|Color$|GradientFrom$|GradientTo$)/.test(key)) continue;
    const candidate = (safe as Record<string, unknown>)[key];
    if (typeof candidate !== "string" || !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(candidate))
      delete (safe as Record<string, unknown>)[key];
  }
  return safe;
}

const text = (max: number, moderate = true) =>
  z
    .string()
    .max(max, `Use at most ${max} characters`)
    .refine((v) => !hasUnsafeControls(v), "Unsupported control characters")
    .refine((v) => !containsCodeContent(v), "Code and markup are not allowed in public text")
    .superRefine((value, ctx) => {
      // The size rule already rejects oversized fields; do not run contextual
      // matching on an invalid, potentially very large direct API value.
      const message = moderate && value.length <= max ? localTextViolationMessage(value) : null;
      if (message) ctx.addIssue({ code: "custom", message });
    });
const optionalText = (max: number) => text(max).optional();
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/, "Invalid item ID");
const url = (kind: UrlKind) =>
  z
    .string()
    .refine(
      (v) => isSafeContentUrl(v, kind),
      `Use a safe ${kind === "link" ? "public HTTP(S) link" : kind + " URL"}`,
    );
const color = z.string().regex(/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i, "Use a hex color");
const percent = z.number().finite().min(0).max(100);
const font = z.string().regex(/^[a-z0-9-]{1,64}$/);
const size = z.enum(["sm", "md", "lg", "xl", "2xl"]);
const align = z.enum(["left", "center", "right"]);
const bannerStyle = z.enum([
  "dark",
  "ember",
  "crimson",
  "midnight",
  "sand",
  "violet",
  "teal",
  "rose",
  "gold",
  "pine",
  "storm",
  "coral",
  "sunset",
  "ocean",
  "candy",
  "citrus",
  "peach",
  "grape",
  "arctic",
  "mint",
  "wildfire",
  "twilight",
]);
const imageShape = z.enum(["rounded", "square", "circle", "landscape", "portrait"]);
const socialKind = z.enum([
  "instagram",
  "telegram",
  "tiktok",
  "youtube",
  "twitter",
  "x",
  "threads",
  "facebook",
  "whatsapp",
  "discord",
  "twitch",
  "pinterest",
  "spotify",
  "dribbble",
  "figma",
  "slack",
  "linkedin",
  "github",
  "website",
]);
const email = z
  .string()
  .max(254)
  .refine(
    (v) =>
      !v ||
      z
        .string()
        .email()
        .safeParse(v.replace(/^mailto:/i, "")).success,
    "Enter a valid email",
  );
const phone = z
  .string()
  .max(40)
  .regex(/^(?:tel:)?[+\d ().-]*$/, "Enter a valid phone number");
const textRun = z
  .object({
    text: text(CONTENT_LIMITS.text, false),
    font: font.optional(),
    color: color.optional(),
    size: size.optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
  })
  .strict();

export const blockContentSchema = z
  .object({
    id,
    type: z.enum([
      "link",
      "banner",
      "header",
      "social",
      "contact",
      "image",
      "text",
      "divider",
      "quote",
      "gallery",
      "video",
      "timeline",
      "countdown",
      "faq",
    ]),
    title: optionalText(CONTENT_LIMITS.text),
    subtitle: optionalText(500),
    url: url("link").optional(),
    socials: z
      .array(z.object({ kind: socialKind, url: url("link") }).strict())
      .max(32)
      .optional(),
    email: email.optional(),
    phone: phone.optional(),
    contactEmailEnabled: z.boolean().optional(),
    contactPhoneEnabled: z.boolean().optional(),
    image: url("image").optional(),
    imageName: optionalText(200),
    imageShape: imageShape.optional(),
    imageOpacity: percent.optional(),
    bannerStyle: bannerStyle.optional(),
    bannerUseCustomColor: z.boolean().optional(),
    bannerCustomUseGradient: z.boolean().optional(),
    bannerCustomColor: color.optional(),
    bannerCustomGradientFrom: color.optional(),
    bannerCustomGradientTo: color.optional(),
    bannerPattern: z
      .enum([
        "none",
        "honeycomb",
        "spikes",
        "dots",
        "stars",
        "dunes",
        "diamonds",
        "chevron",
        "ripples",
        "sparkle",
        "trees",
        "bolts",
        "coral",
        "topographic",
        "isometric",
        "orbit",
        "waveform",
        "diamond-grid",
        "constellation",
        "circuit",
        "prism",
        "aurora",
      ])
      .optional(),
    bannerPatternOpacity: percent.optional(),
    bannerPatternScale: z.number().min(50).max(200).optional(),
    bannerOpacity: percent.optional(),
    bannerLayout: z.enum(["horizontal", "vertical"]).optional(),
    tall: z.boolean().optional(),
    headingFont: font.optional(),
    headingSize: size.optional(),
    headingColor: color.optional(),
    headingBold: z.boolean().optional(),
    headingItalic: z.boolean().optional(),
    headingUnderline: z.boolean().optional(),
    headingStrikethrough: z.boolean().optional(),
    headingUppercase: z.boolean().optional(),
    headingUseGradient: z.boolean().optional(),
    headingGradientFrom: color.optional(),
    headingGradientTo: color.optional(),
    headingBgColor: color.optional(),
    textRuns: z
      .array(textRun)
      .max(CONTENT_LIMITS.textRuns)
      .refine(
        (runs) => runs.reduce((n, r) => n + r.text.length, 0) <= CONTENT_LIMITS.text,
        "Text block is too long",
      )
      .optional(),
    textFont: font.optional(),
    textColor: color.optional(),
    textAlign: align.optional(),
    textSize: size.optional(),
    textBold: z.boolean().optional(),
    textItalic: z.boolean().optional(),
    textUnderline: z.boolean().optional(),
    textStrikethrough: z.boolean().optional(),
    dividerStyle: z.enum(["solid", "dashed", "dotted", "icon"]).optional(),
    dividerIcon: z.enum(["sparkles", "star", "heart", "sun", "moon", "feather"]).optional(),
    dividerColor: color.optional(),
    dividerWidth: z.number().min(25).max(100).optional(),
    dividerThickness: z.number().min(1).max(4).optional(),
    dividerOpacity: percent.optional(),
    quoteText: optionalText(4000),
    quoteAuthor: optionalText(200),
    quoteFont: font.optional(),
    quoteColor: color.optional(),
    quoteAlign: align.optional(),
    quoteSize: size.optional(),
    quoteStyle: z.enum(["plain", "card", "bigmark"]).optional(),
    galleryImages: z
      .array(
        z
          .object({
            id,
            image: url("image"),
            imageName: optionalText(200),
            caption: optionalText(500),
          })
          .strict(),
      )
      .max(CONTENT_LIMITS.galleryImages)
      .optional(),
    galleryLayout: z.enum(["grid", "carousel", "masonry"]).optional(),
    galleryShape: imageShape.optional(),
    videoUrl: url("video").optional(),
    videoProvider: z.enum(["youtube", "vimeo", "file"]).optional(),
    videoTitle: optionalText(200),
    videoAutoplay: z.boolean().optional(),
    videoAspect: z.enum(["16:9", "9:16", "1:1"]).optional(),
    timelineItems: z
      .array(
        z
          .object({
            id,
            title: text(200),
            date: optionalText(100),
            description: optionalText(2000),
          })
          .strict(),
      )
      .max(CONTENT_LIMITS.items)
      .optional(),
    timelineOrientation: z.enum(["vertical", "horizontal"]).optional(),
    countdownTarget: z
      .string()
      .max(40)
      .refine((v) => !v || Number.isFinite(Date.parse(v)), "Enter a valid date")
      .optional(),
    countdownLabel: optionalText(200),
    countdownStyle: z.enum(["digits", "words"]).optional(),
    countdownExpiredMessage: optionalText(500),
    faqItems: z
      .array(z.object({ id, question: text(500), answer: text(4000) }).strict())
      .max(CONTENT_LIMITS.items)
      .optional(),
    faqDefaultOpen: z.enum(["first", "none", "all"]).optional(),
  })
  .strict()
  .superRefine((block, ctx) => {
    if (block.type !== "text" && (block.title?.length ?? 0) > 200)
      ctx.addIssue({ code: "custom", path: ["title"], message: "Use at most 200 characters" });
    const joinedText = block.textRuns?.map((r) => r.text).join("");
    const moderationMessage =
      joinedText && joinedText.length <= CONTENT_LIMITS.text
        ? localTextViolationMessage(joinedText)
        : null;
    if (moderationMessage)
      ctx.addIssue({
        code: "custom",
        path: ["textRuns"],
        message: moderationMessage,
      });
    if (block.textRuns && containsCodeContent(block.textRuns.map((r) => r.text).join("")))
      ctx.addIssue({
        code: "custom",
        path: ["textRuns"],
        message: "Code and markup are not allowed in public text",
      });
    for (const key of ["galleryImages", "timelineItems", "faqItems"] as const) {
      const items = block[key];
      if (items && new Set(items.map((item) => item.id)).size !== items.length)
        ctx.addIssue({ code: "custom", path: [key], message: "Item IDs must be unique" });
    }
  });

export const profileContentSchema = z
  .object({
    slug: z
      .string()
      .regex(SLUG_PATTERN, "Username must use 1–64 lowercase letters, numbers, _ or -")
      .refine((v) => !localTextViolation(v), "Choose a different username"),
    name: text(100).refine((v) => v.trim().length > 0, "Enter your name"),
    bio: text(160),
    avatar: url("image").default(""),
    avatarName: optionalText(200),
    cover: url("image").default(""),
    coverName: optionalText(200),
    coverType: z.enum(["image", "color"]).optional(),
    coverStyle: bannerStyle.optional(),
    theme: z.enum([
      "dark",
      "light",
      "sunset",
      "ocean",
      "forest",
      "aurora",
      "candy",
      "slate",
      "blush",
      "lavender",
      "citrus",
      "mint",
      "noir",
      "charcoal",
      "cream",
      "navy",
      "sage",
      "plum",
      "tan",
      "steel",
      "peach",
      "grape",
      "arctic",
      "wildfire",
      "twilight",
    ]),
    accentColor: color.optional(),
    bgImage: url("image").optional(),
    bgImageName: optionalText(200),
    bgType: z.enum(["image", "color"]).optional(),
    bgStyle: bannerStyle.optional(),
    effects: z
      .object({
        glass: z.boolean().optional(),
        noise: z.boolean().optional(),
        noiseIntensity: percent.optional(),
        glow: z.boolean().optional(),
        glowIntensity: percent.optional(),
        gradientAnimation: z.boolean().optional(),
        blur: z.boolean().optional(),
        blurIntensity: percent.optional(),
      })
      .strict()
      .optional(),
    music: z
      .object({
        enabled: z.boolean(),
        genre: z
          .enum([
            "lofi",
            "chill",
            "relax",
            "focus",
            "jazz",
            "ambient",
            "piano",
            "synthwave",
            "acoustic",
            "upbeat",
          ])
          .optional(),
        url: url("audio").optional(),
        loop: z.boolean().optional(),
        volume: percent.optional(),
        visualizerEnabled: z.boolean().optional(),
        visualizer: z
          .enum(["bars", "wave", "pulse", "waveform", "circular", "spectrum", "off"])
          .optional(),
        visualizerSize: z.enum(["sm", "md", "lg"]).optional(),
        visualizerPosition: align.optional(),
        visualizerOpacity: percent.optional(),
        visualizerRoundness: percent.optional(),
        visualizerSpeed: z.number().min(0.1).max(5).optional(),
        visualizerColor: color.optional(),
      })
      .strict()
      .optional(),
    ambient: z
      .object({
        enabled: z.boolean(),
        layers: z
          .array(
            z
              .object({
                kind: z.enum([
                  "rain",
                  "forest",
                  "ocean",
                  "wind",
                  "night",
                  "coffee-shop",
                  "fireplace",
                  "thunder",
                  "river",
                  "birds",
                ]),
                enabled: z.boolean(),
                url: url("audio").optional(),
                urlName: optionalText(200),
                volume: percent.optional(),
              })
              .strict(),
          )
          .max(10)
          .optional(),
      })
      .strict()
      .optional(),
    particles: z
      .object({
        enabled: z.boolean(),
        kind: z
          .enum([
            "snow",
            "rain",
            "leaves",
            "stars",
            "fireflies",
            "sakura",
            "dust",
            "bubbles",
            "hearts",
            "sparkles",
          ])
          .optional(),
        density: z.number().int().min(0).max(200).optional(),
        speed: z.number().min(0.1).max(5).optional(),
        size: z.number().min(0.1).max(5).optional(),
        opacity: percent.optional(),
        color: color.optional(),
        shape: z
          .enum(["default", "circle", "square", "star", "heart", "sparkle", "emoji"])
          .optional(),
        emoji: text(16).optional(),
      })
      .strict()
      .optional(),
    seoTitle: optionalText(120),
    seoDescription: optionalText(300),
    ogImage: url("image")
      .refine((v) => !v.startsWith("data:"), "Share images must be hosted")
      .optional(),
    ogImageName: optionalText(200),
    blocks: z.array(blockContentSchema).max(CONTENT_LIMITS.blocks),
    templateId: id.optional(),
  })
  .strict()
  .superRefine((profile, ctx) => {
    if (new Set(profile.blocks.map((b) => b.id)).size !== profile.blocks.length)
      ctx.addIssue({ code: "custom", path: ["blocks"], message: "Block IDs must be unique" });
    const imageCount =
      [profile.avatar, profile.cover, profile.bgImage, profile.ogImage].filter(Boolean).length +
      profile.blocks.reduce(
        (n, b) => n + Number(!!b.image) + (b.galleryImages?.filter((i) => i.image).length ?? 0),
        0,
      );
    if (imageCount > 40)
      ctx.addIssue({ code: "custom", path: ["blocks"], message: "Use at most 40 images per page" });
    const layers = profile.ambient?.layers ?? [];
    if (new Set(layers.map((l) => l.kind)).size !== layers.length)
      ctx.addIssue({
        code: "custom",
        path: ["ambient", "layers"],
        message: "Use each ambient sound only once",
      });
  });

export type ContentIssue = { path: string; message: string };
export function contentIssues(error: z.ZodError): ContentIssue[] {
  return error.issues
    .slice(0, 12)
    .map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}
export function validateProfileContent(
  raw: unknown,
): { profile: Profile; issues: [] } | { profile: null; issues: ContentIssue[] } {
  const result = profileContentSchema.safeParse(raw);
  return result.success
    ? { profile: result.data as Profile, issues: [] }
    : { profile: null, issues: contentIssues(result.error) };
}
export function validateBlockContent(block: LinkBlock): ContentIssue[] {
  const result = blockContentSchema.safeParse(block);
  return result.success ? [] : contentIssues(result.error);
}
