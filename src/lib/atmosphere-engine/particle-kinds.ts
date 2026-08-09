import type { ParticleKind } from "@/lib/link-store";

// Data-only presets a generic particle sim reads from — mirrors the
// BLOCK_REGISTRY/MUSIC_GENRES idiom (a closed, in-repo set as a Record, not
// ten hand-built systems). "glyph" kinds use a plain (non-emoji-presentation)
// Unicode symbol so `color` actually tints them via canvas fillStyle —
// real color emoji ignore fillStyle, so those are deliberately avoided here.
export interface ParticleKindConfig {
  label: string;
  shape: "circle" | "glyph";
  glyph?: string;
  color: string;
  // Baseline particle count, px size, and px/second speed — each scaled by
  // the profile's own density/size/speed multipliers (see ParticleController).
  density: number;
  size: number;
  speed: number;
  // Horizontal wander amplitude, px.
  sway: number;
  // "down"/"up" fall or rise and wrap at the far edge; "drift" wanders and
  // wraps at all four edges.
  direction: "down" | "up" | "drift";
  // 0-100 baseline opacity.
  opacity: number;
}

export const PARTICLE_KINDS: Record<ParticleKind, ParticleKindConfig> = {
  snow: {
    label: "Snow",
    shape: "circle",
    color: "#ffffff",
    density: 60,
    size: 4,
    speed: 35,
    sway: 22,
    direction: "down",
    opacity: 85,
  },
  rain: {
    label: "Rain",
    shape: "circle",
    color: "#8ec9ff",
    density: 90,
    size: 2.5,
    speed: 280,
    sway: 2,
    direction: "down",
    opacity: 55,
  },
  leaves: {
    label: "Leaves",
    shape: "circle",
    color: "#c97b3d",
    density: 20,
    size: 7,
    speed: 50,
    sway: 38,
    direction: "down",
    opacity: 90,
  },
  stars: {
    label: "Stars",
    shape: "glyph",
    glyph: "✦",
    color: "#ffe9a8",
    density: 40,
    size: 12,
    speed: 8,
    sway: 6,
    direction: "drift",
    opacity: 80,
  },
  fireflies: {
    label: "Fireflies",
    shape: "circle",
    color: "#d4ff5c",
    density: 25,
    size: 3.5,
    speed: 14,
    sway: 42,
    direction: "drift",
    opacity: 75,
  },
  sakura: {
    label: "Sakura",
    shape: "circle",
    color: "#ffb7d1",
    density: 22,
    size: 6,
    speed: 42,
    sway: 40,
    direction: "down",
    opacity: 90,
  },
  dust: {
    label: "Floating Dust",
    shape: "circle",
    color: "#ffffff",
    density: 50,
    size: 2,
    speed: 6,
    sway: 16,
    direction: "drift",
    opacity: 35,
  },
  bubbles: {
    label: "Bubbles",
    shape: "circle",
    color: "#bfe9ff",
    density: 30,
    size: 9,
    speed: 30,
    sway: 26,
    direction: "up",
    opacity: 45,
  },
  hearts: {
    label: "Hearts",
    shape: "glyph",
    glyph: "♥",
    color: "#ff6b9d",
    density: 18,
    size: 14,
    speed: 34,
    sway: 30,
    direction: "up",
    opacity: 85,
  },
  sparkles: {
    label: "Pixel Sparkles",
    shape: "glyph",
    glyph: "✧",
    color: "#fff3b0",
    density: 30,
    size: 11,
    speed: 20,
    sway: 20,
    direction: "drift",
    opacity: 85,
  },
};
