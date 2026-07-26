import { useEffect, useRef, useState } from "react";
import {
  BANNER_STYLES,
  HEADING_SIZES,
  IMAGE_SHAPES,
  MUSIC_GENRES,
  THEMES,
  bannerPatternUrl,
  isLightHex,
  mailtoHref,
  resolveTextRuns,
  telHref,
  textRunsAreEmpty,
  type LinkBlock,
  type MusicSettings,
  type Profile,
  type SocialKind,
} from "@/lib/link-store";
import { getHeadingFont, loadGoogleFont } from "@/lib/fonts";
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
  Play,
  Pause,
} from "lucide-react";

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
    <div className={`relative min-h-full w-full isolate hyphens-auto break-words ${theme.bg}`}>
      {profile.bgImage && (
        <>
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.bgImage})` }}
          />
          <div className="absolute inset-0 -z-10 bg-black/45" />
        </>
      )}
      <div className="h-28 w-full overflow-hidden">
        {profile.coverType === "color" ? (
          <div
            className={`h-full w-full ${BANNER_STYLES[profile.coverStyle ?? "dark"].gradient}`}
          />
        ) : profile.cover ? (
          <img src={profile.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full ${theme.card}`} />
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
                          className={`grid h-11 w-11 place-items-center rounded-full ${theme.card} transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-md hover:brightness-110`}
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
                        className={`block rounded-2xl px-5 py-4 text-center text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 active:scale-[0.99] ${theme.card} ${theme.text}`}
                      >
                        {b.email}
                      </a>
                    )}
                    {showPhone && (
                      <a
                        href={telHref(b.phone!)}
                        className={`block rounded-2xl px-5 py-4 text-center text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 active:scale-[0.99] ${theme.card} ${theme.text}`}
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
                          className={`absolute inset-0 opacity-70 ${
                            isLight ? "mix-blend-multiply" : "mix-blend-screen"
                          }`}
                          style={{
                            backgroundImage: bannerPatternUrl(
                              b.bannerPattern ?? "honeycomb",
                              isLight,
                            ),
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

              return (
                <a
                  key={b.id}
                  href={b.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={vtStyle}
                  className={`${spanClass} ${stretch} ${animateClass} flex items-center justify-center rounded-2xl px-5 py-4 text-center text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 active:scale-[0.99] ${theme.card} ${theme.text}`}
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
    </div>
  );

  // Rendered as a sibling of the scrolling content (not inside it) so it
  // stays pinned in view rather than scrolling away with the page.
  const musicWidget =
    profile.music?.enabled && profile.music.url ? (
      <NowPlayingWidget music={profile.music} framed={framed} />
    ) : null;

  if (!framed)
    return (
      <>
        {content}
        {musicWidget}
      </>
    );

  return (
    <div className="sticky top-8 mx-auto w-[320px]">
      <div className="relative rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-900" />
        <div className="h-[640px] overflow-y-auto rounded-[2rem]">{content}</div>
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
}: {
  block: LinkBlock;
  spanClass: string;
  animateClass: string;
  vtStyle: React.CSSProperties;
  theme: ThemeStyle;
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

function NowPlayingWidget({ music, framed }: { music: MusicSettings; framed: boolean }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const genre = MUSIC_GENRES[music.genre ?? "lofi"] ?? MUSIC_GENRES.lofi;
  const fg = genre.light ? "text-neutral-900" : "text-white";

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = (music.volume ?? 70) / 100;
  }, [music.volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  };

  return (
    <div className={`${framed ? "absolute" : "fixed"} bottom-4 right-4 z-20`}>
      <audio
        ref={audioRef}
        src={music.url}
        loop={music.loop ?? true}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-2 rounded-full py-2 pl-2 pr-3.5 shadow-lg ring-1 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 ${genre.gradient} ${genre.ring}`}
        aria-label={playing ? "Pause background music" : "Play background music"}
      >
        <span
          className={`grid h-6 w-6 place-items-center rounded-full ${genre.light ? "bg-black/10" : "bg-white/20"}`}
        >
          {playing ? (
            <Pause className={`h-3 w-3 ${fg}`} fill="currentColor" />
          ) : (
            <Play className={`h-3 w-3 ${fg}`} fill="currentColor" />
          )}
        </span>
        <span className={`text-xs font-medium ${fg}`}>{genre.label}</span>
        {playing && (
          <span className="flex h-3 items-end gap-0.5">
            <span
              className={`w-0.5 animate-eq-bar rounded-full ${genre.light ? "bg-neutral-900" : "bg-white"}`}
              style={{ animationDelay: "0ms" }}
            />
            <span
              className={`w-0.5 animate-eq-bar rounded-full ${genre.light ? "bg-neutral-900" : "bg-white"}`}
              style={{ animationDelay: "160ms" }}
            />
            <span
              className={`w-0.5 animate-eq-bar rounded-full ${genre.light ? "bg-neutral-900" : "bg-white"}`}
              style={{ animationDelay: "320ms" }}
            />
          </span>
        )}
      </button>
    </div>
  );
}
