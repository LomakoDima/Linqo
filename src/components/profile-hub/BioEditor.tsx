import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/link-store";

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
        onChange={(e) => update({ bio: e.target.value })}
        maxLength={BIO_MAX}
        placeholder="A little about you…"
      />
    </div>
  );
}
