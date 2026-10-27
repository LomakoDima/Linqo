import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/components/notifications";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { useAuth } from "@/lib/auth-context";
import { updateProfile, changePassword, deleteAccount, resendEmailChange } from "@/lib/auth-client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — Linqo" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, setUser } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { redirect: "/settings" } });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2
          aria-label="Loading account"
          className="h-6 w-6 animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link to="/build">
                <ArrowLeft className="h-4 w-4" /> Back to builder
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <SettingsContent
          key={user.id}
          user={user}
          onUpdateProfile={async (input) => {
            const updated = await updateProfile(input);
            setUser(updated);
            return updated;
          }}
          onChangePassword={changePassword}
          onResendEmailChange={resendEmailChange}
          onDeleteAccount={async () => {
            await deleteAccount();
            setUser(null);
            toast.success("Account deleted");
            await navigate({ to: "/" });
          }}
        />
      </main>
    </div>
  );
}
