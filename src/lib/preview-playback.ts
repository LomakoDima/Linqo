import { useSyncExternalStore } from "react";
import type { RefObject } from "react";

/**
 * Playback state of the builder's Track preview player, shared so every
 * visualizer in the editor (the Visualizer card and the phone preview) moves
 * with the track the person is auditioning — the same analyser feeds them
 * all, so there is exactly one audio element playing.
 */
export type PreviewPlayback = {
  playing: boolean;
  analyserRef: RefObject<AnalyserNode | null> | null;
};

const IDLE: PreviewPlayback = { playing: false, analyserRef: null };

let state: PreviewPlayback = IDLE;
const listeners = new Set<() => void>();

export function setPreviewPlayback(next: PreviewPlayback): void {
  if (next.playing === state.playing && next.analyserRef === state.analyserRef) return;
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreviewPlayback(): PreviewPlayback {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}
