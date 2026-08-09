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
 * The <audio> element deliberately has no `crossOrigin` attribute — setting
 * one would require every pasted track URL to come from a CORS-permissive
 * host just to *play at all*, which is worse than losing the visualizer.
 * Without it, playback always works, but a cross-origin track (a pasted
 * URL, as opposed to our own upload, which is same-origin) counts as
 * "tainted" for Web Audio purposes: the analyser silently reads zeros
 * instead of throwing, so the visualizer just idles rather than erroring.
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
      // 256 (128 frequency bins) is enough to tell bass from treble — see
      // AudioVisualizer's log-spaced band bucketing — without being
      // wasteful for a 32px-wide canvas. Smoothing is fairly light because
      // AudioVisualizer applies its own attack/decay envelope on top for
      // musical (fast-rise, slow-fall) motion; leaving all of it to the
      // analyser would blur beats into mush.
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
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
