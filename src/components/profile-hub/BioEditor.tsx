import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/link-store";
import { localTextViolationMessage } from "@/lib/content-policy";
import { hasUnsafeControls } from "@/lib/content-safety";
import { containsCodeContent } from "@/lib/code-content";

const BIO_MAX = 160;

function counterColor(len: number, max: number): string {
  if (len === 0) return "text-muted-foreground";
  if (len > max) return "text-amber-500";
  return "text-muted-foreground";
}

export function BioEditor({
  profile,
  update,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
}) {
  const bioId = useId();
  const moderationMessage = localTextViolationMessage(profile.bio);
  const invalid =
    !!moderationMessage || hasUnsafeControls(profile.bio) || containsCodeContent(profile.bio);
  return (
    <div className="min-w-0">
      <Label htmlFor={bioId} className="mb-2 flex items-center justify-between">
        <span>Bio</span>
        <span
          className={`text-xs font-medium tabular-nums ${counterColor(profile.bio.length, BIO_MAX)}`}
        >
          {profile.bio.length}/{BIO_MAX}
        </span>
      </Label>
      <Textarea
        id={bioId}
        rows={5}
        value={profile.bio}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${bioId}-error` : undefined}
        onChange={(e) => update({ bio: e.target.value })}
        maxLength={BIO_MAX}
        placeholder="A little about you…"
      />
      {invalid && (
        <p id={`${bioId}-error`} className="mt-1.5 text-xs text-destructive">
          {moderationMessage ?? "Code and unsupported control characters are not allowed."}
        </p>
      )}
    </div>
  );
}
