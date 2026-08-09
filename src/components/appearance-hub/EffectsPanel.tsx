import { Wand2, Sparkle, Waves, Sun, Wind, Droplet, Snowflake, ArrowRight } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PARTICLE_KINDS } from "@/lib/atmosphere-engine/particle-kinds";
import type { EffectsSettings, Profile } from "@/lib/link-store";

function EffectRow({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  intensity,
  onIntensityChange,
  hint,
}: {
  icon: typeof Wand2;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  intensity?: number;
  onIntensityChange?: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/70 text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{title}</div>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {intensity !== undefined && onIntensityChange && (
        <div className={`mt-3 pl-12 ${enabled ? "" : "pointer-events-none opacity-40"}`}>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">Intensity</Label>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              {intensity}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[intensity]}
            onValueChange={([v]) => onIntensityChange(v)}
          />
        </div>
      )}
      {hint && enabled && <p className="mt-2.5 pl-12 text-[11px] text-amber-600">{hint}</p>}
    </div>
  );
}

export function EffectsPanel({
  profile,
  update,
  setActiveTab,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  setActiveTab: (tab: string) => void;
}) {
  const effects = profile.effects ?? {};
  const updateEffects = (patch: Partial<EffectsSettings>) =>
    update({ effects: { ...effects, ...patch } });

  const particlesOn = profile.particles?.enabled ?? false;
  const particleKind = profile.particles?.kind ?? "snow";

  return (
    <SectionCard icon={Wand2} title="Effects" description="Give your page some atmosphere.">
      <EffectRow
        icon={Droplet}
        title="Glass"
        description="Frosted, translucent cards throughout your page."
        enabled={effects.glass ?? false}
        onToggle={(v) => updateEffects({ glass: v })}
      />
      <EffectRow
        icon={Sparkle}
        title="Noise"
        description="A subtle film-grain texture over the page."
        enabled={effects.noise ?? false}
        onToggle={(v) => updateEffects({ noise: v })}
        intensity={effects.noiseIntensity ?? 30}
        onIntensityChange={(v) => updateEffects({ noiseIntensity: v })}
      />
      <EffectRow
        icon={Sun}
        title="Glow"
        description="A soft accent-colored glow behind your content."
        enabled={effects.glow ?? false}
        onToggle={(v) => updateEffects({ glow: v })}
        intensity={effects.glowIntensity ?? 50}
        onIntensityChange={(v) => updateEffects({ glowIntensity: v })}
      />
      <EffectRow
        icon={Waves}
        title="Gradient Animation"
        description="A slow-drifting glow that keeps the page feeling alive."
        enabled={effects.gradientAnimation ?? false}
        onToggle={(v) => updateEffects({ gradientAnimation: v })}
      />
      <EffectRow
        icon={Wind}
        title="Blur"
        description="Softens your background image for a depth effect."
        enabled={effects.blur ?? false}
        onToggle={(v) => updateEffects({ blur: v })}
        intensity={effects.blurIntensity ?? 40}
        onIntensityChange={(v) => updateEffects({ blurIntensity: v })}
        hint={!profile.bgImage ? "Set a background image to see this effect." : undefined}
      />

      <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/70 text-accent-foreground">
          <Snowflake className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Particles</div>
          <p className="truncate text-xs text-muted-foreground">
            {particlesOn ? `${PARTICLE_KINDS[particleKind].label} — on` : "Off"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActiveTab("atmosphere")}
        >
          Edit in Atmosphere <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </SectionCard>
  );
}
