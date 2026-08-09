// CompanionRegistry — the single place a CompanionConfig can be looked up by
// id. The rendering engine (AnimationController/MovementController/
// CompanionEngine) only ever depends on this module and on CompanionConfig
// from types.ts; it has no idea "bear" or "fox" exist. Adding companion #7
// is calling `registerCompanion` once — nothing else in the engine changes.

import type { CompanionAnimationSet, CompanionConfig } from "./types";

const registry = new Map<string, CompanionConfig>();

export function registerCompanion(config: CompanionConfig): void {
  registry.set(config.id, config);
}

export function getCompanionConfig(id: string): CompanionConfig | undefined {
  return registry.get(id);
}

export function listCompanions(): CompanionConfig[] {
  return [...registry.values()];
}

// ---------------------------------------------------------------------------
// Built-in companions
// ---------------------------------------------------------------------------
// None of these animals have a hand-drawn multi-frame sheet yet — only the
// single portrait already sitting in public/companions/. They all share one
// baked grid layout (see spriteSheetBaker.ts, which turns that one portrait
// into this exact grid using squash/stretch/rotate transforms — classic
// "game juice" moves that read as alive even from a single static pose).
// The moment a real spriteSheet is authored for any of them, set its
// `spriteSheet`/`portrait` swap here — the rest of the engine is unaffected.
const BAKED_LAYOUT: CompanionAnimationSet = {
  idle: { row: 0, frames: 6, fps: 6, loop: true },
  walk: { row: 1, frames: 6, fps: 8, loop: true },
  jump: { row: 2, frames: 5, fps: 10, loop: false },
  wave: { row: 3, frames: 5, fps: 8, loop: false },
  happy: { row: 4, frames: 6, fps: 10, loop: true },
  dance: { row: 5, frames: 8, fps: 6, loop: true },
  sleep: { row: 6, frames: 4, fps: 2, loop: true },
};

const BAKED_FRAME_SIZE = 72;

function bakedCompanion(
  id: string,
  name: string,
  portrait: string,
  speed: number,
  idleChance: number,
): CompanionConfig {
  return {
    id,
    name,
    portrait,
    frameWidth: BAKED_FRAME_SIZE,
    frameHeight: BAKED_FRAME_SIZE,
    animations: BAKED_LAYOUT,
    speed,
    idleChance,
  };
}

registerCompanion(bakedCompanion("bear", "Bear", "/companions/bear.png", 26, 0.3));
registerCompanion(bakedCompanion("fox", "Fox", "/companions/fox.png", 40, 0.4));
registerCompanion(bakedCompanion("panda", "Panda", "/companions/panda.png", 24, 0.28));
registerCompanion(bakedCompanion("rabbit", "Rabbit", "/companions/rabbit.png", 52, 0.45));
registerCompanion(bakedCompanion("cat", "Cat", "/companions/cat.png", 36, 0.25));
registerCompanion(bakedCompanion("dog", "Dog", "/companions/dog.png", 44, 0.48));
