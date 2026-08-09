import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "@/components/notifications";
import { Rocket, ArrowRight, ArrowLeft, Mail, Eye, EyeOff, Github, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LinkPreview } from "@/components/LinkPreview";
import { exampleProfile } from "@/lib/example-profile";
import { useAuth } from "@/lib/auth-context";
import { googleSignInUrl, githubSignInUrl } from "@/lib/auth-client";
import { WelcomeModal } from "@/components/WelcomeModal";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; oauthError?: string } => ({
    ...(typeof search.redirect === "string" ? { redirect: search.redirect } : {}),
    ...(typeof search.oauthError === "string" ? { oauthError: search.oauthError } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Linqo" },
      {
        name: "description",
        content: "Sign in to your Linqo account or create a new one to save and publish your page.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup";

// OAuth and passkeys have no real provider wired up (that's a separate
// integration — app registration, secrets, callback routes per provider) —
// everything else on this page (email/password, sessions, redirects) is real.
function notWiredYet() {
  toast.info("Preview only — this sign-in method isn't wired up yet");
}

function LoginPage() {
  const { redirect, oauthError } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [emailStep, setEmailStep] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set right after a successful signup — the redirect effect below has to
  // stand down while the welcome modal is up, or it'd navigate away the
  // instant `user` becomes truthy, before the modal ever shows.
  const [justSignedUp, setJustSignedUp] = useState(false);

  // Already signed in (e.g. followed an old /login link, or a protected
  // route bounced them here before the session check finished) — there's
  // nothing for them to do on this page.
  useEffect(() => {
    if (!authLoading && user && !justSignedUp) navigate({ to: redirect ?? "/build" });
  }, [authLoading, user, redirect, navigate, justSignedUp]);

  // The OAuth callback redirects failures back here with ?oauthError=... —
  // show it once, then drop it from the URL so a refresh doesn't replay it.
  useEffect(() => {
    if (!oauthError) return;
    toast.error(oauthError);
    navigate({ to: "/login", search: redirect ? { redirect } : {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthError]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn({ email, password });
        await navigate({ to: redirect ?? "/build" });
      } else {
        const name = String(data.get("name") ?? "").trim();
        await signUp({ name, email, password });
        setJustSignedUp(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const heading = mode === "signin" ? "Welcome back" : "Create your account";
  const subheading =
    mode === "signin"
      ? "Sign in to keep building your page."
      : "Set up your Linqo account in under a minute.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-3 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "var(--color-foreground)",
          opacity: 0.05,
        }}
      />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl animate-fade-in lg:h-[min(780px,88vh)] lg:grid-cols-[440px_1fr]">
        {/* Auth panel */}
        <div className="flex flex-col p-8 sm:p-10 lg:h-full">
          <Link to="/" className="inline-flex w-fit items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Rocket className="h-4 w-4" />
            </div>
            <AnimatedWordmark text="Linqo." className="text-lg font-semibold tracking-tight" />
          </Link>

          <div className="flex flex-1 flex-col justify-center py-10">
            <div key={`${mode}-${emailStep}`} className="animate-swap-in">
              {!emailStep ? (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>

                  <div className="mt-8 flex flex-col gap-3">
                    <OAuthButton
                      icon={<GoogleIcon className="h-4 w-4" />}
                      onClick={() => {
                        window.location.href = googleSignInUrl();
                      }}
                    >
                      Continue with Google
                    </OAuthButton>
                    <OAuthButton
                      icon={<AppleIcon className="h-4 w-4" />}
                      onClick={notWiredYet}
                      disabled
                    >
                      Continue with Apple (coming soon)
                    </OAuthButton>
                    <OAuthButton
                      icon={<Github className="h-4 w-4" />}
                      onClick={() => {
                        window.location.href = githubSignInUrl();
                      }}
                    >
                      Continue with GitHub
                    </OAuthButton>
                  </div>

                  <Divider />

                  <OAuthButton
                    icon={<Mail className="h-4 w-4" />}
                    onClick={() => setEmailStep(true)}
                  >
                    Continue with email
                  </OAuthButton>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEmailStep(false)}
                    className="-ml-1.5 mb-5 flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>

                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>

                  <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
                    {mode === "signup" && (
                      <div>
                        <Label htmlFor="name">Full name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Jane Doe"
                          autoComplete="name"
                          autoFocus
                          required
                          className="mt-1.5"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus={mode === "signin"}
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            onClick={() => navigate({ to: "/reset-password" })}
                            className="cursor-pointer text-xs font-medium text-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative mt-1.5">
                        <Input
                          id="password"
                          name="password"
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete={mode === "signin" ? "current-password" : "new-password"}
                          minLength={mode === "signup" ? 8 : undefined}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={showPw ? "Hide password" : "Show password"}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {mode === "signup" && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          At least 8 characters
                        </p>
                      )}
                    </div>

                    {mode === "signin" ? (
                      <div className="flex items-center gap-2.5">
                        <Checkbox id="remember" defaultChecked />
                        <Label
                          htmlFor="remember"
                          className="cursor-pointer font-normal text-muted-foreground"
                        >
                          Remember me for 30 days
                        </Label>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        By creating an account, you agree to our{" "}
                        <button
                          type="button"
                          onClick={notWiredYet}
                          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
                        >
                          Terms of Service
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={notWiredYet}
                          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
                        >
                          Privacy Policy
                        </button>
                        .
                      </p>
                    )}

                    <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                      {submitting
                        ? mode === "signin"
                          ? "Signing in…"
                          : "Creating account…"
                        : mode === "signin"
                          ? "Sign in"
                          : "Create account"}{" "}
                      {!submitting && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </form>
                </>
              )}

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to Linqo?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="cursor-pointer font-medium text-foreground hover:underline"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Product panel — the real preview component, framed as a phone. */}
        <div className="relative hidden items-center justify-center overflow-hidden bg-muted/30 lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              color: "var(--color-foreground)",
              opacity: 0.06,
            }}
          />
          <div
            aria-hidden
            className="animate-blob pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-blob pointer-events-none absolute -bottom-16 -right-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
            style={{ animationDelay: "-8s" }}
          />

          <p className="absolute left-8 top-8 text-sm font-medium text-muted-foreground">
            This is what you&rsquo;ll build
          </p>

          <div className="relative">
            <LinkPreview profile={exampleProfile} framed />
            <div className="absolute -right-8 top-20 hidden -rotate-3 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-lg xl:flex">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono">linqo.app/mayadesigns</span>
            </div>
          </div>
        </div>
      </div>

      <WelcomeModal
        open={justSignedUp}
        firstName={user?.name.split(" ")[0] ?? ""}
        onContinue={() => navigate({ to: "/onboarding" })}
        onSkip={() => navigate({ to: redirect ?? "/build" })}
      />
    </div>
  );
}

function OAuthButton({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex w-full cursor-pointer items-center justify-center rounded-full border border-input bg-background/50 px-4 py-3 text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-muted-foreground/30 hover:bg-muted/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input disabled:hover:bg-background/50"
    >
      <span className="absolute left-4 flex h-4 w-4 items-center justify-center">{icon}</span>
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M12 10.9v2.9h6.4c-.28 1.6-2 4.8-6.4 4.8-3.85 0-7-3.2-7-7.1s3.15-7.1 7-7.1c2.2 0 3.65.93 4.5 1.73l3-2.9C17.55 1.4 15.05.3 12 .3 5.7.3.6 5.5.6 11.5S5.7 22.7 12 22.7c6.9 0 11.4-4.85 11.4-11.68 0-.78-.08-1.38-.19-1.98H12Z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.207-2.98.804-.94 2.142-1.64 3.03-1.68.03.13.04.21.04.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.79-6.55 5.532-6.55 1.375 0 2.485.9 3.34.9.807 0 2.05-.95 3.58-.95.58 0 2.655.05 4.03 2.01-.105.07-2.41 1.41-2.41 4.31 0 3.45 3.023 4.66 3.06 4.68z"
      />
    </svg>
  );
}
