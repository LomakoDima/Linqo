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
import { Switch } from "@/components/ui/switch";
import { SettingSlider } from "./AtmosphereControls";
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
      layout="studio"
      defaultOpen={false}
      headerAccessory={
        <Switch
          aria-label="Enable ambient sounds"
          checked={ambient?.enabled ?? false}
          onCheckedChange={(checked) => updateAmbient({ enabled: checked })}
        />
      }
    >
      <div className="divide-y divide-border">
        {KINDS.map((kind) => {
          const layer = getLayer(ambient, kind);
          const meta = AMBIENT_SOUNDS[kind];
          const Icon = AMBIENT_ICONS[kind];
          return (
            <div key={kind} className="space-y-4 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-ui bg-surface">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                  </div>
                </div>
                <Switch
                  aria-label={`Enable ${meta.label.toLowerCase()}`}
                  checked={layer.enabled}
                  onCheckedChange={(checked) => setLayer(kind, { enabled: checked })}
                />
              </div>

              {layer.enabled && (
                <div className="grid items-start gap-4 @min-[560px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
                  <SettingSlider
                    label={`${meta.label} volume`}
                    min={0}
                    max={100}
                    value={layer.volume ?? 50}
                    display={`${layer.volume ?? 50}%`}
                    onChange={(volume) => setLayer(kind, { volume })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!ambient?.enabled && (
        <p className="text-xs text-muted-foreground">
          Hidden on your page. Turn on Ambient Sounds to play your mix.
        </p>
      )}
    </SectionCard>
  );
}
