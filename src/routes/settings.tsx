import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "@/components/notifications";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { updateProfile, changePassword, deleteAccount } from "@/lib/auth-client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — Linqo" }],
  }),
  component: SettingsPage,
});

const DELETE_CONFIRM_WORD = "DELETE";

function SettingsPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, setUser } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { redirect: "/settings" } });
  }, [authLoading, user, navigate]);

  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isOAuthOnly = !user.hasPassword;

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const currentPassword = String(data.get("currentPassword") ?? "");

    setProfileSubmitting(true);
    try {
      const updated = await updateProfile({
        name,
        ...(email !== user!.email ? { email, currentPassword } : {}),
      });
      setUser(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update your profile");
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");

    setPasswordSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password changed");
      e.currentTarget.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change your password");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      setUser(null);
      toast.success("Account deleted");
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete your account");
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link
            to="/build"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to builder
          </Link>
          <div className="flex items-center gap-2">
            <AnimatedWordmark text="Linqo." className="text-sm font-semibold tracking-tight" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account.</p>

        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Profile</h2>
          <form className="mt-4 flex flex-col gap-4" onSubmit={handleProfileSubmit}>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={user.name} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                disabled={isOAuthOnly}
                required
                className="mt-1.5"
              />
            </div>
            {!isOAuthOnly && (
              <div>
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="Only needed if you're changing your email"
                  autoComplete="current-password"
                  className="mt-1.5"
                />
              </div>
            )}
            <Button type="submit" className="w-fit" disabled={profileSubmitting}>
              {profileSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Change password</h2>
          {isOAuthOnly ? (
            <p className="mt-1 text-sm text-muted-foreground">
              This account signed in with Google or GitHub and has no password yet.{" "}
              <Link to="/reset-password" className="text-primary hover:underline">
                Use "Forgot password"
              </Link>{" "}
              to set one.
            </p>
          ) : (
            <form className="mt-4 flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
              <div>
                <Label htmlFor="currentPw">Current password</Label>
                <Input
                  id="currentPw"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="newPw">New password</Label>
                <Input
                  id="newPw"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="mt-1.5"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">At least 8 characters</p>
              </div>
              <Button type="submit" className="w-fit" disabled={passwordSubmitting}>
                {passwordSubmitting ? "Changing…" : "Change password"}
              </Button>
            </form>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-destructive/30 bg-card p-6">
          <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleting your account is permanent. Any page you've published stays live at its link,
            but you won't be able to edit it anymore.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => {
              setDeleteConfirmText("");
              setDeleteOpen(true);
            }}
          >
            Delete account
          </Button>
        </section>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. Type {DELETE_CONFIRM_WORD} to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={DELETE_CONFIRM_WORD}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== DELETE_CONFIRM_WORD || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
