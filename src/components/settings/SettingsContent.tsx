import { useId, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import type { AuthUser } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type Feedback = { kind: "success" | "error"; text: string } | null;

function FormFeedback({ value }: { value: Feedback }) {
  if (!value) return null;
  return (
    <p
      role={value.kind === "error" ? "alert" : "status"}
      className={`text-sm ${value.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}
    >
      {value.text}
    </p>
  );
}

export function SettingsContent({
  user,
  onUpdateProfile,
  onChangePassword,
  onDeleteAccount,
}: {
  user: AuthUser;
  onUpdateProfile: (input: {
    name: string;
    email?: string;
    currentPassword?: string;
  }) => Promise<void>;
  onChangePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}) {
  const id = useId();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [emailPassword, setEmailPassword] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<Feedback>(null);
  const [deleting, setDeleting] = useState(false);
  const emailChanged = user.hasPassword && email.trim() !== user.email;
  const profileChanged = name.trim() !== user.name || emailChanged;

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (profileSubmitting || !profileChanged) return;
    setProfileSubmitting(true);
    setProfileFeedback(null);
    try {
      await onUpdateProfile({
        name: name.trim(),
        ...(emailChanged ? { email: email.trim(), currentPassword: emailPassword } : {}),
      });
      setName(name.trim());
      setEmail(email.trim());
      setEmailPassword("");
      setProfileFeedback({ kind: "success", text: "Saved" });
    } catch (err) {
      setProfileFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Couldn't save your account details",
      });
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordSubmitting) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setPasswordSubmitting(true);
    setPasswordFeedback(null);
    try {
      await onChangePassword({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
      });
      form.reset();
      setPasswordFeedback({ kind: "success", text: "Password updated" });
    } catch (err) {
      setPasswordFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Couldn't change your password",
      });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function confirmDeletion() {
    if (deleteConfirm !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
      setDeleteOpen(false);
    } catch (err) {
      setDeleteError({
        kind: "error",
        text: err instanceof Error ? err.message : "Couldn't delete your account",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-medium leading-tight sm:text-4xl">Settings</h1>

      <Tabs defaultValue="account">
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <form
            onSubmit={saveProfile}
            aria-label="Account details"
            aria-busy={profileSubmitting}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="space-y-6 p-5 sm:p-6">
              <h2 className="font-display text-xl font-medium">Account details</h2>
              <fieldset disabled={profileSubmitting} className="grid min-w-0 gap-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor={`${id}-name`} className="block">
                    Name
                  </Label>
                  <Input
                    id={`${id}-name`}
                    name="name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setProfileFeedback(null);
                    }}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label
                    htmlFor={`${id}-email`}
                    className="flex items-center justify-between gap-2"
                  >
                    Email
                    {!user.hasPassword && (
                      <LockKeyhole
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-label="Managed by sign-in provider"
                      />
                    )}
                  </Label>
                  <Input
                    id={`${id}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={!user.hasPassword}
                    value={email}
                    aria-describedby={!user.hasPassword ? `${id}-provider` : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailPassword("");
                      setProfileFeedback(null);
                    }}
                  />
                  {!user.hasPassword && (
                    <p id={`${id}-provider`} className="text-xs text-muted-foreground">
                      Managed by your sign-in provider.
                    </p>
                  )}
                </div>
                {emailChanged && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${id}-email-password`} className="block">
                      Confirm with your password
                    </Label>
                    <Input
                      id={`${id}-email-password`}
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="sm:max-w-sm"
                    />
                  </div>
                )}
              </fieldset>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
              <FormFeedback value={profileFeedback} />
              <Button
                type="submit"
                className="ml-auto"
                disabled={profileSubmitting || !profileChanged}
              >
                {profileSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {profileSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          {user.hasPassword ? (
            <form
              onSubmit={savePassword}
              aria-label="Change password"
              aria-busy={passwordSubmitting}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="space-y-6 p-5 sm:p-6">
                <h2 className="font-display text-xl font-medium">Password</h2>
                <fieldset
                  disabled={passwordSubmitting}
                  className="grid min-w-0 gap-5 sm:grid-cols-2"
                >
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`${id}-current-password`} className="block">
                      Current password
                    </Label>
                    <Input
                      id={`${id}-current-password`}
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`${id}-new-password`} className="block">
                      New password
                    </Label>
                    <Input
                      id={`${id}-new-password`}
                      name="newPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      aria-describedby={`${id}-password-hint`}
                    />
                    <p id={`${id}-password-hint`} className="text-xs text-muted-foreground">
                      At least 8 characters
                    </p>
                  </div>
                </fieldset>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
                <FormFeedback value={passwordFeedback} />
                <Button type="submit" className="ml-auto" disabled={passwordSubmitting}>
                  {passwordSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {passwordSubmitting ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          ) : (
            <section
              aria-labelledby={`${id}-password-title`}
              className="space-y-4 rounded-lg border border-border bg-card p-5 sm:p-6"
            >
              <h2 id={`${id}-password-title`} className="font-display text-xl font-medium">
                Password
              </h2>
              <p className="text-sm text-muted-foreground">
                You sign in through a connected provider.
              </p>
              <Button asChild variant="outline">
                <a href="/reset-password">Set a password</a>
              </Button>
            </section>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Delete account</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Permanent. Published pages stay online, but you lose editing access.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-destructive hover:text-destructive"
          onClick={() => {
            setDeleteConfirm("");
            setDeleteError(null);
            setDeleteOpen(true);
          }}
        >
          Delete account
        </Button>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-medium">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Published pages will stay online without editing access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${id}-delete`} className="block">
              Type DELETE to confirm
            </Label>
            <Input
              id={`${id}-delete`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoComplete="off"
              disabled={deleting}
              aria-describedby={deleteError ? `${id}-delete-error` : undefined}
            />
          </div>
          <div id={`${id}-delete-error`}>
            <FormFeedback value={deleteError} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeletion();
              }}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
