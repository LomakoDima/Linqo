import { PenLine, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/notifications";
import type { Profile } from "@/lib/link-store";

const BIO_MAX = 160;

function counterColor(len: number, max: number): string {
  if (len === 0) return "text-muted-foreground";
  if (len > max) return "text-amber-500";
  return "text-emerald-600";
}

export function BioEditor({
  profile,
  update,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
}) {
  return (
    <SectionCard icon={PenLine} title="Bio" description="Tell visitors who you are.">
      <div>
        <Label className="mb-2 flex items-center justify-between">
          <span>Bio</span>
          <span
            className={`text-xs font-medium tabular-nums ${counterColor(profile.bio.length, BIO_MAX)}`}
          >
            {profile.bio.length}/{BIO_MAX}
          </span>
        </Label>
        <Textarea
          rows={4}
          value={profile.bio}
          onChange={(e) => update({ bio: e.target.value })}
          maxLength={BIO_MAX}
          placeholder="A few words about yourself and your project…"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => toast.success("AI bio generation is coming soon")}
      >
        <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
      </Button>
    </SectionCard>
  );
}
