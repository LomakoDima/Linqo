import { useEffect, useRef } from "react";
import type { MusicVisualizerSize, MusicVisualizerStyle } from "@/lib/link-store";

const BAR_COUNT = 6;
const WAVEFORM_BAR_COUNT = 11;
const CIRCULAR_BAR_COUNT = 12;
const SPECTRUM_BAND_COUNT = 20;

const SIZE_CLASS: Record<MusicVisualizerSize, string> = {
  sm: "h-4 w-9",
  md: "h-5 w-12",
  lg: "h-7 w-16",
};

// How fast a bar's rendered level chases the raw analyser reading — high
// attack (snaps up almost instantly on a hit) paired with a much lower
// decay (eases back down) is what makes a spectrum meter read as "hitting
// the beat" rather than just wobbling with the raw signal. Both scale with
// the `speed` prop (see applyEnvelope).
const BASE_ATTACK = 0.75;
const BASE_DECAY = 0.12;

// A simple energy-based onset detector: bass level vs. its own recent
// rolling average. A real kick/snare spikes well above the recent average;
// a rising synth pad or general loudness doesn't. This is the same family
// of technique classic beat-reactive visualizers use — not full tempo
// tracking, just "did something hit *right now*".
const BEAT_HISTORY_FRAMES = 30;
const BEAT_THRESHOLD = 1.35;
const BEAT_FLOOR = 0.12;
const BEAT_DECAY = 0.85;

/**
 * Buckets raw FFT bins into `count` bands on a log curve instead of
 * sampling them linearly. Music energy concentrates in the lowest handful
 * of bins (bass/kick) — a linear stride like `bins[i * step]` mostly reads
 * silence for every bar past the first one or two, since the FFT itself is
 * linear-frequency while both hearing and mix energy are logarithmic. Bar 0
 * ends up bass-weighted, the last bar catches treble/air.
 */
function logBandLevels(freqData: Uint8Array, count: number): number[] {
  const n = freqData.length;
  const levels: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.max(1, Math.floor(Math.pow(n, i / count)));
    const to = Math.max(from + 1, Math.floor(Math.pow(n, (i + 1) / count)));
    let sum = 0;
    let bins = 0;
    for (let j = from; j < to && j < n; j++) {
      sum += freqData[j];
      bins++;
    }
    levels.push(bins > 0 ? sum / bins / 255 : 0);
  }
  return levels;
}

/**
 * Small canvas that paints real analyser data (see useAudioAnalyser) next to
 * the "now playing" pill every animation frame while the track is playing —
 * replaces what used to be a canned CSS loop with motion that actually
 * tracks the track's bass and beat, not just raw volume. Real data only
 * exists for our own uploads (same-origin) — a pasted external URL is
 * cross-origin and reads as silence by design (see useAudioAnalyser), so
 * this falls back to a gentle synthetic idle motion. Same footprint either
 * way, so nothing shifts around it.
 */
export function AudioVisualizer({
  analyserRef,
  playing,
  style,
  color,
  size = "md",
  opacity = 100,
  roundness = 100,
  speed = 1,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  playing: boolean;
  style: Exclude<MusicVisualizerStyle, "off">;
  color: string;
  size?: MusicVisualizerSize;
  // 0-100.
  opacity?: number;
  // 0-100; 100 is today's fully-pill-rounded bars, 0 is square corners.
  roundness?: number;
  // Animation-timing multiplier — idle motion and the attack/decay envelope
  // both scale with it. 1 is today's exact constants.
  speed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx2d = canvas?.getContext("2d");
    if (!canvas || !ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    // A transient layout pass (e.g. right after a size/position class swap,
    // before the browser has committed the new box) can hand back 0 here —
    // drawing math downstream (bar width, roundRect radius) goes negative
    // and roundRect throws rather than clamping. Nothing meaningful to draw
    // at zero size anyway, so just wait for the next real layout.
    if (cssW <= 0 || cssH <= 0) return;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx2d.scale(dpr, dpr);
    ctx2d.fillStyle = color;
    ctx2d.strokeStyle = color;
    ctx2d.globalAlpha = Math.max(0, Math.min(100, opacity)) / 100;

    const roundedFraction = Math.max(0, Math.min(100, roundness)) / 100;
    const speedMul = Math.max(0.2, Math.min(3, speed));
    const attack = Math.min(0.95, BASE_ATTACK * speedMul);
    const decay = Math.min(0.6, BASE_DECAY * speedMul);

    let raf = 0;
    const smoothed: number[] = []; // per-bar attack/decay envelope state
    const beatHistory: number[] = [];
    let beatPulse = 0; // 0..1, spikes on a detected beat, decays each frame

    // A CORS-tainted analyser doesn't throw or go null — it just reads a
    // constant baseline (0 for frequency bins, 128 for time-domain) forever.
    // Treat that the same as "no analyser" rather than drawing a flat dead
    // line, so a pasted cross-origin URL still gets the idle fallback.
    const hasSignal = (data: Uint8Array, baseline: number) => {
      for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i] - baseline) > 2) return true;
      }
      return false;
    };

    // Chases `raw` with a fast rise / slow fall so bars snap up on a hit
    // and ease back down, instead of jittering frame-to-frame with the
    // analyser's own noise.
    const applyEnvelope = (raw: number[]): number[] => {
      if (smoothed.length !== raw.length) {
        smoothed.length = 0;
        smoothed.push(...raw);
        return smoothed;
      }
      for (let i = 0; i < raw.length; i++) {
        const rate = raw[i] > smoothed[i] ? attack : decay;
        smoothed[i] += (raw[i] - smoothed[i]) * rate;
      }
      return smoothed;
    };

    // Feeds the bass band through a rolling average; a level well above its
    // own recent history reads as a beat and pumps beatPulse back to 1.
    const updateBeatPulse = (bassLevel: number) => {
      beatHistory.push(bassLevel);
      if (beatHistory.length > BEAT_HISTORY_FRAMES) beatHistory.shift();
      const avg = beatHistory.reduce((a, b) => a + b, 0) / beatHistory.length;
      const isBeat =
        beatHistory.length >= 8 && bassLevel > BEAT_FLOOR && bassLevel > avg * BEAT_THRESHOLD;
      beatPulse = isBeat ? 1 : beatPulse * BEAT_DECAY;
    };

    const drawBars = (levels: number[]) => {
      const gap = 1.5;
      const barW = (cssW - gap * (levels.length - 1)) / levels.length;
      const radius = (barW / 2) * roundedFraction;
      levels.forEach((v, i) => {
        const h = Math.max(barW, Math.pow(v, 0.6) * cssH);
        const x = i * (barW + gap);
        ctx2d.beginPath();
        ctx2d.roundRect(x, cssH - h, barW, h, radius);
        ctx2d.fill();
      });
    };

    // Same pill bars as drawBars, but growing from the vertical center in
    // both directions — the classic voice-memo waveform silhouette.
    const drawWaveform = (levels: number[]) => {
      const gap = 1.5;
      const barW = (cssW - gap * (levels.length - 1)) / levels.length;
      const radius = (barW / 2) * roundedFraction;
      const midY = cssH / 2;
      levels.forEach((v, i) => {
        const h = Math.max(barW, v * cssH);
        const x = i * (barW + gap);
        ctx2d.beginPath();
        ctx2d.roundRect(x, midY - h / 2, barW, h, radius);
        ctx2d.fill();
      });
    };

    const drawWave = (points: number[]) => {
      ctx2d.lineWidth = 1.3;
      ctx2d.beginPath();
      const step = cssW / (points.length - 1);
      points.forEach((v, i) => {
        const y = cssH - v * cssH;
        if (i === 0) ctx2d.moveTo(0, y);
        else ctx2d.lineTo(i * step, y);
      });
      ctx2d.stroke();
    };

    const drawPulse = (level: number) => {
      const r = 1.5 + level * (cssH / 2 - 1.5);
      ctx2d.beginPath();
      ctx2d.arc(cssW / 2, cssH / 2, r, 0, Math.PI * 2);
      ctx2d.fill();
    };

    // A ring of radial ticks around the pill's own center — each tick's
    // length encodes one log-band's level, roundedFraction controls how
    // pill-shaped vs. needle-thin each tick reads.
    const drawCircular = (levels: number[]) => {
      const cx = cssW / 2;
      const cy = cssH / 2;
      const outerR = Math.min(cssW, cssH) / 2;
      const innerR = outerR * 0.32;
      const tickW = Math.max(1, ((2 * Math.PI * innerR) / levels.length) * 0.55);
      const radius = (tickW / 2) * roundedFraction;
      levels.forEach((v, i) => {
        const angle = (i / levels.length) * Math.PI * 2 - Math.PI / 2;
        const len = (outerR - innerR) * Math.max(0.12, Math.pow(v, 0.6));
        const x0 = cx + Math.cos(angle) * innerR;
        const y0 = cy + Math.sin(angle) * innerR;
        ctx2d.save();
        ctx2d.translate(x0, y0);
        ctx2d.rotate(angle + Math.PI / 2);
        ctx2d.beginPath();
        ctx2d.roundRect(-tickW / 2, 0, tickW, len, radius);
        ctx2d.fill();
        ctx2d.restore();
      });
    };

    // A denser, filled silhouette — more bands than Bars, joined into one
    // continuous shape instead of discrete pills, the classic "spectrum
    // analyzer" look.
    const drawSpectrum = (levels: number[]) => {
      ctx2d.beginPath();
      ctx2d.moveTo(0, cssH);
      const step = cssW / (levels.length - 1);
      levels.forEach((v, i) => {
        const h = Math.pow(v, 0.6) * cssH;
        ctx2d.lineTo(i * step, cssH - h);
      });
      ctx2d.lineTo(cssW, cssH);
      ctx2d.closePath();
      ctx2d.fill();
    };

    // Paused state — the visualizer is the widget's only visible affordance
    // now (no icon, no label), so it has to read as "tap to play" even at
    // rest: a small static shape, no animation (nothing is actually
    // happening yet, so nothing should move).
    const drawResting = () => {
      const REST = 0.16;
      if (style === "pulse") drawPulse(REST);
      else if (style === "wave") drawWave(Array.from({ length: 12 }, () => 0.5));
      else if (style === "waveform")
        drawWaveform(Array.from({ length: WAVEFORM_BAR_COUNT }, () => REST));
      else if (style === "circular")
        drawCircular(Array.from({ length: CIRCULAR_BAR_COUNT }, () => REST));
      else if (style === "spectrum")
        drawSpectrum(Array.from({ length: SPECTRUM_BAND_COUNT }, () => REST));
      else drawBars(Array.from({ length: BAR_COUNT }, () => REST));
    };

    if (!playing) {
      ctx2d.clearRect(0, 0, cssW, cssH);
      drawResting();
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const drawIdle = (t: number) => {
      // Idle fallback — a slow synthetic sine so the pill still reads as
      // "playing" when there's no real (untainted) analyser data to draw.
      if (style === "pulse") {
        drawPulse(0.35 + 0.25 * Math.sin(t / 400));
      } else if (style === "wave") {
        const levels = Array.from(
          { length: 12 },
          (_, i) => 0.35 + 0.25 * Math.sin(t / 400 + i * 0.8),
        );
        drawWave(levels);
      } else if (style === "waveform") {
        // Deliberately not a shared phase/period across bars (unlike the
        // other idle patterns) — a linear phase gradient looks like a wave
        // traveling sideways, which is exactly the bug this style used to
        // have with real data. Each bar wobbling on its own period reads as
        // independent energy instead.
        const levels = Array.from(
          { length: WAVEFORM_BAR_COUNT },
          (_, i) => 0.3 + 0.6 * Math.abs(Math.sin(t / (300 + i * 37) + i * 2.1)),
        );
        drawWaveform(levels);
      } else if (style === "circular") {
        const levels = Array.from({ length: CIRCULAR_BAR_COUNT }, (_, i) =>
          Math.abs(Math.sin(t / 260 + i * 0.9)),
        );
        drawCircular(levels);
      } else if (style === "spectrum") {
        const levels = Array.from(
          { length: SPECTRUM_BAND_COUNT },
          (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(t / 350 + i * 0.5)),
        );
        drawSpectrum(levels);
      } else {
        const levels = Array.from({ length: BAR_COUNT }, (_, i) =>
          Math.abs(Math.sin(t / 220 + i * 1.1)),
        );
        drawBars(levels);
      }
    };

    const drawFrame = (rawT: number) => {
      const t = rawT * speedMul;
      ctx2d.clearRect(0, 0, cssW, cssH);
      const analyser = analyserRef.current;
      let drewReal = false;

      if (analyser) {
        if (style === "wave") {
          const timeData = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(timeData);
          if (hasSignal(timeData, 128)) {
            drawWave(Array.from(timeData, (v) => v / 255));
            drewReal = true;
          }
        } else {
          // Bars, Pulse, Waveform, Circular, and Spectrum all read the same
          // frequency-band data — each bar/tick/band is pinned to a fixed
          // position, so it only ever grows/shrinks in place. Waveform used
          // to read raw time-domain sample chunks instead, which are a thin
          // slice of "right now"; as playback advances, the audio's phase
          // inside that slice drifts frame to frame, and a linear phase
          // drift across evenly spaced bars *looks* like the whole thing
          // scrolling sideways — not what "waveform" should mean here.
          const freqData = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(freqData);
          if (hasSignal(freqData, 0)) {
            const barCount =
              style === "pulse"
                ? 3
                : style === "waveform"
                  ? WAVEFORM_BAR_COUNT
                  : style === "circular"
                    ? CIRCULAR_BAR_COUNT
                    : style === "spectrum"
                      ? SPECTRUM_BAND_COUNT
                      : BAR_COUNT;
            const bands = logBandLevels(freqData, barCount);
            updateBeatPulse(bands[0]);
            const boosted = bands.map((v) => Math.min(1, v + beatPulse * 0.22));
            if (style === "pulse") {
              const avg = boosted.reduce((a, b) => a + b, 0) / boosted.length;
              drawPulse(applyEnvelope([avg])[0]);
            } else if (style === "waveform") {
              drawWaveform(applyEnvelope(boosted));
            } else if (style === "circular") {
              drawCircular(applyEnvelope(boosted));
            } else if (style === "spectrum") {
              drawSpectrum(applyEnvelope(boosted));
            } else {
              drawBars(applyEnvelope(boosted));
            }
            drewReal = true;
          }
        }
      }

      if (!drewReal) drawIdle(t);

      if (!reduced) raf = requestAnimationFrame(drawFrame);
    };

    if (reduced) drawFrame(0);
    else raf = requestAnimationFrame(drawFrame);

    return () => cancelAnimationFrame(raf);
  }, [playing, style, color, size, opacity, roundness, speed, analyserRef]);

  return <canvas ref={canvasRef} aria-hidden className={SIZE_CLASS[size]} />;
}
