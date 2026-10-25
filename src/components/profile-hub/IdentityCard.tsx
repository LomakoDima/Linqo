import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UsernameInput } from "./UsernameInput";
import type { Profile } from "@/lib/link-store";
import { accountNameSchema } from "@/lib/account-validation";

export function IdentityCard({
  profile,
  update,
  myOwnedSlug,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  myOwnedSlug: string | null;
}) {
  const nameId = useId();
  const invalid = !accountNameSchema.safeParse(profile.name).success;
  return (
    <div className="min-w-0 space-y-5">
      <div>
        <Label htmlFor={nameId} className="mb-2 block">
          Display name
        </Label>
        <Input
          id={nameId}
          value={profile.name}
          maxLength={100}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${nameId}-error` : undefined}
          onChange={(e) => update({ name: e.target.value })}
        />
        {invalid && (
          <p id={`${nameId}-error`} className="mt-1.5 text-xs text-destructive">
            Use a name that follows the content policy (1–100 characters).
          </p>
        )}
      </div>
      <UsernameInput
        slug={profile.slug}
        myOwnedSlug={myOwnedSlug}
        onChange={(slug) => update({ slug })}
      />
    </div>
  );
}
