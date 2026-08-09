import { UserCircle2 } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
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
  return (
    <SectionCard icon={UserCircle2} title="Identity" description="Who you are, in short.">
      <UsernameInput
        slug={profile.slug}
        myOwnedSlug={myOwnedSlug}
        onChange={(slug) => update({ slug })}
      />
      <div>
        <Label className="mb-2 block">Display Name</Label>
        <Input value={profile.name} onChange={(e) => update({ name: e.target.value })} />
        <p className="mt-1.5 text-xs text-muted-foreground">This is the name visitors will see.</p>
      </div>
    </SectionCard>
  );
}
