import { useState } from "react";
import {
  CloudRain,
  Trees,
  Waves,
  Wind,
  Moon,
  Coffee,
  Flame,
  CloudLightning,
  Droplets,
  Bird,
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { MediaLinkPicker } from "@/components/MediaLinkPicker";
import { SectionCard } from "@/components/ui/section-card";
import {
  AMBIENT_SOUNDS,
  type AmbientLayer,
  type AmbientSettings,
  type AmbientSoundKind,
} from "@/lib/link-store";

const AMBIENT_ICONS: Record<AmbientSoundKind, LucideIcon> = {
  rain: CloudRain,
  forest: Trees,
  ocean: Waves,
  wind: Wind,
  night: Moon,
  "coffee-shop": Coffee,
  fireplace: Flame,
  thunder: CloudLightning,
  river: Droplets,
  birds: Bird,
};

const KINDS = Object.keys(AMBIENT_SOUNDS) as AmbientSoundKind[];

function getLayer(ambient: AmbientSettings | undefined, kind: AmbientSoundKind): AmbientLayer {
  return (ambient?.layers ?? []).find((l) => l.kind === kind) ?? { kind, enabled: false };
}

// Every layer independently mixable and volume-controlled — Rain and Ocean
// can both play at once, each at its own level, on top of Background Music.
export function AmbientSoundsModule({
  ambient,
  updateAmbient,
  slug,
  uploadTrack,
}: {
  ambient: AmbientSettings | undefined;
  updateAmbient: (patch: Partial<AmbientSettings>) => void;
  slug: string;
  uploadTrack: (slug: string, file: File) => Promise<{ url: string }>;
}) {
  const [uploadingKind, setUploadingKind] = useState<AmbientSoundKind | null>(null);

  const setLayer = (kind: AmbientSoundKind, patch: Partial<AmbientLayer>) => {
    const layers = ambient?.layers ?? [];
    const exists = layers.some((l) => l.kind === kind);
    const nextLayers = exists
      ? layers.map((l) => (l.kind === kind ? { ...l, ...patch } : l))
      : [...layers, { kind, enabled: false, ...patch }];
    updateAmbient({ layers: nextLayers });
  };

  const handleUpload = async (kind: AmbientSoundKind, file: File) => {
    setUploadingKind(kind);
    try {
      const { url } = await uploadTrack(slug, file);
      setLayer(kind, { url, urlName: file.name });
    } finally {
      setUploadingKind(null);
    }
  };

  return (
    <SectionCard
      icon={CloudRain}
      title="Ambient Sounds"
      description="Rain, ocean, fireplace, and more — layered under your music."
      defaultOpen={false}
      headerAccessory={
        <Switch
          checked={ambient?.enabled ?? false}
          onCheckedChange={(checked) => updateAmbient({ enabled: checked })}
        />
      }
    >
      {ambient?.enabled ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {KINDS.map((kind) => {
            const layer = getLayer(ambient, kind);
            const meta = AMBIENT_SOUNDS[kind];
            const Icon = AMBIENT_ICONS[kind];
            return (
              <div
                key={kind}
                className="space-y-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-muted-foreground/30 hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                    </div>
                  </div>
                  <Switch
                    checked={layer.enabled}
                    onCheckedChange={(checked) => setLayer(kind, { enabled: checked })}
                  />
                </div>

                {layer.enabled && (
                  <div className="space-y-2.5 border-t border-border pt-3">
                    <MediaLinkPicker
                      value={layer.url ?? ""}
                      displayLabel={layer.urlName ?? layer.url ?? ""}
                      onUrlChange={(url) => setLayer(kind, { url, urlName: undefined })}
                      onUpload={(file) => handleUpload(kind, file)}
                      onClear={() => setLayer(kind, { url: undefined, urlName: undefined })}
                      accept="audio/*"
                      kind="audio"
                      uploading={uploadingKind === kind}
                      placeholder="Paste a link to an mp3 you host…"
                    />
                    <div>
                      <Label className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Volume
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {layer.volume ?? 50}%
                        </span>
                      </Label>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[layer.volume ?? 50]}
                        onValueChange={([v]) => setLayer(kind, { volume: v })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Turn on Ambient Sounds to layer in rain, ocean, fireplace, and more.
        </p>
      )}
    </SectionCard>
  );
}
