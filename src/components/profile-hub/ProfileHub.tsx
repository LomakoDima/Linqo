import type { Profile } from "@/lib/link-store";
import { IdentityCard } from "./IdentityCard";
import { BioEditor } from "./BioEditor";
import { AvatarUploader } from "./AvatarUploader";
import { CoverSelector } from "./CoverSelector";
import { CompletionCard } from "./CompletionCard";

// One editing surface, with the actual profile images above its text fields.
// Everything here writes through the same `update` shallow-merge setter
// every other builder tab already uses; nothing in this tab talks to the
// server directly (that's still the Publish tab's job).
export function ProfileHub({
  profile,
  update,
  myOwnedSlug,
  onAvatarUpload,
  onCoverUpload,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  myOwnedSlug: string | null;
  onAvatarUpload: (file: File) => void | Promise<void>;
  onCoverUpload: (file: File) => void | Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">Identity</h2>
      <section
        aria-label="Profile editor"
        className="overflow-hidden rounded-lg border border-border bg-card"
      >
        <CoverSelector profile={profile} update={update} onUpload={onCoverUpload} />
        <div className="relative space-y-6 px-5 pb-6 sm:px-6">
          <AvatarUploader profile={profile} update={update} onUpload={onAvatarUpload} />
          <div className="grid gap-6 sm:grid-cols-2">
            <IdentityCard profile={profile} update={update} myOwnedSlug={myOwnedSlug} />
            <BioEditor profile={profile} update={update} />
          </div>
        </div>
      </section>
      <CompletionCard profile={profile} />
    </div>
  );
}
