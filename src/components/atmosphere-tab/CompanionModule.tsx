import {
  PawPrint,
  Check,
  Ban,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { SegmentedToggle } from "@/components/BlockEditor";
import { SectionCard } from "@/components/ui/section-card";
import {
  COMPANIONS,
  COMPANION_BEHAVIORS,
  COMPANION_SIZES,
  type CompanionId,
  type CompanionBehavior,
  type CompanionHomeCorner,
  type CompanionSize,
  type Profile,
} from "@/lib/link-store";

// Relocated from the builder's Design tab — a companion is atmosphere, not
// layout.
export function CompanionModule({
  profile,
  update,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
}) {
  return (
    <SectionCard
      icon={PawPrint}
      title="Companion"
      description="A tiny, living pet that wanders your page."
    >
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
        <CompanionNoneCard
          active={!profile.companion}
          onSelect={() => update({ companion: undefined })}
        />
        {(Object.keys(COMPANIONS) as CompanionId[]).map((id) => (
          <CompanionCard
            key={id}
            id={id}
            active={profile.companion?.id === id}
            onSelect={() =>
              update({
                companion: {
                  home: "banner-bottom-right",
                  size: "md",
                  ...profile.companion,
                  id,
                },
              })
            }
          />
        ))}
      </div>

      {profile.companion && (
        <div className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
          <div>
            <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Home corner
            </Label>
            <SegmentedToggle<CompanionHomeCorner>
              value={profile.companion.home ?? "banner-bottom-right"}
              options={[
                { value: "banner-top-left", label: "TL", icon: ArrowUpLeft },
                { value: "banner-top-right", label: "TR", icon: ArrowUpRight },
                { value: "banner-bottom-left", label: "BL", icon: ArrowDownLeft },
                { value: "banner-bottom-right", label: "BR", icon: ArrowDownRight },
              ]}
              onChange={(home) => update({ companion: { ...profile.companion!, home } })}
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Size
            </Label>
            <SegmentedToggle<CompanionSize>
              value={profile.companion.size ?? "md"}
              options={(Object.keys(COMPANION_SIZES) as CompanionSize[]).map((k) => ({
                value: k,
                label: COMPANION_SIZES[k].label,
              }))}
              onChange={(size) => update({ companion: { ...profile.companion!, size } })}
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Behavior
            </Label>
            <SegmentedToggle<CompanionBehavior>
              value={profile.companion.behavior ?? "idle"}
              options={(Object.keys(COMPANION_BEHAVIORS) as CompanionBehavior[]).map((k) => ({
                value: k,
                label: COMPANION_BEHAVIORS[k].label,
              }))}
              onChange={(behavior) => update({ companion: { ...profile.companion!, behavior } })}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {COMPANION_BEHAVIORS[profile.companion.behavior ?? "idle"].blurb}
            </p>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        It idles, reacts to visitors, and naps when it's quiet — and always stays near its home
        corner, never on top of your links or text.
      </p>
    </SectionCard>
  );
}

function CompanionCard({
  id,
  active,
  onSelect,
}: {
  id: CompanionId;
  active: boolean;
  onSelect: () => void;
}) {
  const c = COMPANIONS[id];
  return (
    <button
      type="button"
      onClick={onSelect}
      title={c.label}
      aria-pressed={active}
      className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
        active
          ? "bg-primary/10 ring-2 ring-primary"
          : "ring-1 ring-border hover:ring-muted-foreground/30"
      }`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
        <img src={c.portrait} alt="" className="h-full w-full object-cover" />
      </span>
      <span className="truncate text-[11px] font-medium text-foreground">{c.label}</span>
      {active && (
        <Check className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />
      )}
    </button>
  );
}

function CompanionNoneCard({ active, onSelect }: { active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title="None"
      aria-pressed={active}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
        active
          ? "bg-primary/10 ring-2 ring-primary"
          : "ring-1 ring-border hover:ring-muted-foreground/30"
      }`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground">
        <Ban className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">None</span>
    </button>
  );
}
