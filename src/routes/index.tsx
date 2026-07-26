import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight, Palette, Share2, LayoutPanelTop, Zap } from "lucide-react";
import type { Profile } from "@/lib/link-store";
import { LinkPreview } from "@/components/LinkPreview";
import { Reveal } from "@/components/Reveal";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

const exampleProfile: Profile = {
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linqo — the multi-link builder" },
      {
        name: "description",
        content:
          "One link for every platform. Build a beautiful all-links page in a minute — no sign-up, no backend.",
      },
      { property: "og:title", content: "Linqo — the multi-link builder" },
      {
        property: "og:description",
        content: "One link for every platform. Build a beautiful all-links page in a minute.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Palette,
    title: "5 hand-tuned themes",
    body: "Midnight, Paper, Sunset, Ocean, Forest — switch anytime, no design skills required.",
  },
  {
    icon: Share2,
    title: "20+ networks",
    body: "Instagram to Discord, Spotify to Threads, plus email and phone as their own contact block.",
  },
  {
    icon: LayoutPanelTop,
    title: "Rich blocks",
    body: "Links, banners, headings, and images — arrange and reorder them however you like.",
  },
  {
    icon: Zap,
    title: "Nothing to host",
    body: "Your page is encoded right into the link. Share it anywhere, no account or server needed.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Add your content",
    body: "Drop in links, a banner, your socials, and a contact block.",
  },
  {
    n: "02",
    title: "Pick a theme",
    body: "Choose from 5 curated looks. The preview updates live as you go.",
  },
  {
    n: "03",
    title: "Share your link",
    body: "Copy it and post it anywhere. That's the whole page, done.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur animate-fade-in">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground animate-scale-in">
              <Rocket className="h-4 w-4" />
            </div>
            <AnimatedWordmark
              id="header-wordmark-target"
              text="Linqo."
              delay={120}
              className="text-lg font-semibold tracking-tight"
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/build">
                Open builder <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 overflow-hidden px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div
            aria-hidden
            className="animate-blob pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-blob pointer-events-none absolute -bottom-24 -right-16 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
            style={{ animationDelay: "-8s" }}
          />
          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground animate-slide-up">
              One link. Every platform.
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl animate-slide-up delay-100">
              All your links,
              <br />
              one beautiful page.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground animate-slide-up delay-200">
              Linqo is a minimal link-in-bio builder. Add your socials, pick a theme, and share one
              link — no sign-up, no backend, live in seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-slide-up delay-300">
              <Button asChild size="lg">
                <Link to="/build">
                  Start building <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground animate-slide-up delay-400">
              <span>No sign-up</span>
              <span>No backend</span>
              <span>5 themes</span>
              <span>20+ socials</span>
            </div>
          </div>

          <div className="mx-auto animate-slide-in-right delay-200">
            <LinkPreview profile={exampleProfile} framed />
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything you need, nothing you don't
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <Reveal
                  key={f.title}
                  delay={i * 80}
                  className="rounded-xl border border-border bg-background p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <span className="text-sm font-semibold text-muted-foreground">{s.n}</span>
                <h3 className="mt-2 text-lg font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <Reveal className="mx-auto max-w-7xl px-6 py-20 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to build yours?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              It takes about a minute, and there's nothing to sign up for.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/build">
                Start building <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Linqo.</span>
          <Link to="/build" className="hover:text-foreground">
            Open the builder →
          </Link>
        </div>
      </footer>
    </div>
  );
}
