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
  // Style previews only (the editor card): no track is involved, so animate a
  // synthetic loop to show what the style looks like. Never set for a real
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
    let beatCooldown = 0;
    // Auto-gain: slowly-decaying running peak of the loudest band, so a quiet
    // master and a brickwalled one both fill the meter — what makes the
    // visualizer feel "alive" on any track instead of only on loud ones.
    let agcPeak = 0.5;
    let freqBuf: Uint8Array<ArrayBuffer> | null = null;
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
            // 2048 samples is far more than a 48px-wide line can show.
            const POINTS = 64;
            const stride = Math.floor(timeData.length / POINTS);
            drawWave(Array.from({ length: POINTS }, (_, i) => timeData[i * stride] / 255));
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

      if (!drewReal) {
        if (demo) drawIdle(t);
        else drawResting();
      }

      if (!reduced) raf = requestAnimationFrame(drawFrame);
    };

    if (reduced) drawFrame(0);
    else raf = requestAnimationFrame(drawFrame);

    return () => cancelAnimationFrame(raf);
  }, [playing, style, color, size, opacity, roundness, speed, analyserRef, demo]);

  return <canvas ref={canvasRef} aria-hidden className={SIZE_CLASS[size]} />;
}
