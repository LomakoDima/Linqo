import { useCallback, useEffect, useRef } from "react";
import type { AmbientSettings } from "@/lib/link-store";

// N <audio> elements, one per enabled+configured ambient layer, driven by
// a single gesture-gated unlock (see NowPlayingWidget/AmbientOnlyWidget in
// LinkPreview.tsx) rather than N independent taps.
export function useAmbientLayers(ambient: AmbientSettings | undefined) {
  const audioRefs = useRef(new Map<string, HTMLAudioElement>());

  const activeLayers = (ambient?.enabled ? (ambient.layers ?? []) : []).filter(
    (l) => l.enabled && l.url,
  );

  const registerRef = useCallback(
    (kind: string) => (el: HTMLAudioElement | null) => {
      if (el) audioRefs.current.set(kind, el);
      else audioRefs.current.delete(kind);
    },
    [],
  );

  // Keeps each layer's volume synced without needing a re-unlock — mirrors
  // NowPlayingWidget's imperative volume effect (there's no controlled
  // `volume` prop on <audio> in React).
  useEffect(() => {
    activeLayers.forEach((layer) => {
      const audio = audioRefs.current.get(layer.kind);
      if (audio) audio.volume = (layer.volume ?? 50) / 100;
    });
  });

  const unlockAll = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.play().catch(() => {});
    });
  }, []);

  const pauseAll = useCallback(() => {
    audioRefs.current.forEach((audio) => audio.pause());
  }, []);

  return { activeLayers, registerRef, unlockAll, pauseAll };
}
