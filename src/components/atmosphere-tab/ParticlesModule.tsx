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
  Check,
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ColorField } from "@/components/BlockEditor";
import { SectionCard } from "@/components/ui/section-card";
import {
  DEFAULT_PARTICLE_EMOJI,
  PARTICLE_EMOJI_SUGGESTIONS,
  PARTICLE_KINDS,
  PARTICLE_SHAPES,
  sanitizeEmoji,
} from "@/lib/atmosphere-engine/particle-kinds";
import type { ParticleKind, ParticleSettings, ParticleShape } from "@/lib/link-store";

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

// A single active decorative effect drifting over the whole page — one
// generic particle sim, ten config-driven presets (see particle-kinds.ts),
// not ten hand-built systems.
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
      description="Snow, stars, fireflies, and other drifting effects."
      defaultOpen={false}
      headerAccessory={
        <Switch
          checked={particles?.enabled ?? false}
          onCheckedChange={(checked) => updateParticles({ enabled: checked })}
        />
      }
    >
      {particles?.enabled ? (
        <>
          <div className="grid grid-cols-5 gap-2.5">
            {KINDS.map((k) => {
              const meta = PARTICLE_KINDS[k];
              const Icon = PARTICLE_ICONS[k];
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => updateParticles({ kind: k })}
                  title={meta.label}
                  aria-pressed={active}
                  className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg p-2 transition-colors duration-150 ${
                    active
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "ring-1 ring-border hover:ring-muted-foreground/30"
                  }`}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted"
                    style={active ? { color: meta.color } : undefined}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="truncate text-[11px] font-medium text-foreground">
                    {meta.label}
                  </span>
                  {active && (
                    <Check className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Density
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {particles?.density ?? preset.density}
                </span>
              </Label>
              <Slider
                min={5}
                max={150}
                step={5}
                value={[particles?.density ?? preset.density]}
                onValueChange={([v]) => updateParticles({ density: v })}
              />
            </div>
            <div>
              <Label className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Speed
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {(particles?.speed ?? 1).toFixed(1)}×
                </span>
              </Label>
              <Slider
                min={0.2}
                max={3}
                step={0.1}
                value={[particles?.speed ?? 1]}
                onValueChange={([v]) => updateParticles({ speed: v })}
              />
            </div>
            <div>
              <Label className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Size
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {(particles?.size ?? 1).toFixed(1)}×
                </span>
              </Label>
              <Slider
                min={0.4}
                max={2.5}
                step={0.1}
                value={[particles?.size ?? 1]}
                onValueChange={([v]) => updateParticles({ size: v })}
              />
            </div>
            <div>
              <Label className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Opacity
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {particles?.opacity ?? preset.opacity}%
                </span>
              </Label>
              <Slider
                min={10}
                max={100}
                step={5}
                value={[particles?.opacity ?? preset.opacity]}
                onValueChange={([v]) => updateParticles({ opacity: v })}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Shape
            </Label>
            <div role="group" aria-label="Particle shape" className="flex flex-wrap gap-1.5">
              {SHAPES.map((sh) => (
                <button
                  key={sh}
                  type="button"
                  aria-pressed={shape === sh}
                  onClick={() =>
                    updateParticles(
                      sh === "emoji" && !particles?.emoji
                        ? { shape: sh, emoji: DEFAULT_PARTICLE_EMOJI }
                        : { shape: sh },
                    )
                  }
                  className={`h-8 cursor-pointer rounded-ui border px-3 text-xs font-medium transition-colors duration-150 ${
                    shape === sh
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                  }`}
                >
                  {PARTICLE_SHAPES[sh].label}
                </button>
              ))}
            </div>

            {shape === "emoji" && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
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
                  <p className="text-xs text-muted-foreground">
                    Type or paste any emoji, or pick one.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {PARTICLE_EMOJI_SUGGESTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => updateParticles({ emoji: e })}
                      aria-label={`Use ${e}`}
                      aria-pressed={emoji === e}
                      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-ui border text-lg transition-colors duration-150 ${
                        emoji === e
                          ? "border-foreground"
                          : "border-border hover:border-foreground/50"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {shape !== "emoji" && (
            <div>
              <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Color
              </Label>
              <ColorField
                value={particles?.color}
                onChange={(v) => updateParticles({ color: v })}
                fallback={preset.color}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Turn on Particles to drift snow, stars, fireflies, and more over your page.
        </p>
      )}
    </SectionCard>
  );
}
