import {
  Sparkles,
  Snowflake,
  CloudRain,
  Leaf,
  Star,
  Bug,
  Flower2,
  Wind,
  Droplet,
  Heart,
  Sparkle,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/ui/section-card";
import {
  DEFAULT_PARTICLE_EMOJI,
  PARTICLE_EMOJI_SUGGESTIONS,
  PARTICLE_KINDS,
  PARTICLE_SHAPES,
  sanitizeEmoji,
} from "@/lib/atmosphere-engine/particle-kinds";
import type { ParticleKind, ParticleSettings, ParticleShape } from "@/lib/link-store";
import { AccentControl, ControlGroup, SettingSlider } from "./AtmosphereControls";

const PARTICLE_ICONS: Record<ParticleKind, LucideIcon> = {
  snow: Snowflake,
  rain: CloudRain,
  leaves: Leaf,
  stars: Star,
  fireflies: Bug,
  sakura: Flower2,
  dust: Wind,
  bubbles: Droplet,
  hearts: Heart,
  sparkles: Sparkle,
};
const KINDS = Object.keys(PARTICLE_KINDS) as ParticleKind[];
const SHAPES = Object.keys(PARTICLE_SHAPES) as ParticleShape[];

export function ParticlesModule({
  particles,
  updateParticles,
}: {
  particles: ParticleSettings | undefined;
  updateParticles: (patch: Partial<ParticleSettings>) => void;
}) {
  const kind = particles?.kind ?? "snow";
  const preset = PARTICLE_KINDS[kind];
  const shape = particles?.shape ?? "default";
  const emoji = particles?.emoji ?? DEFAULT_PARTICLE_EMOJI;
  return (
    <SectionCard
      icon={Sparkles}
      title="Particles"
      layout="studio"
      defaultOpen={false}
      headerAccessory={
        <Switch
          aria-label="Show particles"
          checked={particles?.enabled ?? false}
          onCheckedChange={(enabled) => updateParticles({ enabled })}
        />
      }
    >
      <ControlGroup label="Effect">
        <div
          role="group"
          aria-label="Particle effect"
          className="grid grid-cols-2 gap-2 @min-[400px]:grid-cols-3 @min-[560px]:grid-cols-5"
        >
          {KINDS.map((value) => {
            const Icon = PARTICLE_ICONS[value];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => updateParticles({ kind: value })}
                className={`flex min-h-20 min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-ui border px-2 py-3 text-xs transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${kind === value ? "border-foreground bg-muted text-foreground" : "border-border text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {PARTICLE_KINDS[value].label}
              </button>
            );
          })}
        </div>
      </ControlGroup>
      <div className="grid gap-x-6 gap-y-2 border-t border-border pt-6 @min-[420px]:grid-cols-2">
        <SettingSlider
          label="Density"
          min={5}
          max={150}
          step={5}
          value={particles?.density ?? preset.density}
          onChange={(density) => updateParticles({ density })}
        />
        <SettingSlider
          label="Speed"
          min={0.2}
          max={3}
          step={0.1}
          value={particles?.speed ?? 1}
          display={`${(particles?.speed ?? 1).toFixed(1)}×`}
          onChange={(speed) => updateParticles({ speed })}
        />
        <SettingSlider
          label="Size"
          min={0.4}
          max={2.5}
          step={0.1}
          value={particles?.size ?? 1}
          display={`${(particles?.size ?? 1).toFixed(1)}×`}
          onChange={(size) => updateParticles({ size })}
        />
        <SettingSlider
          label="Opacity"
          min={10}
          max={100}
          step={5}
          value={particles?.opacity ?? preset.opacity}
          display={`${particles?.opacity ?? preset.opacity}%`}
          onChange={(opacity) => updateParticles({ opacity })}
        />
      </div>
      <div className="space-y-6 border-t border-border pt-6">
        <ControlGroup label="Shape">
          <div role="group" aria-label="Particle shape" className="flex flex-wrap gap-2">
            {SHAPES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={shape === value}
                onClick={() =>
                  updateParticles(
                    value === "emoji" && !particles?.emoji
                      ? { shape: value, emoji: DEFAULT_PARTICLE_EMOJI }
                      : { shape: value },
                  )
                }
                className={`min-h-10 cursor-pointer rounded-ui border px-3 text-xs font-medium transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${shape === value ? "border-foreground bg-muted text-foreground" : "border-border text-muted-foreground"}`}
              >
                {PARTICLE_SHAPES[value].label}
              </button>
            ))}
          </div>
        </ControlGroup>
        {shape === "emoji" ? (
          <div className="space-y-3">
            <Input
              value={emoji}
              onChange={(e) =>
                updateParticles({ emoji: Array.from(e.target.value).slice(-2).join("") })
              }
              onBlur={() => updateParticles({ emoji: sanitizeEmoji(emoji) })}
              aria-label="Emoji used for particles"
              maxLength={8}
              className="w-20 text-center text-lg"
            />
            <div role="group" aria-label="Suggested emoji" className="flex flex-wrap gap-1">
              {PARTICLE_EMOJI_SUGGESTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Use ${value}`}
                  aria-pressed={emoji === value}
                  onClick={() => updateParticles({ emoji: value })}
                  className={`grid h-11 w-11 cursor-pointer place-items-center rounded-ui border text-lg hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${emoji === value ? "border-foreground bg-muted" : "border-border"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AccentControl
            label="Color"
            value={particles?.color}
            fallback={preset.color}
            onChange={(color) => updateParticles({ color })}
          />
        )}
      </div>
      {!particles?.enabled && (
        <p className="text-xs text-muted-foreground">
          Hidden on your page. Turn on Particles to show this effect.
        </p>
      )}
    </SectionCard>
  );
}
