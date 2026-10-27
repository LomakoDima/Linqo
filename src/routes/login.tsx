import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AlertCircle, Eye, EyeOff, Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { EmailVerificationContent } from "@/components/auth/EmailVerificationContent";
import { LinkPreview } from "@/components/LinkPreview";
import { rememberVerification, clearVerificationHint } from "@/lib/email-verification";
import { exampleProfile } from "@/lib/example-profile";
import { useAuth } from "@/lib/auth-context";
import {
  googleSignInUrl,
  githubSignInUrl,
  resendVerification,
  confirmEmail,
} from "@/lib/auth-client";

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
type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: Mode, v: { name: string; email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "signup" && !v.name) errors.name = "Tell us what to call you.";
  if (!v.email) errors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email)) errors.email = "That doesn’t look like an email address.";
  if (!v.password) errors.password = "Enter your password.";
  else if (mode === "signup" && v.password.length < 8)
    errors.password = "Use at least 8 characters.";
  return errors;
}

function LoginPage() {
  const { redirect, oauthError } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [verification, setVerification] = useState<{
    email: string;
    sent: boolean;
    error: string;
  } | null>(null);
  const submitLock = useRef(false);
  const destination = useRef<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  // A failure that isn't about one field (wrong password, network, an OAuth
  // callback bouncing back with ?oauthError) — shown above the button and
  // announced to screen readers, instead of a toast that disappears.
  const [formError, setFormError] = useState<string | null>(oauthError ?? null);
  const formRef = useRef<HTMLFormElement>(null);
  const ready = hydrated && !authLoading && !user;
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Already signed in (e.g. followed an old /login link, or a protected
  // route bounced them here before the session check finished) — there's
  // nothing for them to do on this page.
  useEffect(() => {
    if (!authLoading && user) navigate({ to: destination.current ?? redirect ?? "/build" });
  }, [authLoading, user, redirect, navigate]);

  // The OAuth callback redirects failures back here with ?oauthError=... —
  // keep it on screen, but drop it from the URL so a refresh doesn't replay it.
  useEffect(() => {
    if (!oauthError) return;
    setFormError(oauthError);
    navigate({ to: "/login", search: redirect ? { redirect } : {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthError]);

  function switchMode(next: Mode) {
    if (next === mode || submitting) return;
    setMode(next);
    setErrors({});
    setFormError(null);
    setShowPw(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || submitLock.current) return;
    const data = new FormData(e.currentTarget);
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      website: String(data.get("website") ?? ""),
    };
    const found = validate(mode, values);
    setErrors(found);
    setFormError(null);
    const firstBad = (["name", "email", "password"] as const).find((k) => found[k]);
    if (firstBad) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      if (mode === "signin") {
        destination.current = redirect ?? "/build";
        await signIn({ email: values.email, password: values.password });
        // The authenticated-user effect owns this redirect. Running both
        // paths used to start two competing navigations after sign-in.
      } else {
        const result = await signUp(values);
        rememberVerification(result.email, result.emailSent);
        setVerification({
          email: result.email,
          sent: result.emailSent,
          error: result.deliveryError ?? "",
        });
      }
    } catch (err) {
      destination.current = null;
      if ((err as { code?: string }).code === "EMAIL_VERIFICATION_REQUIRED") {
        rememberVerification(values.email, false);
        setVerification({
          email: values.email,
          sent: false,
          error:
            (err as { status?: number }).status === 503 && err instanceof Error ? err.message : "",
        });
        return;
      }
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  const signin = mode === "signin";

  return (
    <AuthShell
      aside={
        <figure inert className="flex flex-col items-center">
          <LinkPreview profile={exampleProfile} framed />
          <figcaption className="eyebrow mt-6 text-center !text-[oklch(0.7_0.012_80)]">
            An example page, built in Linqo
          </figcaption>
        </figure>
      }
    >
      <div className="w-full">
        {verification ? (
          <>
            <EmailVerificationContent
              token={null}
              initialEmail={verification.email}
              initiallySent={verification.sent}
              initialError={verification.error}
              accountExists
              onConfirm={confirmEmail}
              onResend={async (email) => {
                await resendVerification(email);
                rememberVerification(email, true);
              }}
              onContinue={() => {
                clearVerificationHint();
                setVerification(null);
                setMode("signin");
              }}
            />
            <Button
              type="button"
              variant="link"
              className="mt-6 h-auto p-0 text-muted-foreground"
              onClick={() => {
                clearVerificationHint();
                setVerification(null);
                setMode("signin");
                setFormError(null);
              }}
            >
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <div
              role="group"
              aria-label="Account"
              className="grid grid-cols-2 border-b border-border text-sm"
            >
              {(
                [
                  ["signin", "Sign in"],
                  ["signup", "Create account"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  disabled={!ready || submitting}
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                  className={`-mb-px h-11 cursor-pointer border-b-2 transition-colors duration-150 ${
                    mode === m
                      ? "border-foreground font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <h1 className="font-display mt-8 text-[2rem] font-medium leading-tight">
              {signin ? "Welcome back." : "Make your page."}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {signin
                ? "Sign in to keep building."
                : "Create a free account to save and publish your page."}
            </p>

            <form ref={formRef} method="post" noValidate onSubmit={handleSubmit} className="mt-7">
              <fieldset disabled={!ready || submitting} className="flex min-w-0 flex-col gap-4">
                {!signin && (
                  <Field id="name" label="Name" error={errors.name}>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                  </Field>
                )}
                {!signin && (
                  <div
                    aria-hidden="true"
                    className="absolute -left-[10000px] h-px w-px overflow-hidden"
                  >
                    <label htmlFor="registration-website">Leave this field empty</label>
                    <input
                      id="registration-website"
                      name="website"
                      type="text"
                      autoComplete="off"
                      tabIndex={-1}
                      maxLength={200}
                    />
                  </div>
                )}
                <Field id="email" label="Email" error={errors.email}>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                </Field>
                <Field
                  id="password"
                  label="Password"
                  error={errors.password}
                  hint={signin ? undefined : "At least 8 characters."}
                  action={
                    signin ? (
                      <Link to="/reset-password" className="text-xs text-brand-ink hover:underline">
                        Forgot password?
                      </Link>
                    ) : undefined
                  }
                >
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPw ? "text" : "password"}
                      autoComplete={signin ? "current-password" : "new-password"}
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password ? "password-error" : signin ? undefined : "password-hint"
                      }
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      aria-pressed={showPw}
                      className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-ui text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {formError && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-ui border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {formError}
                  </p>
                )}

                <Button type="submit" size="lg" disabled={!ready || submitting} className="w-full">
                  {submitting && <Loader2 className="animate-spin" aria-hidden />}
                  {submitting
                    ? signin
                      ? "Signing in…"
                      : "Creating account…"
                    : signin
                      ? "Sign in"
                      : "Create account"}
                </Button>
              </fieldset>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or continue with
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={!ready || submitting}
                onClick={() => {
                  window.location.href = googleSignInUrl();
                }}
              >
                <GoogleIcon className="h-4 w-4" /> Google
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!ready || submitting}
                onClick={() => {
                  window.location.href = githubSignInUrl();
                }}
              >
                <Github /> GitHub
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M12 10.9v2.9h6.4c-.28 1.6-2 4.8-6.4 4.8-3.85 0-7-3.2-7-7.1s3.15-7.1 7-7.1c2.2 0 3.65.93 4.5 1.73l3-2.9C17.55 1.4 15.05.3 12 .3 5.7.3.6 5.5.6 11.5S5.7 22.7 12 22.7c6.9 0 11.4-4.85 11.4-11.68 0-.78-.08-1.38-.19-1.98H12Z"
      />
    </svg>
  );
}
