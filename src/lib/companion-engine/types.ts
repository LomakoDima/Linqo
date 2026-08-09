// Shared types for the Companion Engine. See src/lib/companion-engine/README.md
// for the architecture overview: CompanionEngine (orchestrator) composes an
// AnimationController (frame timing), a MovementController (position/behavior),
// and an InteractionController (DOM events) around a CompanionConfig resolved
// through CompanionRegistry — this file is the vocabulary all of them share.

// Every state a companion can be drawn in. "dance" isn't in the brief's
// six-state list by name but is required by the "music playing → dances"
// page-event, so it's just another row in the same grid — the animation
// system doesn't distinguish it from the others.
export type CompanionAnimState = "idle" | "walk" | "jump" | "wave" | "happy" | "dance" | "sleep";

export const COMPANION_ANIM_STATES: readonly CompanionAnimState[] = [
  "idle",
  "walk",
  "jump",
  "wave",
  "happy",
  "dance",
  "sleep",
];

// One row of a sprite sheet grid: `frames` cells starting at column 0 of
// row `row`, each frameWidth x frameHeight, played back at `fps`.
export interface CompanionClip {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export type CompanionAnimationSet = Record<CompanionAnimState, CompanionClip>;

// The config shape every companion is defined by. A real hand-authored sheet
// (`spriteSheet`) is the intended long-term asset; `portrait` is today's
// fallback — a single pixel-art pose the engine bakes into a full animated
// sheet at runtime (see spriteSheetBaker.ts). Exactly one of the two must be
// set. The rendering engine itself never knows or cares which one produced
// the sheet it's playing.
export interface CompanionConfig {
  id: string;
  name: string;
  spriteSheet?: string;
  portrait?: string;
  frameWidth: number;
  frameHeight: number;
  animations: CompanionAnimationSet;
  // px/second while walking.
  speed: number;
  // 0..1 — chance, on each idle-brain tick, that the companion does a quirk
  // (look around / short walk) instead of just standing there breathing.
  idleChance: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}
