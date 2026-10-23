import { useRef } from "react";

/**
 * Wires a Web Audio AnalyserNode to a shared <audio> element, on demand.
 * `ensure()` must be called synchronously inside the same click handler that
 * calls `audio.play()` — AudioContext starts suspended until a user gesture,
 * and `createMediaElementSource` permanently reroutes the element's output
 * through the Web Audio graph, so both the context creation and its
 * `resume()` need to ride the same gesture the browser is already trusting.
 *
 * `createMediaElementSource` throws if called twice on the same element, so
 * the analyser is built once and reused; if it throws for any reason (no
 * Web Audio support, element already claimed elsewhere), the element's
 * native output is untouched and playback keeps working with no visualizer.
 *
 * The <audio> element only gets `crossOrigin` for tracks we host ourselves
 * (see isOwnTrackUrl) — those are served with CORS headers, so the analyser
 * reads real data. Setting it for a pasted third-party URL would require
 * that host to be CORS-permissive just to *play at all*, which is worse than
 * losing the visualizer. Such a track still plays, but counts as "tainted"
 * for Web Audio: the analyser silently reads zeros and the visualizer rests.
 */
export function useAudioAnalyser(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const ensure = (): AnalyserNode | null => {
    const audio = audioRef.current;
    if (!audio) return null;

    if (analyserRef.current) {
      audioCtxRef.current?.resume().catch(() => {});
      return analyserRef.current;
    }

    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;

      const ctx = new AudioContextCtor();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      // 2048 (1024 bins, ~21 Hz each at 44.1 kHz) is what it takes to resolve
      // a kick drum from a bass line — at 256 a single bin was 172 Hz wide
      // and all the bass fell into the bin AudioVisualizer skips. Smoothing
      // is light and the decibel window narrow because AudioVisualizer
      // applies its own auto-gain and attack/decay envelope on top; heavy
      // analyser smoothing would blur beats into mush.
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -25;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctx.resume().catch(() => {});

      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      return analyser;
    } catch {
      return null;
    }
  };

  return { ensure, analyserRef };
}
