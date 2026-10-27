import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { EmailVerificationContent } from "@/components/auth/EmailVerificationContent";
import { confirmEmail, resendVerification } from "@/lib/auth-client";
import {
  pendingVerification,
  rememberVerification,
  clearVerificationHint,
} from "@/lib/email-verification";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [{ title: "Confirm email — Linqo" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: VerifyEmailPage,
});
function VerifyEmailPage() {
  const [state, setState] = useState<{ token: string | null; email: string; sent: boolean } | null>(
    null,
  );
  const initialized = useRef(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    // Fragments never reach the HTTP server. Remove the token from browser
    // history before any confirmation request; never persist it in storage.
    if (token)
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    setState({ token, ...pendingVerification() });
  }, []);
  return (
    <AuthShell>
      <div className="w-full">
        {state ? (
          <EmailVerificationContent
            token={state.token}
            initialEmail={state.email}
            initiallySent={state.sent}
            onConfirm={async (token) => {
              const result = await confirmEmail(token);
              clearVerificationHint();
              return result;
            }}
            onResend={async (email) => {
              await resendVerification(email);
              rememberVerification(email, true);
            }}
            onContinue={async (emailChange) => {
              await signOut();
              await navigate({
                to: "/login",
                search: { redirect: emailChange ? "/build" : "/welcome" },
              });
            }}
          />
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Opening confirmation…
          </p>
        )}
        <Link
          to="/login"
          className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
