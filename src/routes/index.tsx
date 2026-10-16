import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkPreview } from "@/components/LinkPreview";
import { PagePreviewThumb } from "@/components/PagePreviewThumb";
import { Reveal } from "@/components/Reveal";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/lib/auth-context";
import { exampleProfile } from "@/lib/example-profile";
import {
  AMBIENT_SOUNDS,
  MUSIC_GENRES,
  THEMES,
  type Profile,
  type ThemeName,
} from "@/lib/link-store";
import { BLOCK_REGISTRY } from "@/lib/block-registry/registry";
import { PARTICLE_KINDS } from "@/lib/atmosphere-engine/particle-kinds";
import { TEMPLATES, previewProfileForTemplate } from "@/lib/templates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linqo — Build your personal page, without code" },
      {
        name: "description",
        content:
          "Build your personal page, without code. Start from a template, make it look like you, and share one link.",
      },
      { property: "og:title", content: "Linqo — Build your personal page, without code" },
      {
        property: "og:description",
        content:
          "Build your personal page, without code — start from a template and share one link.",
      },
    ],
  }),
  component: LandingPage,
});

// Every number on this page is read from the same registries the builder
// uses, so the copy can't drift from what the product actually ships.
const COUNTS = {
  themes: Object.keys(THEMES).length,
  templates: TEMPLATES.length,
  blocks: Object.keys(BLOCK_REGISTRY).length,
  genres: Object.keys(MUSIC_GENRES).length,
  ambient: Object.keys(AMBIENT_SOUNDS).length,
  particles: Object.keys(PARTICLE_KINDS).length,
};

// A short, deliberately varied set for the hero's live theme switcher.
const HERO_THEMES: ThemeName[] = ["sunset", "dark", "light", "ocean", "forest", "grape", "cream"];

// Templates shown on the landing page — chosen for how different they look.
const SHOWCASE_IDS = ["creator", "portfolio", "developer", "musician", "student"];

const STEPS = [
  {
    tab: "Templates",
    title: "Start from a layout",
    body: `Pick one of ${COUNTS.templates} starting points — from a blank canvas to a creator, portfolio or developer page — and preview it before you commit.`,
  },
  {
    tab: "Content",
    title: "Add what you want people to see",
    body: `${COUNTS.blocks} block types: links, banners, headings, text, images, galleries, video, timelines, countdowns, FAQs and more. Drag to reorder.`,
  },
  {
    tab: "Appearance",
    title: "Make it look like you",
    body: `${COUNTS.themes} themes, your own accent colour and background, plus effects. Every change shows in the live phone preview.`,
  },
  {
    tab: "Publish",
    title: "Share one link",
    body: "Publish to a link with your own username, copy it, and put it anywhere you post.",
  },
];

const INCLUDED: [number, string, string][] = [
  [COUNTS.themes, "Themes", "Solid and gradient looks, each with its own accent."],
  [COUNTS.blocks, "Block types", "Links, banners, galleries, video, FAQ, countdown and more."],
  [COUNTS.templates, "Templates", "Seven categories, from blank canvas to creator and developer."],
  [COUNTS.genres, "Music vibes", "Background music with a visualizer you can switch on or off."],
  [COUNTS.ambient, "Ambient sounds", "Layer rain, fireplace, birds and more under your page."],
  [
    COUNTS.particles,
    "Particle effects",
    "Snow, fireflies, sakura and others drifting over the page.",
  ],
];

function LandingPage() {
  const { user, signOut } = useAuth();
  const [heroTheme, setHeroTheme] = useState<ThemeName>(exampleProfile.theme);
  const heroProfile = useMemo<Profile>(
    () => ({ ...exampleProfile, theme: heroTheme }),
    [heroTheme],
  );

  const blank = useMemo<Profile>(
    () => ({
      slug: "you",
      name: "Your name",
      bio: "",
      avatar: "",
      cover: "",
      theme: "dark",
      blocks: [],
    }),
    [],
  );
  const byId = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
  const sideA = useMemo(() => previewProfileForTemplate(blank, byId("developer")), [blank]);
  const sideB = useMemo(() => previewProfileForTemplate(blank, byId("musician")), [blank]);
  const showcase = useMemo(
    () =>
      SHOWCASE_IDS.map((id) => ({
        t: byId(id),
        profile: previewProfileForTemplate(blank, byId(id)),
      })),
    [blank],
  );

  const cta = user ? "Continue building" : "Start building";

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandMark id="header-wordmark-target" />
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
            <a href="#templates" className="text-muted-foreground hover:text-foreground">
              Templates
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">
              How it works
            </a>
            <a href="#included" className="text-muted-foreground hover:text-foreground">
              What&rsquo;s included
            </a>
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {user ? (
              <UserMenu
                user={user}
                onSignOut={() => {
                  void signOut();
                }}
              />
            ) : (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link to="/build">{cta}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-24 lg:pt-20">
          <div className="lg:col-span-6">
            <p className="eyebrow animate-slide-up">Personal pages · no code</p>
            <h1 className="font-display mt-5 animate-slide-up text-[2.5rem] font-medium leading-[1.04] delay-100 sm:text-6xl lg:text-[4.25rem]">
              A page that&rsquo;s <em className="font-normal italic text-brand-ink">yours</em>, not
              a list of buttons.
            </h1>
            <p className="mt-6 max-w-[34rem] animate-slide-up text-lg leading-relaxed text-muted-foreground delay-200">
              Linqo is a builder for personal pages. Start from a template, shape it with themes,
              blocks, music and effects, and share a single link that looks like you.
            </p>
            <div className="mt-8 flex animate-slide-up flex-wrap items-center gap-3 delay-300">
              <Button asChild size="lg">
                <Link to="/build">
                  {cta} <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#templates">Browse templates</a>
              </Button>
            </div>
            <p className="mt-5 animate-slide-up text-sm text-muted-foreground delay-400">
              Free account · {COUNTS.templates} templates · {COUNTS.themes} themes
            </p>
          </div>

          {/* The hero shows the real renderer: switching a theme below re-themes the
              very same page component the builder publishes. */}
          <div className="relative lg:col-span-6">
            <div className="relative mx-auto flex max-w-[26rem] items-start justify-center sm:max-w-none">
              <div
                aria-hidden
                className="absolute -left-2 top-16 hidden w-44 -rotate-3 overflow-hidden rounded-xl border border-border shadow-lg md:block lg:-left-6"
              >
                <PagePreviewThumb profile={sideA} aspect="3 / 4.4" crop={88} />
              </div>
              <div
                aria-hidden
                className="absolute -right-2 top-40 hidden w-44 rotate-3 overflow-hidden rounded-xl border border-border shadow-lg md:block lg:-right-6"
              >
                <PagePreviewThumb profile={sideB} aspect="3 / 4.4" crop={88} />
              </div>
              <div inert className="relative z-10 animate-slide-in-right delay-200">
                <LinkPreview profile={heroProfile} framed />
              </div>
            </div>

            <div
              role="radiogroup"
              aria-label="Try a theme on this example page"
              className="relative z-10 mx-auto mt-6 flex max-w-[22rem] flex-wrap items-center justify-center gap-2.5"
            >
              <span className="eyebrow w-full text-center">Try a theme</span>
              {HERO_THEMES.map((name) => {
                const active = heroTheme === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={THEMES[name].label}
                    title={THEMES[name].label}
                    onClick={() => setHeroTheme(name)}
                    className={`h-8 w-8 cursor-pointer rounded-full border border-border transition-transform duration-150 hover:scale-110 focus-visible:outline-offset-4 ${THEMES[name].bg} ${
                      active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="scroll-mt-14 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Templates</p>
                <h2 className="font-display mt-4 max-w-xl text-3xl font-medium leading-tight sm:text-4xl">
                  Start close to where you&rsquo;re going.
                </h2>
              </div>
              <p className="max-w-sm text-muted-foreground">
                Each one is a real page you can edit — a different layout, type and rhythm, not a
                recoloured copy.
              </p>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {showcase.map(({ t, profile }, i) => (
                <li key={t.id}>
                  <Reveal delay={i * 60}>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <PagePreviewThumb profile={profile} aspect="3 / 4.6" crop={88} />
                    </div>
                    <p className="mt-3 text-sm font-medium">{t.name}</p>
                    <p className="eyebrow mt-1.5">{t.tagline}</p>
                  </Reveal>
                </li>
              ))}
            </ul>

            <Button asChild variant="outline" className="mt-10">
              <Link to="/build">
                See all {COUNTS.templates} templates <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-14 border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
            <div className="lg:col-span-4">
              <p className="eyebrow">How it works</p>
              <h2 className="font-display mt-4 text-3xl font-medium leading-tight sm:text-4xl">
                Four tabs, one page.
              </h2>
              <p className="mt-4 max-w-sm text-muted-foreground">
                The builder follows the order you&rsquo;d work in, with a live preview beside you
                the whole way.
              </p>
            </div>
            <ol className="lg:col-span-8">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-t border-border py-6 first:border-t-0 first:pt-0 sm:grid-cols-[2.5rem_8rem_1fr]"
                >
                  <span className="eyebrow tabular pt-1.5">0{i + 1}</span>
                  <span className="eyebrow col-start-2 row-start-1 pt-1.5">{s.tab}</span>
                  <div className="col-start-2 mt-3 sm:col-start-3 sm:row-start-1 sm:mt-0">
                    <h3 className="font-display text-xl font-medium">{s.title}</h3>
                    <p className="mt-2 max-w-lg text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What's included — counts are read from the app's own registries */}
        <section id="included" className="scroll-mt-14 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="eyebrow">What&rsquo;s included</p>
            <h2 className="font-display mt-4 max-w-xl text-3xl font-medium leading-tight sm:text-4xl">
              More than links.
            </h2>
            <dl className="mt-10 grid border-t border-border sm:grid-cols-2 lg:grid-cols-3">
              {INCLUDED.map(([n, label, body]) => (
                <div key={label} className="border-b border-border py-6 sm:pr-8">
                  <dt className="flex items-baseline gap-3">
                    <span className="font-display tabular text-4xl font-medium">{n}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </dt>
                  <dd className="mt-2 max-w-xs text-sm text-muted-foreground">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Closing */}
        <section className="bg-foreground text-background">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-24">
            <h2 className="font-display max-w-2xl text-4xl font-medium leading-[1.05] sm:text-5xl">
              Make the page you&rsquo;d want to land on.
            </h2>
            <Button asChild size="lg" variant="brand">
              <Link to="/build">
                {cta} <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <span>© {new Date().getFullYear()} Linqo.</span>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link to="/build" className="hover:text-foreground">
              Open the builder
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
