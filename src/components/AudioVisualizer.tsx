import { useEffect, useRef } from "react";
import type { MusicVisualizerSize, MusicVisualizerStyle } from "@/lib/link-store";

const BAR_COUNT = 6;
const WAVEFORM_BAR_COUNT = 11;
const CIRCULAR_BAR_COUNT = 20;
const SPECTRUM_BAND_COUNT = 20;

const SIZE_CLASS: Record<MusicVisualizerSize, string> = {
  sm: "h-4 w-9",
  md: "h-5 w-12",
  lg: "h-7 w-16",
};
const RADIAL_SIZE_CLASS: Record<MusicVisualizerSize, string> = {
  sm: "h-6 w-9",
  md: "h-8 w-12",
  lg: "h-10 w-16",
};

// How fast a bar's rendered level chases the raw analyser reading — high
// attack (snaps up almost instantly on a hit) paired with a much lower
// decay (eases back down) is what makes a spectrum meter read as "hitting
// the beat" rather than just wobbling with the raw signal. Both scale with
// the `speed` prop (see applyEnvelope).
const BASE_ATTACK = 0.75;
const BASE_DECAY = 0.12;

// Beat detection: bass-region energy (kick/low bass) against its own recent
// average. A real kick spikes well above that average; a sustained pad or
// general loudness doesn't. The refractory gap stops one drum hit (which
// rings for a few frames) from registering as several beats, which is also
// what keeps the pulse locked to the actual tempo rather than to noise.
const BEAT_HISTORY_FRAMES = 43; // ~0.7s at 60fps
const BEAT_THRESHOLD = 1.28;
const BEAT_FLOOR = 0.1;
const BEAT_DECAY = 0.86;
const BEAT_REFRACTORY_FRAMES = 10; // ~170ms — shorter than any 16th note under ~170 BPM
const BEAT_BOOST = 0.3;
const BAND_AVG_RATE = 0.03; // ~0.5s memory per band

// Band layout: 40 Hz - 14 kHz on a log axis, like a hi-fi spectrum analyser.
const FREQ_MIN = 40;
const FREQ_MAX = 14000;
const BASS_MIN = 40;
const BASS_MAX = 150;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Mean level of the FFT bins covering [fromHz, toHz], 0..1. Bin 0 (DC) is
 * never read, but — unlike the earlier linear/log-by-index scheme — the
 * lowest bin that holds real bass is, so kick drums actually register.
 */
function hzRangeLevel(freqData: Uint8Array, binHz: number, fromHz: number, toHz: number) {
  const from = Math.max(1, Math.floor(fromHz / binHz));
  const to = Math.min(freqData.length - 1, Math.max(from, Math.ceil(toHz / binHz)));
  let sum = 0;
  let peak = 0;
  for (let j = from; j <= to; j++) {
    sum += freqData[j];
    if (freqData[j] > peak) peak = freqData[j];
  }
  const mean = sum / (to - from + 1);
  // Blend of mean and peak: the mean alone washes out narrow tonal peaks in
  // the wide high bands, the peak alone flickers.
  return (0.6 * mean + 0.4 * peak) / 255;
}

/**
 * Buckets FFT bins into `count` log-spaced bands by real frequency (using the
 * context's sample rate), with a gentle upward tilt: music's spectrum falls
 * roughly 3 dB per octave, so without it the right-hand bars sit near zero on
 * almost every track.
 */
function bandLevels(freqData: Uint8Array, count: number, sampleRate: number): number[] {
  const binHz = sampleRate / 2 / freqData.length;
  const fMax = Math.min(FREQ_MAX, (sampleRate / 2) * 0.95);
  const ratio = fMax / FREQ_MIN;
  const levels: number[] = [];
  for (let i = 0; i < count; i++) {
    const lo = FREQ_MIN * Math.pow(ratio, i / count);
    const hi = FREQ_MIN * Math.pow(ratio, (i + 1) / count);
    const tilt = 0.85 + (0.7 * i) / Math.max(1, count - 1);
    levels.push(hzRangeLevel(freqData, binHz, lo, hi) * tilt);
  }
  return levels;
}

/**
 * Small canvas that paints real analyser data (see useAudioAnalyser) next to
 * the "now playing" pill every animation frame while the track is playing —
 * replaces what used to be a canned CSS loop with motion that actually
 * tracks the track's bass and beat, not just raw volume.
 * Real data comes from our own uploads (loaded with crossOrigin); a pasted
 * external URL is cross-origin and reads as silence (see useAudioAnalyser).
 * With no signal the bars rest instead of faking motion — only `demo`
 * previews animate a synthetic loop. Same footprint either way, so nothing
 * shifts around it.
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
  demo = false,
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
  // Style previews only: animate a synthetic loop while playing, otherwise
  // freeze a representative sample. Never set for a real
  // player — there, no audio data means no motion, not a made-up one.
  demo?: boolean;
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
    const setPaint = () => {
      const paint = color === "currentColor" ? getComputedStyle(canvas).color : color;
      ctx2d.fillStyle = paint;
      ctx2d.strokeStyle = paint;
    };
    setPaint();
    ctx2d.globalAlpha = Math.max(0, Math.min(100, opacity)) / 100;

    const roundedFraction = Math.max(0, Math.min(100, roundness)) / 100;
    const speedMul = Math.max(0.2, Math.min(3, speed));
    const attack = Math.min(0.95, BASE_ATTACK * speedMul);
    const decay = Math.min(0.6, BASE_DECAY * speedMul);

    let raf = 0;
    const smoothed: number[] = []; // per-bar attack/decay envelope state
    const beatHistory: number[] = [];
    let beatPulse = 0; // 0..1, spikes on a detected beat, decays each frame
    let beatCooldown = 0;
    // Auto-gain: slowly-decaying running peak of the loudest band, so a quiet
    // master and a brickwalled one both fill the meter — what makes the
    // visualizer feel "alive" on any track instead of only on loud ones.
    let agcPeak = 0.5;
    let freqBuf: Uint8Array<ArrayBuffer> | null = null;
    let timeBuf: Uint8Array<ArrayBuffer> | null = null;
    let wavePeak = 0.35;
    let previousPulseLevel = 0;
    let lastPulseTime = -Infinity;
    const ripples: { born: number; strength: number }[] = [];
    const spectrumPeaks: number[] = [];
    // Slow per-band average, the baseline a "hit" is measured against.
    const bandAvg: number[] = [];

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
      const avg = beatHistory.length
        ? beatHistory.reduce((a, b) => a + b, 0) / beatHistory.length
        : bassLevel;
      beatHistory.push(bassLevel);
      if (beatHistory.length > BEAT_HISTORY_FRAMES) beatHistory.shift();
      if (beatCooldown > 0) beatCooldown--;
      const isBeat =
        beatCooldown === 0 &&
        beatHistory.length >= 12 &&
        bassLevel > BEAT_FLOOR &&
        bassLevel > avg * BEAT_THRESHOLD;
      if (isBeat) {
        beatPulse = 1;
        beatCooldown = BEAT_REFRACTORY_FRAMES;
      } else {
        beatPulse *= BEAT_DECAY;
      }
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

    // Midpoint curves stay inside their control points, including at the
    // smallest size. Tapering the ends gives the signal a clean silhouette.
    const drawWave = (points: number[]) => {
      const pad = 1.5;
      const step = (cssW - pad * 2) / (points.length - 1);
      const midY = cssH / 2;
      const amplitude = Math.max(1, midY - 2);
      const trace = (scale: number) => {
        const coordinates = points.map((value, i) => {
          const neighbor =
            points[Math.max(0, i - 1)] * 0.25 +
            value * 0.5 +
            points[Math.min(points.length - 1, i + 1)] * 0.25;
          const taper = Math.pow(Math.sin((i / (points.length - 1)) * Math.PI), 0.65);
          return { x: pad + i * step, y: midY - (neighbor - 0.5) * 2 * amplitude * taper * scale };
        });
        ctx2d.beginPath();
        ctx2d.moveTo(coordinates[0].x, coordinates[0].y);
        for (let i = 1; i < coordinates.length - 1; i++) {
          const p = coordinates[i];
          const next = coordinates[i + 1];
          ctx2d.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
        }
        const last = coordinates[coordinates.length - 1];
        ctx2d.lineTo(last.x, last.y);
        ctx2d.stroke();
      };
      ctx2d.save();
      ctx2d.lineCap = roundedFraction > 0.5 ? "round" : "butt";
      ctx2d.lineJoin = "round";
      ctx2d.lineWidth = 1;
      ctx2d.globalAlpha *= 0.2;
      trace(-0.65);
      ctx2d.restore();
      ctx2d.save();
      ctx2d.lineCap = roundedFraction > 0.5 ? "round" : "butt";
      ctx2d.lineWidth = cssH >= 24 ? 1.7 : 1.4;
      trace(1);
      ctx2d.restore();
    };

    const drawPulse = (level: number, t = 0) => {
      if (t === 0) {
        ripples.length = 0;
        lastPulseTime = -Infinity;
      }
      const cx = cssW / 2;
      const cy = cssH / 2;
      const outerR = Math.min(cssW, cssH) / 2 - 1.5;
      const ringR = outerR * (0.43 + level * 0.17);
      if (
        t > 0 &&
        (beatPulse > 0.98 || level - previousPulseLevel > 0.055) &&
        t - lastPulseTime > 220
      ) {
        ripples.push({ born: t, strength: 0.5 + level * 0.5 });
        if (ripples.length > 3) ripples.shift();
        lastPulseTime = t;
      }
      previousPulseLevel = level;
      const ring = (r: number, alpha: number, width: number) => {
        ctx2d.save();
        ctx2d.globalAlpha *= alpha;
        ctx2d.lineWidth = width;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2d.stroke();
        ctx2d.restore();
      };
      ring(outerR * 0.92, 0.13, 0.8);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const progress = (t - ripples[i].born) / 850;
        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        const eased = 1 - Math.pow(1 - progress, 2);
        ring(
          outerR * (0.52 + eased * 0.46),
          Math.pow(1 - progress, 1.5) * ripples[i].strength * 0.55,
          1,
        );
      }
      ring(ringR, 0.8, cssH >= 32 ? 1.4 : 1.15);
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, Math.max(1.6, outerR * (0.14 + level * 0.08)), 0, Math.PI * 2);
      ctx2d.fill();
    };

    // Ticks grow outwards, leaving a real open center. Previously their
    // local rotation pointed them inwards, merging them into a dark dot.
    const drawCircular = (levels: number[]) => {
      const cx = cssW / 2;
      const cy = cssH / 2;
      const outerR = Math.min(cssW, cssH) / 2 - 1.5;
      const innerR = outerR * 0.49;
      const tickWidth = cssH >= 32 ? 1.5 : 1.1;
      levels.forEach((v, i) => {
        const angle = (i / levels.length) * Math.PI * 2 - Math.PI / 2;
        const adjacent =
          levels[(i + levels.length - 1) % levels.length] * 0.15 +
          v * 0.7 +
          levels[(i + 1) % levels.length] * 0.15;
        const length = (outerR - innerR) * (0.22 + Math.pow(clamp01(adjacent), 0.7) * 0.78);
        ctx2d.save();
        ctx2d.translate(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx2d.rotate(angle - Math.PI / 2);
        ctx2d.beginPath();
        ctx2d.roundRect(
          -tickWidth / 2,
          0,
          tickWidth,
          length,
          Math.min(tickWidth / 2, length / 2) * roundedFraction,
        );
        ctx2d.fill();
        ctx2d.restore();
      });
    };

    // Narrow log-frequency columns with slowly falling peak markers. The
    // gaps keep every band legible instead of filling a jagged polygon.
    const drawSpectrum = (levels: number[]) => {
      const pad = 1;
      const step = (cssW - pad * 2) / levels.length;
      const width = step * 0.62;
      const bottom = cssH - 1;
      levels.forEach((v, i) => {
        const height = Math.max(1, Math.pow(clamp01(v), 0.8) * (cssH - 3));
        const x = pad + i * step + (step - width) / 2;
        spectrumPeaks[i] = Math.max(height, (spectrumPeaks[i] ?? height) - 0.12 * speedMul);
        ctx2d.beginPath();
        ctx2d.roundRect(x, bottom - height, width, height, width * 0.5 * roundedFraction);
        ctx2d.fill();
        if (spectrumPeaks[i] - height > 2.5) {
          ctx2d.save();
          ctx2d.globalAlpha *= 0.4;
          ctx2d.fillRect(x, Math.max(0.5, bottom - spectrumPeaks[i] - 1.5), width, 0.8);
          ctx2d.restore();
        }
      });
    };

    // Paused state — the visualizer is the widget's only visible affordance
    // now (no icon, no label), so it has to read as "tap to play" even at
    // rest: a small static shape, no animation (nothing is actually
    // happening yet, so nothing should move).
    const drawResting = () => {
      const REST = 0.16;
      if (style === "pulse") drawPulse(REST);
      else if (style === "wave")
        drawWave(
          Array.from({ length: 32 }, (_, i) => 0.5 + Math.sin((i / 31) * Math.PI * 4) * 0.2),
        );
      else if (style === "waveform")
        drawWaveform(Array.from({ length: WAVEFORM_BAR_COUNT }, () => REST));
      else if (style === "circular")
        drawCircular(
          Array.from(
            { length: CIRCULAR_BAR_COUNT },
            (_, i) => 0.16 + Math.pow(Math.sin((i * Math.PI) / 10), 2) * 0.22,
          ),
        );
      else if (style === "spectrum")
        drawSpectrum(
          Array.from(
            { length: SPECTRUM_BAND_COUNT },
            (_, i) =>
              0.08 + Math.pow(Math.sin(((i + 1) / 21) * Math.PI), 2) * (0.17 + (i % 3) * 0.04),
          ),
        );
      else drawBars(Array.from({ length: BAR_COUNT }, () => REST));
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const drawIdle = (t: number) => {
      // Idle fallback — a slow synthetic sine so the pill still reads as
      // "playing" when there's no real (untainted) analyser data to draw.
      if (style === "pulse") {
        const phase = (t % 1100) / 1100;
        drawPulse(0.12 + 0.78 * Math.exp(-Math.pow((phase - 0.12) / 0.12, 2)), t);
      } else if (style === "wave") {
        const levels = Array.from(
          { length: 40 },
          (_, i) =>
            0.5 +
            Math.sin((i / 39) * Math.PI * 4 - t / 650) * (0.24 + 0.15 * Math.sin(t / 900)) +
            Math.sin((i / 39) * Math.PI * 7 + t / 1050) * 0.08,
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
        const levels = Array.from(
          { length: CIRCULAR_BAR_COUNT },
          (_, i) => 0.15 + Math.pow(0.5 + 0.5 * Math.sin(t / 520 + i * 0.8), 2) * 0.7,
        );
        drawCircular(levels);
      } else if (style === "spectrum") {
        const levels = Array.from({ length: SPECTRUM_BAND_COUNT }, (_, i) =>
          clamp01(
            (0.4 + 0.6 * Math.exp(-Math.pow((i - 5) / 10, 2))) *
              (0.42 +
                0.24 * Math.sin(t / (240 + i * 13) + i * 1.7) +
                0.2 * Math.sin(t / 510 + i * 0.43)),
          ),
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
      if (!playing) {
        if (demo) drawIdle(0);
        else drawResting();
        return;
      }
      const analyser = analyserRef.current;
      let drewReal = false;

      if (analyser) {
        if (style === "wave") {
          if (!timeBuf || timeBuf.length !== analyser.fftSize)
            timeBuf = new Uint8Array(analyser.fftSize);
          const timeData = timeBuf;
          analyser.getByteTimeDomainData(timeData);
          if (hasSignal(timeData, 128)) {
            // Start at a rising zero crossing to reduce sideways phase
            // jitter. Average neighboring samples before fitting curves.
            const POINTS = 40;
            const span = Math.floor(timeData.length / 2);
            let start = Math.floor(timeData.length / 4);
            for (let i = start; i < span; i++) {
              if (timeData[i] <= 128 && timeData[i + 1] > 128) {
                start = i;
                break;
              }
            }
            const samples = Array.from({ length: POINTS }, (_, i) => {
              const index = Math.min(
                timeData.length - 2,
                start + Math.floor((i * (span - 1)) / (POINTS - 1)),
              );
              return (
                ((timeData[Math.max(0, index - 1)] + timeData[index] + timeData[index + 1]) / 3 -
                  128) /
                128
              );
            });
            wavePeak = Math.max(0.08, wavePeak * 0.985, ...samples.map(Math.abs));
            drawWave(samples.map((value) => clamp01(0.5 + (value / wavePeak) * 0.45)));
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
          if (!freqBuf || freqBuf.length !== analyser.frequencyBinCount) {
            freqBuf = new Uint8Array(analyser.frequencyBinCount);
          }
          const freqData = freqBuf;
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
            const sampleRate = analyser.context.sampleRate;
            const bands = bandLevels(freqData, barCount, sampleRate);
            updateBeatPulse(
              hzRangeLevel(freqData, sampleRate / 2 / freqData.length, BASS_MIN, BASS_MAX),
            );
            agcPeak = Math.max(agcPeak * 0.997, ...bands, 0.25);
            // Two parts per band: where it sits in absolute terms (so a held
            // note or bass line still shows), and how far it just jumped
            // above its own recent average (so a snare, hat or kick pops
            // even over a loud, steady bed). Plus the global beat pulse.
            const boosted = bands.map((v, i) => {
              const avg = bandAvg[i] ?? v;
              bandAvg[i] = avg + (v - avg) * BAND_AVG_RATE;
              const level = Math.pow(clamp01(v / agcPeak), 1.5);
              const punch = clamp01((v / Math.max(avg, 0.02) - 1) * 0.9);
              return clamp01(level * 0.55 + punch * 0.6 + beatPulse * BEAT_BOOST);
            });
            if (style === "pulse") {
              const avg = boosted.reduce((a, b) => a + b, 0) / boosted.length;
              drawPulse(applyEnvelope([avg])[0], t);
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

      if (!drewReal) {
        if (demo) drawIdle(t);
        else drawResting();
      }
    };

    const loop = (t: number) => {
      drawFrame(t);
      raf = requestAnimationFrame(loop);
    };
    // Repaint inherited ink on theme changes, even while paused. Explicit
    // profile colors keep the exact same value in either editor theme.
    const observer =
      color === "currentColor"
        ? new MutationObserver(() => {
            setPaint();
            if (!playing || reduced) drawFrame(0);
          })
        : null;
    for (
      let ancestor: HTMLElement | null = canvas;
      observer && ancestor;
      ancestor = ancestor.parentElement
    ) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ["class", "style"] });
    }
    drawFrame(0);
    if (playing && !reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [playing, style, color, size, opacity, roundness, speed, analyserRef, demo]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={(style === "pulse" || style === "circular" ? RADIAL_SIZE_CLASS : SIZE_CLASS)[size]}
    />
  );
}
