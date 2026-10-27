import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WelcomeModal } from "@/components/WelcomeModal";
import { useAuth } from "@/lib/auth-context";

// Welcome after OAuth registration, or the first sign-in after confirming
// an email/password registration.
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
