import { useRef } from "react";
import {
  AudioLines,
  Activity,
  CircleDot,
  AudioWaveform,
  Disc3,
  BarChart3,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SegmentedToggle, ColorField } from "@/components/BlockEditor";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { SectionCard } from "@/components/ui/section-card";
import { usePreviewPlayback } from "@/lib/preview-playback";
import {
  MUSIC_VISUALIZER_SIZES,
  MUSIC_VISUALIZER_POSITIONS,
  type MusicSettings,
  type MusicVisualizerStyle,
  type MusicVisualizerSize,
  type MusicVisualizerPosition,
} from "@/lib/link-store";

// Split out from Background Music into its own card — its controls stay
// live-editable even with music off (deemphasized, not disabled), since the
// same pill widget is what surfaces the moment any playback starts.
export function VisualizerModule({
  music,
  updateMusic,
}: {
  music: MusicSettings | undefined;
  updateMusic: (patch: Partial<MusicSettings>) => void;
}) {
  const enabled = music?.enabled ?? false;
  // Explicit override wins either direction; unset defaults to whatever
  // Background Music already is — so a profile saved before this toggle
  // existed renders exactly as before (visualizer on while music plays,
  // off otherwise), and the switch below is what now lets a visitor flip
  // either half of that independently: force it on with music off, or
  // force it off while music keeps playing.
  const visualizerOn = music?.visualizerEnabled ?? enabled;
  const fallbackAnalyser = useRef<AnalyserNode | null>(null);
  // Playing the track in Background Music drives this preview from the real
  // audio; otherwise it stays on the demo animation below.
  const trackPreview = usePreviewPlayback();
  const trackPlaying = trackPreview.playing && !!trackPreview.analyserRef;
  const style = music?.visualizer && music.visualizer !== "off" ? music.visualizer : "bars";

  return (
    <SectionCard
      icon={AudioLines}
      title="Visualizer"
      description="The now-playing pill's style, size, and color."
      deemphasized={!visualizerOn}
      deemphasizedHint={
        !visualizerOn ? "Turn on the switch above to show the visualizer." : undefined
      }
      headerAccessory={
        <div className="flex items-center gap-2">
          <Label
            htmlFor="visualizer-toggle"
            className="cursor-pointer text-xs font-normal text-muted-foreground"
          >
            Show visualizer
          </Label>
          <Switch
            id="visualizer-toggle"
            checked={visualizerOn}
            onCheckedChange={(checked) => updateMusic({ visualizerEnabled: checked })}
          />
        </div>
      }
    >
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <AudioVisualizer
          analyserRef={trackPlaying ? trackPreview.analyserRef! : fallbackAnalyser}
          // Reacts to the track while it plays in Background Music; with music
          // on but nothing playing it shows the demo animation, and with music
          // off the same resting pose the page will.
          playing={visualizerOn && (trackPlaying || enabled)}
          demo={!trackPlaying}
          style={style}
          size={music?.visualizerSize ?? "md"}
          color={music?.visualizerColor || "currentColor"}
          opacity={music?.visualizerOpacity}
          roundness={music?.visualizerRoundness}
          speed={music?.visualizerSpeed}
        />
      </div>

      <div>
        <Label className="mb-3 block">Style</Label>
        <SegmentedToggle<MusicVisualizerStyle>
          value={style}
          options={[
            { value: "bars", label: "Bars", icon: AudioLines },
            { value: "wave", label: "Wave", icon: Activity },
            { value: "pulse", label: "Pulse", icon: CircleDot },
            { value: "waveform", label: "Waveform", icon: AudioWaveform },
            { value: "circular", label: "Circular", icon: Disc3 },
            { value: "spectrum", label: "Spectrum", icon: BarChart3 },
          ]}
          onChange={(v) => updateMusic({ visualizer: v })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Size
          </Label>
          <SegmentedToggle<MusicVisualizerSize>
            value={music?.visualizerSize ?? "md"}
            options={(Object.keys(MUSIC_VISUALIZER_SIZES) as MusicVisualizerSize[]).map((k) => ({
              value: k,
              label: MUSIC_VISUALIZER_SIZES[k].label,
            }))}
            onChange={(v) => updateMusic({ visualizerSize: v })}
          />
        </div>
        <div>
          <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Position
          </Label>
          <SegmentedToggle<MusicVisualizerPosition>
            value={music?.visualizerPosition ?? "right"}
            options={(Object.keys(MUSIC_VISUALIZER_POSITIONS) as MusicVisualizerPosition[]).map(
              (k) => ({
                value: k,
                label: MUSIC_VISUALIZER_POSITIONS[k].label,
                icon:
                  k === "left"
                    ? AlignHorizontalJustifyStart
                    : k === "center"
                      ? AlignHorizontalJustifyCenter
                      : AlignHorizontalJustifyEnd,
              }),
            )}
            onChange={(v) => updateMusic({ visualizerPosition: v })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Opacity
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {music?.visualizerOpacity ?? 100}%
            </span>
          </Label>
          <Slider
            min={10}
            max={100}
            step={1}
            value={[music?.visualizerOpacity ?? 100]}
            onValueChange={([v]) => updateMusic({ visualizerOpacity: v })}
          />
        </div>
        <div>
          <Label className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Roundness
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {music?.visualizerRoundness ?? 100}%
            </span>
          </Label>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[music?.visualizerRoundness ?? 100]}
            onValueChange={([v]) => updateMusic({ visualizerRoundness: v })}
          />
        </div>
        <div>
          <Label className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Speed
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {(music?.visualizerSpeed ?? 1).toFixed(1)}×
            </span>
          </Label>
          <Slider
            min={0.2}
            max={3}
            step={0.1}
            value={[music?.visualizerSpeed ?? 1]}
            onValueChange={([v]) => updateMusic({ visualizerSpeed: v })}
          />
        </div>
      </div>

      <div>
        <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Accent color
        </Label>
        <ColorField
          value={music?.visualizerColor}
          onChange={(v) => updateMusic({ visualizerColor: v })}
          fallback="#f97316"
        />
      </div>
    </SectionCard>
  );
}
