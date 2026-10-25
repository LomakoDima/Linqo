import { useRef } from "react";
import {
  AudioLines,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { SectionCard } from "@/components/ui/section-card";
import { usePreviewPlayback } from "@/lib/preview-playback";
import {
  MUSIC_VISUALIZER_SIZES,
  MUSIC_VISUALIZER_POSITIONS,
  type MusicSettings,
} from "@/lib/link-store";
import { AccentControl, ChoiceGroup, ControlGroup, SettingSlider } from "./AtmosphereControls";

const STYLES = [
  { value: "bars", label: "Bars" },
  { value: "wave", label: "Wave" },
  { value: "pulse", label: "Pulse" },
  { value: "waveform", label: "Waveform" },
  { value: "circular", label: "Circular" },
  { value: "spectrum", label: "Spectrum" },
] as const;
const POSITION_ICONS = {
  left: AlignHorizontalJustifyStart,
  center: AlignHorizontalJustifyCenter,
  right: AlignHorizontalJustifyEnd,
};
const PREVIEW_POSITION = { left: "justify-start", center: "justify-center", right: "justify-end" };

// Editing remains available while hidden; changing the switch never erases a setting.
export function VisualizerModule({
  music,
  updateMusic,
}: {
  music: MusicSettings | undefined;
  updateMusic: (patch: Partial<MusicSettings>) => void;
}) {
  const enabled = music?.enabled ?? false;
  const visualizerOn = music?.visualizerEnabled ?? enabled;
  const fallbackAnalyser = useRef<AnalyserNode | null>(null);
  const playback = usePreviewPlayback();
  const trackPlaying = playback.playing && !!playback.analyserRef;
  const style = music?.visualizer && music.visualizer !== "off" ? music.visualizer : "bars";
  const position = music?.visualizerPosition ?? "right";

  return (
    <SectionCard
      icon={AudioLines}
      title="Visualizer"
      layout="studio"
      headerAccessory={
        <Switch
          aria-label="Show visualizer"
          checked={visualizerOn}
          onCheckedChange={(checked) => updateMusic({ visualizerEnabled: checked })}
        />
      }
    >
      <div className="grid gap-6 @min-[560px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="flex min-w-0 flex-col bg-surface px-5 py-4 rounded-ui">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Preview</span>
            <span>{!visualizerOn ? "Hidden on page" : trackPlaying ? "Playing" : "Sample"}</span>
          </div>
          <div
            role="img"
            aria-label={`${style} visualizer preview, aligned ${position}`}
            className={`flex min-h-32 flex-1 items-center ${PREVIEW_POSITION[position]}`}
          >
            <AudioVisualizer
              analyserRef={trackPlaying ? playback.analyserRef! : fallbackAnalyser}
              playing={visualizerOn}
              demo={!trackPlaying}
              style={style}
              size={music?.visualizerSize ?? "md"}
              color={music?.visualizerColor || "currentColor"}
              opacity={music?.visualizerOpacity}
              roundness={music?.visualizerRoundness}
              speed={music?.visualizerSpeed}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {!visualizerOn
              ? "Your settings stay saved."
              : trackPlaying
                ? "Responding to your track."
                : "Play a track to see it respond."}
          </p>
        </div>
        <ControlGroup label="Style">
          <div
            role="group"
            aria-label="Visualizer style"
            className="grid grid-cols-2 gap-2 @min-[400px]:grid-cols-3"
          >
            {STYLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={style === value}
                onClick={() => updateMusic({ visualizer: value })}
                className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-ui border px-2 py-3 text-xs transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${style === value ? "border-foreground bg-muted text-foreground" : "border-border text-muted-foreground"}`}
              >
                <span className="flex h-8 items-center justify-center" aria-hidden>
                  <AudioVisualizer
                    analyserRef={fallbackAnalyser}
                    style={value}
                    size="md"
                    playing={visualizerOn && value === style}
                    demo
                    color="currentColor"
                  />
                </span>
                {label}
              </button>
            ))}
          </div>
        </ControlGroup>
      </div>
      <div className="grid gap-5 border-t border-border pt-6 @min-[420px]:grid-cols-2">
        <ControlGroup label="Size">
          <ChoiceGroup
            label="Visualizer size"
            value={music?.visualizerSize ?? "md"}
            options={Object.entries(MUSIC_VISUALIZER_SIZES).map(([value, meta]) => ({
              value: value as keyof typeof MUSIC_VISUALIZER_SIZES,
              label: meta.label,
            }))}
            onChange={(visualizerSize) => updateMusic({ visualizerSize })}
          />
        </ControlGroup>
        <ControlGroup label="Position">
          <ChoiceGroup
            label="Visualizer position"
            value={position}
            options={Object.entries(MUSIC_VISUALIZER_POSITIONS).map(([value, meta]) => {
              const key = value as keyof typeof MUSIC_VISUALIZER_POSITIONS;
              const Icon = POSITION_ICONS[key];
              return {
                value: key,
                label: meta.label,
                icon: <Icon className="h-3.5 w-3.5" aria-hidden />,
              };
            })}
            onChange={(visualizerPosition) => updateMusic({ visualizerPosition })}
          />
        </ControlGroup>
      </div>
      <div className="grid gap-x-6 gap-y-3 border-t border-border pt-6 @min-[560px]:grid-cols-2">
        <div className="space-y-2">
          <SettingSlider
            label="Opacity"
            min={10}
            max={100}
            value={music?.visualizerOpacity ?? 100}
            display={`${music?.visualizerOpacity ?? 100}%`}
            onChange={(visualizerOpacity) => updateMusic({ visualizerOpacity })}
          />
          <SettingSlider
            label="Roundness"
            min={0}
            max={100}
            value={music?.visualizerRoundness ?? 100}
            display={`${music?.visualizerRoundness ?? 100}%`}
            onChange={(visualizerRoundness) => updateMusic({ visualizerRoundness })}
          />
        </div>
        <div className="space-y-2">
          <SettingSlider
            label="Speed"
            min={0.2}
            max={3}
            step={0.1}
            value={music?.visualizerSpeed ?? 1}
            display={`${(music?.visualizerSpeed ?? 1).toFixed(1)}×`}
            onChange={(visualizerSpeed) => updateMusic({ visualizerSpeed })}
          />
          <AccentControl
            label="Accent color"
            value={music?.visualizerColor}
            fallback="#f97316"
            onChange={(visualizerColor) => updateMusic({ visualizerColor })}
          />
        </div>
      </div>
    </SectionCard>
  );
}
