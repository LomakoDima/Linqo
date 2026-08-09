import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "@/components/notifications";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { forgotPassword, verifyResetCode, resetPassword } from "@/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Linqo" },
      { name: "description", content: "Reset your Linqo account password." },
    ],
  }),
  component: ResetPasswordPage,
});

type Step = "request" | "code" | "new-password";

const RESEND_COOLDOWN_S = 60;

function formatCooldown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setSubmitting(true);
    try {
      await forgotPassword(value);
      setEmail(value);
      setCode("");
      setStep("code");
      setCooldown(RESEND_COOLDOWN_S);
      toast.success("If that email has an account, a code is on its way");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6 || submitting) return;
    setSubmitting(true);
    try {
      const token = await verifyResetCode({ email, code });
      setResetToken(token);
      setStep("new-password");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    try {
      await forgotPassword(email);
      setCooldown(RESEND_COOLDOWN_S);
      toast.success("Code resent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resend the code");
    }
  }

  async function handleNewPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setSubmitting(true);
    try {
      await resetPassword({ resetToken, password });
      toast.success("Password updated — sign in with your new password");
      await navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-3 sm:p-6">
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

      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-[28px] border border-border bg-card p-8 shadow-2xl sm:p-10">
        <Link to="/" className="inline-flex w-fit items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-4 w-4" />
          </div>
          <AnimatedWordmark text="Linqo." className="text-lg font-semibold tracking-tight" />
        </Link>

        <div key={step} className="animate-swap-in mt-8">
          {step === "request" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email and we&rsquo;ll send you a code.
              </p>
              <form className="mt-8 flex flex-col gap-4" onSubmit={handleRequest}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    required
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                  {submitting ? "Sending…" : "Send code"}{" "}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <button
                type="button"
                onClick={() => setStep("request")}
                className="-ml-1.5 mb-5 flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <h1 className="text-2xl font-semibold tracking-tight">Enter the code</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="text-foreground">{email}</span>.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4">
                <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-11 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={code.length !== 6 || submitting}
                  onClick={handleVerify}
                >
                  {submitting ? "Verifying…" : "Verify code"}
                </Button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="cursor-pointer text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend code in ${formatCooldown(cooldown)}` : "Resend code"}
                </button>
              </div>
            </>
          )}

          {step === "new-password" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Signing in again everywhere else will require this new password.
              </p>
              <form className="mt-8 flex flex-col gap-4" onSubmit={handleNewPassword}>
                <div>
                  <Label htmlFor="password">New password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      name="password"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      autoFocus
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
                  <p className="mt-1.5 text-xs text-muted-foreground">At least 8 characters</p>
                </div>
                <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                  {submitting ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
