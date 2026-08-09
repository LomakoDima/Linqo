import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight, Palette, Share2, LayoutPanelTop, Zap } from "lucide-react";
import { LinkPreview } from "@/components/LinkPreview";
import { Reveal } from "@/components/Reveal";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/lib/auth-context";
import { exampleProfile } from "@/lib/example-profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linqo — Build your personal page, without code" },
      {
        name: "description",
        content:
          "Build your personal page, without code. Pick a theme, add your links and music, and make it unmistakably yours.",
      },
      { property: "og:title", content: "Linqo — Build your personal page, without code" },
      {
        property: "og:description",
        content: "Build your personal page, without code — no design skills required.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: LayoutPanelTop,
    title: "Turn a bio link into a real page",
    body: "One link, everywhere you post it — leading somewhere that actually looks like you, not a list of buttons.",
  },
  {
    icon: Palette,
    title: "Make it look like you",
    body: "5 hand-tuned themes — Midnight, Paper, Sunset, Ocean, Forest. Switch anytime, no design skills required.",
  },
  {
    icon: Share2,
    title: "Connect everything you create",
    body: "Instagram to Discord, Spotify to Threads, plus email and phone as their own contact block.",
  },
  {
    icon: Zap,
    title: "Nothing to host",
    body: "Save your page to your account and share the link. We handle the rest.",
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
  const { user, signOut } = useAuth();

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
            <span className="ml-2 hidden border-l border-border/60 pl-3 text-xs font-medium text-muted-foreground sm:inline">
              Build your personal page, without code.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Button asChild size="sm">
                  <Link to="/build">
                    Continue building <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <UserMenu
                  user={user}
                  onSignOut={() => {
                    void signOut();
                  }}
                />
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/build">
                    Start building <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 overflow-hidden px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              color: "var(--color-foreground)",
              opacity: 0.05,
            }}
          />
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
              Your internet home.
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl animate-slide-up delay-100">
              Design a page
              <br />
              people remember.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground animate-slide-up delay-200">
              Build your personal page, without code. Pick a theme, add your links and music, and
              share one page that's unmistakably yours — create a free account to save and publish.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-slide-up delay-300">
              <Button asChild size="lg">
                <Link to="/build">
                  {user ? "Continue building" : "Start building"}{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground animate-slide-up delay-400">
              <span>Free account</span>
              <span>5 themes</span>
              <span>20+ socials</span>
              <span>Custom music</span>
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
              It takes about a minute — create a free account, add your links, and you're live.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/build">
                {user ? "Continue building" : "Start building"}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
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
