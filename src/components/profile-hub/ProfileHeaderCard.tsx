import { computeProfileCompletion } from "@/lib/profile-completion";
import type { Profile } from "@/lib/link-store";

// The hero of the Identity Editor — always expanded, never collapsible,
// same treatment as Publish Hub's YourPageCard. Reads straight off `profile`
// (no loading state, pure derived UI) so it updates on every keystroke below.
export function ProfileHeaderCard({ profile }: { profile: Profile }) {
  const { percent } = computeProfileCompletion(profile);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-border/60 bg-muted text-xl font-semibold text-muted-foreground sm:h-20 sm:w-20 sm:text-2xl">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.name.charAt(0).toUpperCase() || "?"
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display truncate text-2xl font-medium leading-tight">
            {profile.name || "Your name"}
          </h3>
          <p className="truncate text-sm text-muted-foreground">@{profile.slug || "yourname"}</p>
          {profile.bio && (
            <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-foreground/80">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="tabular text-lg font-medium sm:text-xl">{percent}%</span>
          <span className="eyebrow hidden sm:block">Complete</span>
        </div>
      </div>
    </div>
  );
}
