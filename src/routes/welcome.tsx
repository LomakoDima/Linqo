import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WelcomeModal } from "@/components/WelcomeModal";
import { useAuth } from "@/lib/auth-context";

// Landing target for a brand-new OAuth signup (see backend/routes/auth.ts
// callbacks) — a hard server redirect can't hand the SPA any local state,
// so this route exists purely to show the same WelcomeModal the
// email/password signup path shows inline on /login.
export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — Linqo" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return null;

  return (
    <WelcomeModal
      open
      firstName={user.name.split(" ")[0]}
      onContinue={() => navigate({ to: "/onboarding" })}
      onSkip={() => navigate({ to: "/build" })}
    />
  );
}
