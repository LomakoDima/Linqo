import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UsernameInput } from "./UsernameInput";
import type { Profile } from "@/lib/link-store";

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
  return (
    <div className="min-w-0 space-y-5">
      <div>
        <Label htmlFor={nameId} className="mb-2 block">
          Display name
        </Label>
        <Input
          id={nameId}
          value={profile.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>
      <UsernameInput
        slug={profile.slug}
        myOwnedSlug={myOwnedSlug}
        onChange={(slug) => update({ slug })}
      />
    </div>
  );
}
