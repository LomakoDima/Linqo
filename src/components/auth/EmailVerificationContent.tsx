import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailVerificationContent({
  token,
  initialEmail,
  initiallySent,
  initialError = "",
  accountExists = false,
  onConfirm,
  onResend,
  onContinue,
}: {
  token: string | null;
  initialEmail: string;
  initiallySent: boolean;
  initialError?: string;
  accountExists?: boolean;
  onConfirm: (token: string) => Promise<{ emailChange: boolean }>;
  onResend: (email: string) => Promise<void>;
  onContinue: (emailChange: boolean) => void | Promise<void>;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(initiallySent);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState<{ emailChange: boolean } | null>(null);
  const [error, setError] = useState(initialError);
  const [cooldown, setCooldown] = useState(initiallySent ? 60 : 0);
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (verified) continueRef.current?.focus({ preventScroll: true });
  }, [verified]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  async function confirm() {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    try {
      setVerified(await onConfirm(token));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't confirm your email. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError("");
    try {
      await onResend(email.trim());
      setSent(true);
      setCooldown(60);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't send the email. Please try again.",
      );
      const wait = (error as { retryAfter?: number }).retryAfter;
      if (wait && wait > 0) setCooldown(Math.ceil(wait));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium leading-tight">
          {verified
            ? "Email confirmed."
            : token || !sent
              ? "Confirm your email."
              : "Check your inbox."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground" role="status">
          {verified
            ? verified.emailChange
              ? "Your new address is active. Sign in again to continue."
              : "Your account is ready. Sign in to start building your page."
            : token
              ? "Confirm this address to continue with Linqo. The link can only be used once and expires after 30 minutes."
              : accountExists
                ? sent
                  ? "Your account is saved. Open the confirmation link in your inbox to finish signing up. Check your spam folder too."
                  : "Your account is saved and is waiting for email confirmation. Request a new link to continue."
                : sent
                  ? "A confirmation link has been requested. If your account needs confirmation, check your inbox and spam folder."
                  : "Confirm your address before signing in. Request a link below to finish setting up your account."}
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-ui border border-destructive/40 px-3 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {verified ? (
        <Button
          ref={continueRef}
          className="w-full"
          size="lg"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onContinue(verified.emailChange);
            } catch {
              setError("Couldn't open sign-in. Please try again.");
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="animate-spin" />}Sign in
          <ArrowRight />
        </Button>
      ) : (
        <>
          {token && (
            <Button className="w-full" size="lg" onClick={confirm} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}Confirm email
              <ArrowRight />
            </Button>
          )}
          <form
            onSubmit={resend}
            className={`space-y-4 ${token ? "border-t border-border pt-6" : ""}`}
          >
            <div className="space-y-2">
              <Label htmlFor="confirmation-email">Email address</Label>
              <Input
                id="confirmation-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button
              type="submit"
              variant={token ? "outline" : "default"}
              className="w-full"
              disabled={busy || cooldown > 0}
            >
              {busy && <Loader2 className="animate-spin" />}
              {cooldown > 0
                ? `Send again in ${cooldown}s`
                : sent
                  ? "Resend confirmation"
                  : "Send confirmation link"}
            </Button>
          </form>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Only confirm an account or email change you requested. You can close this page after
            confirming.
          </p>
        </>
      )}
    </div>
  );
}
