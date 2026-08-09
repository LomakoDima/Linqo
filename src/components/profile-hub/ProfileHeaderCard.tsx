import { motion } from "motion/react";
import { blockSpring } from "@/lib/block-motion/variants";
import { computeProfileCompletion } from "@/lib/profile-completion";
import type { Profile } from "@/lib/link-store";

// The hero of the Identity Editor — always expanded, never collapsible,
// same treatment as Publish Hub's YourPageCard. Reads straight off `profile`
// (no loading state, pure derived UI) so it updates on every keystroke below.
export function ProfileHeaderCard({ profile }: { profile: Profile }) {
  const { percent } = computeProfileCompletion(profile);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={blockSpring}
      className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-card/60 p-6 shadow-md sm:p-8"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-border/60 bg-muted text-xl font-semibold text-muted-foreground sm:h-20 sm:w-20 sm:text-2xl">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.name.charAt(0).toUpperCase() || "?"
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
            {profile.name || "Your name"}
          </h2>
          <p className="truncate text-sm text-muted-foreground">@{profile.slug || "yourname"}</p>
          {profile.bio && (
            <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-foreground/80">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-bold tabular-nums text-primary sm:text-xl">{percent}%</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Complete
          </span>
        </div>
      </div>
    </motion.div>
  );
}
