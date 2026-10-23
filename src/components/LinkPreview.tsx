import { useEffect, useRef, useState, type RefObject } from "react";
import {
  BANNER_STYLES,
  HEADING_SIZES,
  IMAGE_SHAPES,
  MUSIC_GENRES,
  THEMES,
  bannerPatternSize,
  bannerPatternUrl,
  isLightHex,
  mailtoHref,
  resolveTextRuns,
  telHref,
  textRunsAreEmpty,
  type LinkBlock,
  type MusicSettings,
  type MusicVisualizerPosition,
  type Profile,
  type SocialKind,
} from "@/lib/link-store";
import { getHeadingFont, loadGoogleFont } from "@/lib/fonts";
import { useAudioAnalyser } from "@/lib/audio-visualizer";
import { usePreviewPlayback } from "@/lib/preview-playback";
import { corsTrackSrc, isOwnTrackUrl } from "@/lib/publish";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { ParticleStage } from "@/components/ParticleStage";
import { AmbientSoundBed, type AmbientSoundBedHandle } from "@/components/AmbientSoundBed";
import { Volume2, VolumeX } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Instagram,
  Send,
  Youtube,
  Twitter,
  X,
  AtSign,
  Facebook,
  MessageCircle,
  Twitch,
  Pin,
  Disc,
  Dribbble,
  Figma,
  Slack,
  Linkedin,
  Github,
  Globe,
  Music2,
  Quote as QuoteIcon,
  Sparkles,
  Star,
  Heart,
  Sun,
  Moon,
  Feather,
  Circle,
  type LucideIcon,
} from "lucide-react";

// Named icon options for a "divider" block's icon style — a small curated
// set (not all of lucide-react) so the icon picker in the editor and the
// renderer here share one finite vocabulary. Falls back to Circle for a
// name that isn't in this set (e.g. a value saved before an icon was
// removed from the set).
const DIVIDER_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  star: Star,
  heart: Heart,
  sun: Sun,
  moon: Moon,
  feather: Feather,
};

function inferVideoProvider(url: string): "youtube" | "vimeo" | "file" {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/vimeo\.com/.test(url)) return "vimeo";
  return "file";
}

function youtubeEmbedUrl(url: string, autoplay?: boolean): string | undefined {
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/.exec(url);
  if (!m) return undefined;
  const params = autoplay ? "?autoplay=1&mute=1" : "";
  return `https://www.youtube.com/embed/${m[1]}${params}`;
}

function vimeoEmbedUrl(url: string, autoplay?: boolean): string | undefined {
  const m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (!m) return undefined;
  const params = autoplay ? "?autoplay=1&muted=1" : "";
  return `https://player.vimeo.com/video/${m[1]}${params}`;
}

const socialIcon: Record<SocialKind, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  telegram: Send,
  tiktok: Music2,
  youtube: Youtube,
  twitter: Twitter,
  x: X,
  threads: AtSign,
  facebook: Facebook,
  whatsapp: MessageCircle,
  discord: MessageCircle,
  twitch: Twitch,
  pinterest: Pin,
  spotify: Disc,
  dribbble: Dribbble,
  figma: Figma,
  slack: Slack,
  linkedin: Linkedin,
  github: Github,
  website: Globe,
};

export function LinkPreview({ profile, framed = false }: { profile: Profile; framed?: boolean }) {
  const theme = THEMES[profile.theme] ?? THEMES.dark;
  const name = profile.name || "";
  const blocks = profile.blocks ?? [];
  const effects = profile.effects ?? {};
  // A real hex counterpart to theme.accent (a Tailwind class, unusable in a
  // CSS gradient/box-shadow value) — always resolved, used by Glow and
  // Gradient Animation. profile.accentColor itself (possibly undefined) is
  // what actually overrides theme.accent's *class* usage sites below, so an
  // unset override renders byte-identical to before Accent Color existed.
  const accentHex = profile.accentColor || theme.accentHex;
  // Glass substitutes this one computed class at every existing theme.card
  // usage site instead of restyling each block type individually.
  const cardClass = effects.glass
    ? theme.light
      ? "backdrop-blur-md bg-white/50 border border-black/10 shadow-sm"
      : "backdrop-blur-md bg-white/10 border border-white/15"
    : theme.card;
  // "color" mode swaps only the background half of theme.bg (which bundles
  // background + base text color together) — the text color half always
  // comes from theme.text so contrast stays correct regardless of source.
  const baseBgClass =
    profile.bgType === "color"
      ? `${BANNER_STYLES[profile.bgStyle ?? "dark"].gradient} ${theme.text}`
      : theme.bg;
  const ambientBedRef = useRef<AmbientSoundBedHandle>(null);

  useEffect(() => {
    for (const b of profile.blocks ?? []) {
      if (b.type === "header" && b.headingFont) loadGoogleFont(b.headingFont);
      if (b.type === "text") {
        if (b.textFont) loadGoogleFont(b.textFont);
        for (const run of resolveTextRuns(b)) {
          if (run.font) loadGoogleFont(run.font);
        }
      }
    }
  }, [profile.blocks]);
  const content = (
    // hyphens-auto + break-words are inherited, so this one rule keeps every
    // text node below from overflowing or wrapping raggedly in the narrower
    // half-width columns (e.g. a vertical banner's paired block).
    <div className={`relative min-h-full w-full isolate hyphens-auto break-words ${baseBgClass}`}>
      {profile.bgImage && (
        <>
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{
              backgroundImage: `url(${profile.bgImage})`,
              filter: effects.blur
                ? `blur(${((effects.blurIntensity ?? 40) / 100) * 20}px)`
                : undefined,
            }}
          />
          <div className="absolute inset-0 -z-10 bg-black/45" />
        </>
      )}

      {effects.noise && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: ((effects.noiseIntensity ?? 30) / 100) * 0.12,
          }}
        />
      )}

      {effects.glow && (
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${accentHex}, transparent 60%)`,
            opacity: (effects.glowIntensity ?? 50) / 100,
          }}
        />
      )}

      {effects.gradientAnimation && (
        <div
          className="animate-blob pointer-events-none absolute -inset-y-1/4 left-1/4 -z-10 aspect-square w-1/2 rounded-full blur-3xl"
          style={{ background: accentHex, opacity: 0.25 }}
        />
      )}
      <div className="h-28 w-full overflow-hidden">
        {profile.coverType === "color" ? (
          <div
            className={`h-full w-full ${BANNER_STYLES[profile.coverStyle ?? "dark"].gradient}`}
          />
        ) : profile.cover ? (
          <img src={profile.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full ${cardClass}`} />
        )}
      </div>

      <div className="px-5 pb-8">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          <div className="flex items-start gap-3">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={name}
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-bold ring-2 ring-white/20">
                {name.charAt(0).toUpperCase() || "K"}
              </div>
            )}
            <div className="pt-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h1 className={`text-base font-semibold leading-tight ${theme.text}`}>
                  {name || profile.slug}
                </h1>
                <span className={`text-xs ${theme.muted}`}>@{profile.slug}</span>
              </div>
              <p className={`mt-1 whitespace-pre-line text-sm ${theme.muted}`}>{profile.bio}</p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {blocks.map((b, i) => {
              // A vertical banner is half-width and tall; whatever block comes
              // right after it shrinks to half-width too, so the two sit side
              // by side in the same grid row instead of each getting a full row.
              const prev = blocks[i - 1];
              const isVertical = b.type === "banner" && b.bannerLayout === "vertical";
              const pairsWithPrev = prev?.type === "banner" && prev.bannerLayout === "vertical";
              const half = isVertical || pairsWithPrev;
              const spanClass = half ? "col-span-1" : "col-span-2";
              const stretch = half ? "h-full" : "";

              // Staggered slide up entrance animation
              const delayClass =
                i === 0
                  ? ""
                  : i === 1
                    ? "delay-100"
                    : i === 2
                      ? "delay-200"
                      : i === 3
                        ? "delay-300"
                        : i === 4
                          ? "delay-400"
                          : "delay-500";
              const animateClass = `animate-slide-up ${delayClass}`;

              // A stable name per block lets the View Transitions API morph
              // its box smoothly (position/size) when a banner's layout
              // toggle changes its grid span — see withViewTransition.
              const vtStyle: React.CSSProperties = { viewTransitionName: `block-${b.id}` };

              if (b.type === "header") {
                return (
                  <HeadingBlockView
                    key={b.id}
                    block={b}
                    spanClass={spanClass}
                    animateClass={animateClass}
                    vtStyle={vtStyle}
                    theme={theme}
                    accentColor={profile.accentColor}
                  />
                );
              }

              if (b.type === "social") {
                return (
                  <div
                    key={b.id}
                    style={vtStyle}
                    className={`${spanClass} ${stretch} ${animateClass} flex flex-wrap items-center justify-center gap-3 py-1`}
                  >
                    {(b.socials ?? []).map((s, i) => {
                      const Icon = socialIcon[s.kind] ?? Globe;
                      return (
                        <a
                          key={i}
                          href={s.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={`grid h-11 w-11 place-items-center rounded-full ${cardClass} transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-md hover:brightness-110`}
                          aria-label={s.kind}
                        >
                          <Icon className="h-5 w-5" />
                        </a>
                      );
                    })}
                  </div>
                );
              }

              if (b.type === "contact") {
                const showEmail = !!b.email && (b.contactEmailEnabled ?? true);
                const showPhone = !!b.phone && (b.contactPhoneEnabled ?? true);
                if (!showEmail && !showPhone) return null;
                return (
                  <div
                    key={b.id}
                    style={vtStyle}
                    className={`${spanClass} ${stretch} ${animateClass} flex flex-col justify-center gap-3`}
                  >
                    {showEmail && (
                      <a
                        href={mailtoHref(b.email!)}
                        className={`block rounded-2xl px-5 py-4 text-center text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 active:scale-[0.99] ${cardClass} ${theme.text}`}
                      >
                        {b.email}
                      </a>
                    )}
                    {showPhone && (
                      <a
                        href={telHref(b.phone!)}
                        className={`block rounded-2xl px-5 py-4 text-center text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 active:scale-[0.99] ${cardClass} ${theme.text}`}
                      >
                        {b.phone}
                      </a>
                    )}
                  </div>
                );
              }

              if (b.type === "image" && b.image) {
                const shape = IMAGE_SHAPES[b.imageShape ?? "rounded"] ?? IMAGE_SHAPES.rounded;
                return (
                  <a
                    key={b.id}
                    href={b.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={vtStyle}
                    className={`${spanClass} ${stretch} ${animateClass} overflow-hidden ${shape.boxClassName} transition-all duration-300 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]`}
                  >
                    <img
                      src={b.image}
                      alt={b.title || ""}
                      style={{ opacity: (b.imageOpacity ?? 100) / 100 }}
                      className={`w-full object-cover transition-transform duration-500 hover:scale-105 ${
                        stretch || shape.hasFixedAspect ? "h-full" : ""
                      }`}
                    />
                  </a>
                );
              }

              if (b.type === "text") {
                const runs = resolveTextRuns(b);
                if (textRunsAreEmpty(runs)) return null;
                const alignClass =
                  b.textAlign === "center"
                    ? "text-center"
                    : b.textAlign === "right"
                      ? "text-right"
                      : "text-left";
                const anyColor = runs.some((r) => r.color) || b.textColor;
                return (
                  <p
                    key={b.id}
                    style={vtStyle}
                    className={`${spanClass} ${animateClass} ${alignClass} whitespace-pre-line leading-relaxed ${
                      anyColor ? "" : theme.text
                    }`}
                  >
                    {runs.map((run, i) => {
                      if (run.text === "\n") return <br key={i} />;
                      const size =
                        HEADING_SIZES[run.size ?? b.textSize ?? "md"] ?? HEADING_SIZES.md;
                      const decorations = [
                        (run.underline ?? b.textUnderline) && "underline",
                        (run.strikethrough ?? b.textStrikethrough) && "line-through",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <span
                          key={i}
                          style={{
                            fontFamily: getHeadingFont(run.font ?? b.textFont).family,
                            color: (run.color ?? b.textColor) || undefined,
                            textDecorationLine: decorations || undefined,
                          }}
                          className={`${size.className} ${(run.bold ?? b.textBold) ? "font-bold" : ""} ${
                            (run.italic ?? b.textItalic) ? "italic" : ""
                          }`}
                        >
                          {run.text}
                        </span>
                      );
                    })}
                  </p>
                );
              }

              if (b.type === "banner") {
                const preset = BANNER_STYLES[b.bannerStyle ?? "dark"] ?? BANNER_STYLES.dark;
                const customGradient =
                  b.bannerUseCustomColor &&
                  b.bannerCustomUseGradient &&
                  b.bannerCustomGradientFrom &&
                  b.bannerCustomGradientTo;
                const isLight = b.bannerUseCustomColor
                  ? isLightHex(
                      customGradient
                        ? b.bannerCustomGradientFrom!
                        : (b.bannerCustomColor ?? "#111114"),
                    )
                  : preset.light;
                const ringClassName = b.bannerUseCustomColor
                  ? isLight
                    ? "ring-1 ring-black/10"
                    : "ring-1 ring-white/10"
                  : preset.ring;
                const backgroundClassName = b.bannerUseCustomColor ? "" : preset.gradient;
                const backgroundStyle: React.CSSProperties = b.bannerUseCustomColor
                  ? customGradient
                    ? {
                        backgroundImage: `linear-gradient(135deg, ${b.bannerCustomGradientFrom}, ${b.bannerCustomGradientTo})`,
                      }
                    : { backgroundColor: b.bannerCustomColor ?? "#111114" }
                  : {};
                const opacity = (b.bannerOpacity ?? 100) / 100;
                const vertical = b.bannerLayout === "vertical";
                const titleBlock = (
                  <>
                    <div
                      className={`text-lg font-bold leading-tight drop-shadow-sm ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}
                    >
                      {b.title || "Heading"}
                    </div>
                    {b.subtitle && (
                      <div
                        className={`mt-1 text-xs ${isLight ? "text-neutral-700" : "text-white/70"}`}
                      >
                        {b.subtitle}
                      </div>
                    )}
                  </>
                );
                return (
                  <a
                    key={b.id}
                    href={b.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={vtStyle}
                    className={`${spanClass} ${stretch} ${animateClass} group relative isolate block overflow-hidden rounded-2xl ${ringClassName} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99]`}
                  >
                    <div className="pointer-events-none absolute inset-0 -z-10" style={{ opacity }}>
                      <div
                        className={`absolute inset-0 ${backgroundClassName}`}
                        style={backgroundStyle}
                      />
                      {(b.bannerPattern ?? "honeycomb") !== "none" && (
                        <div
                          className={`absolute inset-0 ${
                            isLight ? "mix-blend-multiply" : "mix-blend-screen"
                          }`}
                          style={{
                            backgroundImage: bannerPatternUrl(
                              b.bannerPattern ?? "honeycomb",
                              isLight,
                            ),
                            backgroundPosition: "center",
                            backgroundRepeat: "repeat",
                            backgroundSize: bannerPatternSize(
                              b.bannerPattern ?? "honeycomb",
                              b.bannerPatternScale ?? 100,
                            ),
                            opacity: (b.bannerPatternOpacity ?? 70) / 100,
                          }}
                        />
                      )}
                      {b.image && !vertical && (
                        <img
                          src={b.image}
                          alt=""
                          className="absolute inset-y-0 right-0 h-full w-2/3 object-cover"
                          style={{
                            WebkitMaskImage:
                              "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 95%)",
                            maskImage:
                              "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 95%)",
                          }}
                        />
                      )}
                    </div>
                    {vertical ? (
                      <div className="relative flex h-full flex-col">
                        {b.image && (
                          <img
                            src={b.image}
                            alt=""
                            className="w-full flex-1 object-cover"
                            style={{ minHeight: b.tall ? 160 : 112 }}
                          />
                        )}
                        <div className="px-5 py-4">{titleBlock}</div>
                      </div>
                    ) : (
                      <div
                        className={`relative flex items-center px-5 py-4 ${
                          stretch ? "h-full" : b.tall ? "min-h-[150px]" : "min-h-[92px]"
                        }`}
                      >
                        <div className="max-w-[65%]">{titleBlock}</div>
                      </div>
                    )}
                  </a>
                );
              }

              if (b.type === "divider") {
                const style = b.dividerStyle ?? "solid";
                const dividerOpacity =
                  Math.max(
                    0,
                    Math.min(
                      100,
                      b.dividerOpacity ?? (b.dividerColor || style === "icon" ? 100 : 15),
                    ),
                  ) / 100;
                if (style === "icon") {
                  const Icon = DIVIDER_ICONS[b.dividerIcon ?? ""] ?? Circle;
                  return (
                    <div
                      key={b.id}
                      style={vtStyle}
                      className={`${spanClass} ${animateClass} flex items-center justify-center py-2`}
                    >
                      <span
                        className={`grid h-7 w-7 place-items-center ${theme.muted}`}
                        style={{ color: b.dividerColor || undefined, opacity: dividerOpacity }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={b.id} style={vtStyle} className={`${spanClass} ${animateClass} py-2`}>
                    <hr
                      className={`${
                        style === "dashed"
                          ? "border-dashed"
                          : style === "dotted"
                            ? "border-dotted"
                            : "border-solid"
                      }`}
                      style={{
                        width: `${Math.max(25, Math.min(100, b.dividerWidth ?? 100))}%`,
                        borderTopWidth: `${Math.max(1, Math.min(4, b.dividerThickness ?? 1))}px`,
                        borderColor: b.dividerColor || "currentColor",
                        opacity: dividerOpacity,
                      }}
                    />
                  </div>
                );
              }

              if (b.type === "quote") {
                const align =
                  b.quoteAlign === "left"
                    ? "text-left"
                    : b.quoteAlign === "right"
                      ? "text-right"
                      : "text-center";
                const size = HEADING_SIZES[b.quoteSize ?? "md"] ?? HEADING_SIZES.md;
                const style = b.quoteStyle ?? "plain";
                return (
                  <figure
                    key={b.id}
                    style={vtStyle}
                    className={`${spanClass} ${animateClass} ${
                      style === "card" ? `rounded-2xl px-6 py-5 ${cardClass}` : "px-1 py-1"
                    }`}
                  >
                    {style === "bigmark" && (
                      <QuoteIcon
                        style={{ color: profile.accentColor || undefined }}
                        className={`mx-auto mb-1.5 h-5 w-5 ${theme.accent} opacity-70`}
                      />
                    )}
                    <blockquote
                      className={`${align} ${size.className} font-medium italic leading-relaxed`}
                      style={{
                        fontFamily: getHeadingFont(b.quoteFont).family,
                        color: b.quoteColor || undefined,
                      }}
                    >
                      "{b.quoteText || "Type a quote…"}"
                    </blockquote>
                    {b.quoteAuthor && (
                      <figcaption className={`mt-2 ${align} text-xs ${theme.muted}`}>
                        — {b.quoteAuthor}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              if (b.type === "gallery") {
                const images = b.galleryImages ?? [];
                if (images.length === 0) return null;
                const shape = IMAGE_SHAPES[b.galleryShape ?? "rounded"] ?? IMAGE_SHAPES.rounded;
                const layout = b.galleryLayout ?? "grid";
                return (
                  <div key={b.id} style={vtStyle} className={`${spanClass} ${animateClass}`}>
                    {layout === "carousel" ? (
                      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
                        {images.map((img) => (
                          <img
                            key={img.id}
                            src={img.image}
                            alt={img.caption || ""}
                            className={`h-40 w-40 shrink-0 snap-start object-cover ${shape.boxClassName}`}
                          />
                        ))}
                      </div>
                    ) : layout === "masonry" ? (
                      <div className="columns-2 gap-2">
                        {images.map((img) => (
                          <img
                            key={img.id}
                            src={img.image}
                            alt={img.caption || ""}
                            className={`mb-2 w-full break-inside-avoid object-cover ${shape.boxClassName}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {images.map((img) => (
                          <img
                            key={img.id}
                            src={img.image}
                            alt={img.caption || ""}
                            className={`aspect-square w-full object-cover ${shape.boxClassName}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (b.type === "video") {
                if (!b.videoUrl) return null;
                const provider = b.videoProvider ?? inferVideoProvider(b.videoUrl);
                const aspect = b.videoAspect ?? "16:9";
                const aspectClass =
                  aspect === "9:16"
                    ? "aspect-[9/16]"
                    : aspect === "1:1"
                      ? "aspect-square"
                      : "aspect-video";
                const embedSrc =
                  provider === "youtube"
                    ? youtubeEmbedUrl(b.videoUrl, b.videoAutoplay)
                    : provider === "vimeo"
                      ? vimeoEmbedUrl(b.videoUrl, b.videoAutoplay)
                      : undefined;
                return (
                  <div
                    key={b.id}
                    style={vtStyle}
                    className={`${spanClass} ${animateClass} overflow-hidden rounded-2xl ${aspectClass} ${cardClass}`}
                  >
                    {provider === "file" ? (
                      <video
                        src={b.videoUrl}
                        controls
                        autoPlay={b.videoAutoplay}
                        muted={b.videoAutoplay}
                        loop
                        className="h-full w-full object-cover"
                      />
                    ) : embedSrc ? (
                      <iframe
                        src={embedSrc}
                        title={b.videoTitle || "Video"}
                        className="h-full w-full"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    ) : null}
                  </div>
                );
              }

              if (b.type === "timeline") {
                const items = b.timelineItems ?? [];
                if (items.length === 0) return null;
                const horizontal = b.timelineOrientation === "horizontal";
                return (
                  <div
                    key={b.id}
                    style={vtStyle}
                    className={`${spanClass} ${animateClass} ${
                      horizontal ? "flex gap-4 overflow-x-auto pb-1" : ""
                    }`}
                  >
                    {items.map((item, i) => (
                      <div
                        key={item.id}
                        className={horizontal ? "w-48 shrink-0" : "relative pb-5 pl-6 last:pb-0"}
                      >
                        {!horizontal && (
                          <>
                            <span
                              style={{ color: profile.accentColor || undefined }}
                              className={`absolute left-0 top-1 h-2.5 w-2.5 rounded-full ${theme.accent} bg-current`}
                            />
                            {i < items.length - 1 && (
                              <span className="absolute bottom-0 left-[4.5px] top-4 w-px bg-current opacity-15" />
                            )}
                          </>
                        )}
                        {item.date && (
                          <div
                            style={{ color: profile.accentColor || undefined }}
                            className={`text-[11px] font-semibold uppercase tracking-wide ${theme.accent}`}
                          >
                            {item.date}
                          </div>
                        )}
                        <div className={`text-sm font-semibold ${theme.text}`}>{item.title}</div>
                        {item.description && (
                          <div className={`mt-0.5 text-xs ${theme.muted}`}>{item.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              if (b.type === "countdown") {
                return (
                  <CountdownBlockView
                    key={b.id}
                    block={b}
                    spanClass={spanClass}
                    animateClass={animateClass}
                    vtStyle={vtStyle}
                    theme={theme}
                    cardClass={cardClass}
                  />
                );
              }

              if (b.type === "faq") {
                const items = b.faqItems ?? [];
                if (items.length === 0) return null;
                const defaultOpen = b.faqDefaultOpen ?? "none";
                const defaultValue =
                  defaultOpen === "all"
                    ? items.map((it) => it.id)
                    : defaultOpen === "first"
                      ? [items[0].id]
                      : [];
                return (
                  <div key={b.id} style={vtStyle} className={`${spanClass} ${animateClass}`}>
                    <Accordion
                      type="multiple"
                      defaultValue={defaultValue}
                      className={`overflow-hidden rounded-2xl px-4 ${cardClass}`}
                    >
                      {items.map((item) => (
                        <AccordionItem key={item.id} value={item.id} className="border-white/10">
                          <AccordionTrigger className={`text-sm font-medium ${theme.text}`}>
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className={`text-xs ${theme.muted}`}>
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              }

              return (
                <a
                  key={b.id}
                  href={b.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={vtStyle}
                  className={`${spanClass} ${stretch} ${animateClass} flex items-center justify-center rounded-2xl px-5 py-4 text-center text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 active:scale-[0.99] ${cardClass} ${theme.text}`}
                >
                  {b.title}
                </a>
              );
            })}

            {blocks.length === 0 && (
              <div
                className={`col-span-2 rounded-2xl border border-dashed border-white/15 py-10 text-center text-sm ${theme.muted}`}
              >
                Add your first block
              </div>
            )}
          </div>

          <div className={`mt-6 text-center text-[11px] ${theme.muted}`}>Made with Linqo.</div>
        </div>
      </div>

      {profile.particles?.enabled && <ParticleStage particles={profile.particles} />}
    </div>
  );

  const hasMusic = !!(profile.music?.enabled && profile.music.url);
  const hasAmbient = !!(
    profile.ambient?.enabled && (profile.ambient.layers ?? []).some((l) => l.enabled && l.url)
  );
  // Independent of both — see MusicSettings.visualizerEnabled. Only takes
  // over the corner when neither of the widgets above already has a real
  // control (play/pause, mute) to put there.
  const visualizerOnly = !hasMusic && !hasAmbient && !!profile.music?.visualizerEnabled;

  // Rendered as a sibling of the scrolling content (not inside it) so it
  // stays pinned in view rather than scrolling away with the page. The
  // ambient bed always mounts (renders nothing with no active layers) so
  // its refs are ready the instant either widget below wants to unlock it.
  const ambientBed = <AmbientSoundBed ref={ambientBedRef} ambient={profile.ambient} />;
  const musicWidget = hasMusic ? (
    <NowPlayingWidget
      music={profile.music!}
      slug={profile.slug}
      framed={framed}
      ambientBedRef={ambientBedRef}
    />
  ) : hasAmbient ? (
    <AmbientOnlyWidget slug={profile.slug} framed={framed} ambientBedRef={ambientBedRef} />
  ) : visualizerOnly ? (
    <VisualizerOnlyWidget music={profile.music!} framed={framed} />
  ) : null;

  if (!framed)
    return (
      <>
        {content}
        {ambientBed}
        {musicWidget}
      </>
    );

  return (
    <div className="sticky top-20 mx-auto w-[320px]">
      <div className="relative rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-900" />
        <div className="h-[640px] overflow-y-auto rounded-[2rem]">{content}</div>
        {ambientBed}
        {musicWidget}
      </div>
    </div>
  );
}

type ThemeStyle = (typeof THEMES)[keyof typeof THEMES];

function HeadingBlockView({
  block,
  spanClass,
  animateClass,
  vtStyle,
  theme,
  accentColor,
}: {
  block: LinkBlock;
  spanClass: string;
  animateClass: string;
  vtStyle: React.CSSProperties;
  theme: ThemeStyle;
  accentColor?: string;
}) {
  const font = getHeadingFont(block.headingFont);
  const size = HEADING_SIZES[block.headingSize ?? "sm"] ?? HEADING_SIZES.sm;
  const hasGradient = !!(
    block.headingUseGradient &&
    block.headingGradientFrom &&
    block.headingGradientTo
  );
  // A custom solid color and a two-stop gradient are the same rendering path
  // here (a background-clip:text gradient whose stops happen to match for
  // "solid") — see .heading-color-melt in styles.css. That's what lets the
  // browser genuinely interpolate the color when switching modes, instead of
  // cutting between two different rendering models.
  const usesMelt = hasGradient || !!block.headingColor;
  const meltFrom = hasGradient ? block.headingGradientFrom! : (block.headingColor ?? "#f97316");
  const meltTo = hasGradient ? block.headingGradientTo! : (block.headingColor ?? "#f97316");
  // underline + line-through are both `text-decoration-line` — stacking the
  // two Tailwind classes would just have one clobber the other, so combine
  // them into one inline value.
  const decorations = [
    block.headingUnderline && "underline",
    block.headingStrikethrough && "line-through",
  ]
    .filter(Boolean)
    .join(" ");
  const textStyle: React.CSSProperties & {
    "--heading-stop-1"?: string;
    "--heading-stop-2"?: string;
  } = {
    fontFamily: font.family,
    textDecorationLine: decorations || undefined,
  };
  if (usesMelt) {
    textStyle["--heading-stop-1"] = meltFrom;
    textStyle["--heading-stop-2"] = meltTo;
  } else {
    // Plain default heading (no custom color/gradient) — theme.accent (a
    // Tailwind class) still drives it below; this only overrides when the
    // page has an explicit Accent Color set, so unset behaves byte-
    // identical to before Accent Color existed.
    textStyle.color = accentColor || undefined;
  }

  const textRef = useRef<HTMLSpanElement>(null);
  const isFirstRun = useRef(true);
  // Replays the swap-in entrance on the actual heading text whenever a
  // non-continuous style trait changes — font or background. Color and size
  // are excluded: solid <-> gradient animates via .heading-color-melt, and
  // font-size/line-height via .heading-size-transition. Skips the very first
  // mount since the block's own slide-up entrance already covers that
  // moment.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const el = textRef.current;
    if (!el) return;
    el.classList.remove("animate-swap-in");
    void el.offsetWidth;
    el.classList.add("animate-swap-in");
  }, [font.key, block.headingBgColor]);

  return (
    <h2 style={vtStyle} className={`${spanClass} ${animateClass} mt-2 text-center`}>
      <span
        style={{ backgroundColor: block.headingBgColor || undefined }}
        className={block.headingBgColor ? "inline-block rounded-full px-4 py-1.5" : undefined}
      >
        <span
          ref={textRef}
          style={textStyle}
          className={`${size.className} heading-size-transition tracking-widest underline-offset-4 ${
            (block.headingUppercase ?? true) ? "uppercase" : ""
          } ${block.headingBold ? "font-extrabold" : "font-semibold"} ${
            block.headingItalic ? "italic" : ""
          } ${usesMelt ? "heading-color-melt" : theme.accent}`}
        >
          {block.title}
        </span>
      </span>
    </h2>
  );
}

function CountdownBlockView({
  block,
  spanClass,
  animateClass,
  vtStyle,
  theme,
  cardClass,
}: {
  block: LinkBlock;
  spanClass: string;
  animateClass: string;
  vtStyle: React.CSSProperties;
  theme: ThemeStyle;
  cardClass: string;
}) {
  // A plain 1s interval, not requestAnimationFrame — this only ever needs to
  // repaint once a second, and setInterval is cheaper to keep alive across
  // however many countdown blocks a page has.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = block.countdownTarget ? new Date(block.countdownTarget).getTime() : NaN;
  const remainingMs = Number.isFinite(target) ? target - now : NaN;
  const expired = !Number.isFinite(remainingMs) || remainingMs <= 0;
  const style = block.countdownStyle ?? "digits";

  const totalSeconds = Math.max(0, Math.floor((remainingMs || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div key={block.id} style={vtStyle} className={`${spanClass} ${animateClass} text-center`}>
      {block.countdownLabel && (
        <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${theme.muted}`}>
          {block.countdownLabel}
        </div>
      )}
      {expired ? (
        <div className={`text-lg font-semibold ${theme.text}`}>
          {block.countdownExpiredMessage || "We're live!"}
        </div>
      ) : style === "words" ? (
        <div className={`text-sm font-medium ${theme.text}`}>
          {days > 0 ? `${days}d ` : ""}
          {hours}h {minutes}m {seconds}s
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {[
            { v: days, l: "Days" },
            { v: hours, l: "Hrs" },
            { v: minutes, l: "Min" },
            { v: seconds, l: "Sec" },
          ].map((unit) => (
            <div key={unit.l} className={`min-w-[3.25rem] rounded-xl px-2 py-2.5 ${cardClass}`}>
              <div className={`text-lg font-bold tabular-nums ${theme.text}`}>
                {String(unit.v).padStart(2, "0")}
              </div>
              <div className={`text-[10px] uppercase tracking-wide ${theme.muted}`}>{unit.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const WIDGET_POSITION_CLASS: Record<MusicVisualizerPosition, string> = {
  left: "left-4",
  center: "left-1/2 -translate-x-1/2",
  right: "right-4",
};

// A returning visitor who already opted into audio once gets it resumed
// without another tap; storage is a nicety layered on top of the real gate
// (the browser's own autoplay permission), never load-bearing on its own.
const AUDIO_OPT_IN_PREFIX = "linqo_audio_opt_in_";

function markAudioOptedIn(slug: string) {
  try {
    localStorage.setItem(`${AUDIO_OPT_IN_PREFIX}${slug}`, "1");
  } catch {
    // Storage can be unavailable (private mode, disabled) — never block the
    // tap-to-play flow on it.
  }
}

function hasAudioOptedIn(slug: string): boolean {
  try {
    return localStorage.getItem(`${AUDIO_OPT_IN_PREFIX}${slug}`) === "1";
  } catch {
    return false;
  }
}

function NowPlayingWidget({
  music,
  slug,
  framed,
  ambientBedRef,
}: {
  music: MusicSettings;
  slug: string;
  framed: boolean;
  ambientBedRef: RefObject<AmbientSoundBedHandle | null>;
}) {
  const [playing, setPlaying] = useState(false);
  // Flips on if the CORS-enabled load fails for any reason, so the track
  // still plays (without a visualizer) instead of not playing at all.
  const [corsFailed, setCorsFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { ensure, analyserRef } = useAudioAnalyser(audioRef);
  // In the builder, auditioning the track in Background Music drives this
  // visualizer too (the editor's own player is the one making sound).
  const trackPreview = usePreviewPlayback();
  const trackPlaying = framed && trackPreview.playing && !!trackPreview.analyserRef;
  const genre = MUSIC_GENRES[music.genre ?? "lofi"] ?? MUSIC_GENRES.lofi;
  const visualizer = music.visualizer ?? "bars";
  const position = music.visualizerPosition ?? "right";
  // Unset defaults to on — this widget only ever renders once music is
  // already playing (see `hasMusic`), so that matches its original,
  // always-visualizer behavior for profiles saved before this toggle
  // existed. Explicitly off hides the visualizer only — playback is
  // unaffected, since the visualizer is never the play control.
  const showVisualizer = music.visualizerEnabled ?? true;
  const useCors = isOwnTrackUrl(music.url) && !corsFailed;

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = (music.volume ?? 70) / 100;
  }, [music.volume]);

  // Visitor-side only (never the builder preview, per `framed`). Browsers
  // only actually honor this once they've independently decided the site
  // has enough prior engagement to allow it — this is a best-effort nudge,
  // silently swallowed otherwise, with the existing tap button as fallback.
  useEffect(() => {
    if (framed || !hasAudioOptedIn(slug)) return;
    const audio = audioRef.current;
    if (!audio) return;
    ensure();
    audio.play().catch(() => {});
    ambientBedRef.current?.unlockAll();
    // Attempted once on mount only — re-running on every music/ambient edit
    // would fight a visitor's own subsequent pause.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framed, slug]);

  // The visualizer itself is decorative and no longer a play/pause control.
  // Browsers still require a user gesture before audio may start, so the
  // first tap/click/key anywhere on the page (the phone frame in the
  // builder) starts playback instead — never a tap on the visualizer.
  useEffect(() => {
    const root = wrapRef.current;
    const target: EventTarget | null = framed ? (root?.parentElement ?? null) : document;
    if (!target) return;
    const events = ["click", "touchend", "keydown"] as const;
    const start = () => {
      for (const e of events) target.removeEventListener(e, start);
      const audio = audioRef.current;
      if (!audio) return;
      // Must run in this same gesture's call stack, alongside audio.play() —
      // see useAudioAnalyser for why. Ambient layers fan out from the same
      // gesture instead of needing their own separate tap.
      ensure();
      audio.play().catch(() => {});
      ambientBedRef.current?.unlockAll();
      if (!framed) markAudioOptedIn(slug);
    };
    for (const e of events) target.addEventListener(e, start);
    return () => {
      for (const e of events) target.removeEventListener(e, start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framed, slug]);

  return (
    <div
      ref={wrapRef}
      className={`${framed ? "absolute" : "fixed"} bottom-4 z-20 ${WIDGET_POSITION_CLASS[position]}`}
    >
      <audio
        ref={audioRef}
        src={useCors && music.url ? corsTrackSrc(music.url) : music.url}
        crossOrigin={useCors ? "anonymous" : undefined}
        onError={() => {
          if (useCors) setCorsFailed(true);
        }}
        loop={music.loop ?? true}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {showVisualizer && (
        <div
          aria-hidden
          className="pointer-events-none grid place-items-center rounded-full p-2"
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
        >
          <AudioVisualizer
            analyserRef={trackPlaying ? trackPreview.analyserRef! : analyserRef}
            playing={playing || trackPlaying}
            // "off" only exists as a leftover value from before the widget
            // was visualizer-only — there's no icon/label to fall back to
            // anymore, so it now just means "use the default style".
            style={visualizer === "off" ? "bars" : visualizer}
            size={music.visualizerSize ?? "md"}
            color={
              music.visualizerColor ||
              (genre.light ? "rgba(23,23,23,0.9)" : "rgba(255,255,255,0.95)")
            }
            opacity={music.visualizerOpacity}
            roundness={music.visualizerRoundness}
            speed={music.visualizerSpeed}
          />
        </div>
      )}
    </div>
  );
}

// The tap-to-enable affordance for pages with Ambient Sounds but no
// Background Music — same gesture-gated unlock and opt-in memory as
// NowPlayingWidget, minus the visualizer (there's no analyser to draw).
function AmbientOnlyWidget({
  slug,
  framed,
  ambientBedRef,
}: {
  slug: string;
  framed: boolean;
  ambientBedRef: RefObject<AmbientSoundBedHandle | null>;
}) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (framed || !hasAudioOptedIn(slug)) return;
    ambientBedRef.current?.unlockAll();
    setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framed, slug]);

  const toggle = () => {
    if (playing) {
      ambientBedRef.current?.pauseAll();
      setPlaying(false);
    } else {
      ambientBedRef.current?.unlockAll();
      setPlaying(true);
      if (!framed) markAudioOptedIn(slug);
    }
  };

  return (
    <div className={`${framed ? "absolute" : "fixed"} bottom-4 right-4 z-20`}>
      <button
        type="button"
        onClick={toggle}
        className="grid cursor-pointer place-items-center rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-transform duration-300 hover:scale-110 active:scale-95"
        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
        aria-label={playing ? "Pause ambient sound" : "Play ambient sound"}
      >
        {playing ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </div>
  );
}

// The visualizer, on its own, for a page with Background Music off but
// MusicSettings.visualizerEnabled on. With no track there is nothing to
// react to, so it stays in AudioVisualizer's static resting pose — it only
// moves while music is actually playing (NowPlayingWidget). Only rendered
// when neither NowPlayingWidget nor AmbientOnlyWidget already occupies this
// corner with a real, functional control.
function VisualizerOnlyWidget({ music, framed }: { music: MusicSettings; framed: boolean }) {
  const fallbackAnalyser = useRef<AnalyserNode | null>(null);
  const trackPreview = usePreviewPlayback();
  const trackPlaying = framed && trackPreview.playing && !!trackPreview.analyserRef;
  const visualizer = music.visualizer ?? "bars";
  const position = music.visualizerPosition ?? "right";

  return (
    <div
      aria-hidden
      className={`pointer-events-none ${framed ? "absolute" : "fixed"} bottom-4 z-20 ${WIDGET_POSITION_CLASS[position]}`}
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
    >
      <AudioVisualizer
        analyserRef={trackPlaying ? trackPreview.analyserRef! : fallbackAnalyser}
        playing={trackPlaying}
        style={visualizer === "off" ? "bars" : visualizer}
        size={music.visualizerSize ?? "md"}
        color={music.visualizerColor || "rgba(255,255,255,0.95)"}
        opacity={music.visualizerOpacity}
        roundness={music.visualizerRoundness}
        speed={music.visualizerSpeed}
      />
    </div>
  );
}
