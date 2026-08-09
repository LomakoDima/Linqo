import type { Profile } from "@/lib/link-store";
import { ProfileHeaderCard } from "./ProfileHeaderCard";
import { IdentityCard } from "./IdentityCard";
import { BioEditor } from "./BioEditor";
import { AvatarUploader } from "./AvatarUploader";
import { CoverSelector } from "./CoverSelector";
import { CompletionCard } from "./CompletionCard";

// The Identity Editor — orchestrates the Profile tab's stack of cards.
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
    <div className="space-y-4">
      <ProfileHeaderCard profile={profile} />
      <IdentityCard profile={profile} update={update} myOwnedSlug={myOwnedSlug} />
      <BioEditor profile={profile} update={update} />
      <AvatarUploader profile={profile} update={update} onUpload={onAvatarUpload} />
      <CoverSelector profile={profile} update={update} onUpload={onCoverUpload} />
      <CompletionCard profile={profile} />
    </div>
  );
}
