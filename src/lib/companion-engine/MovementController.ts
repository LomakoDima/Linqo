// MovementController — owns where the companion is and how it gets to where
// it's going next. It knows nothing about sprites or DOM events; it just
// tracks a position, an optional target, and moves toward that target at a
// fixed speed, clamped into whichever "safe zone" rectangles it's handed
// each tick (see CompanionEngine — these are the areas of the page judged
// clear of buttons/text, e.g. the banner strip and the empty gutters beside
// the centered content column). That clamp is what makes "never blocks
// buttons or text" structural rather than best-effort: a target the
// companion can't reach without leaving a safe zone just gets pulled back to
// the nearest point still inside one.

import type { Point, Rect } from "./types";

function clampNum(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// A zone shrunk by the companion's own footprint, so a position anywhere in
// the result places the whole sprite (not just its top-left corner) inside
// the original zone. Zones too small to fit the companion at all drop out.
function usableZones(zones: Rect[], size: number): Rect[] {
  return zones
    .map((z) => ({ x: z.x, y: z.y, w: z.w - size, h: z.h - size }))
    .filter((z) => z.w > 0 && z.h > 0);
}

export function clampToZones(p: Point, zones: Rect[], size: number): Point {
  const usable = usableZones(zones, size);
  if (usable.length === 0) return p;
  for (const z of usable) {
    if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) return p;
  }
  let best = usable[0];
  let bestDist = Infinity;
  for (const z of usable) {
    const cx = clampNum(p.x, z.x, z.x + z.w);
    const cy = clampNum(p.y, z.y, z.y + z.h);
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  return { x: clampNum(p.x, best.x, best.x + best.w), y: clampNum(p.y, best.y, best.y + best.h) };
}

export function pickRandomPointInZones(zones: Rect[], size: number): Point | null {
  const usable = usableZones(zones, size);
  if (usable.length === 0) return null;
  const weight = (z: Rect) => Math.max(z.w, 1) * Math.max(z.h, 1);
  const total = usable.reduce((s, z) => s + weight(z), 0);
  let r = Math.random() * total;
  let chosen = usable[0];
  for (const z of usable) {
    const w = weight(z);
    if (r < w) {
      chosen = z;
      break;
    }
    r -= w;
  }
  return { x: chosen.x + Math.random() * chosen.w, y: chosen.y + Math.random() * chosen.h };
}

// A "short distance" walk per the brief — biased near the current spot
// rather than a teleport-feeling jump across the whole safe area. Falls
// back to any random safe point if nothing nearby works out (e.g. the
// companion is wedged in a sliver of a zone).
export function pickShortWalkTarget(
  from: Point,
  zones: Rect[],
  size: number,
  maxRadius: number,
): Point | null {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * maxRadius;
    const candidate = { x: from.x + Math.cos(angle) * dist, y: from.y + Math.sin(angle) * dist };
    const clamped = clampToZones(candidate, zones, size);
    if (Math.hypot(clamped.x - candidate.x, clamped.y - candidate.y) < 32) return clamped;
  }
  return pickRandomPointInZones(zones, size);
}

export class MovementController {
  x: number;
  y: number;
  facing: 1 | -1 = 1;
  private target: Point | null = null;
  private speed: number;
  private readonly size: number;

  constructor(start: Point, speed: number, size: number) {
    this.x = start.x;
    this.y = start.y;
    this.speed = speed;
    this.size = size;
  }

  get position(): Point {
    return { x: this.x, y: this.y };
  }

  get isMoving(): boolean {
    return this.target !== null;
  }

  setTarget(target: Point): void {
    this.target = target;
  }

  clearTarget(): void {
    this.target = null;
  }

  setFacing(dir: 1 | -1): void {
    this.facing = dir;
  }

  // Live speed override — a behavior preset (see CompanionEngine) scaling
  // the base px/second without needing to remount/reposition.
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  teleport(p: Point): void {
    this.x = p.x;
    this.y = p.y;
    this.target = null;
  }

  /** Advances toward the current target by up to `speed * dt`, clamped into `zones`. */
  update(dtMs: number, zones: Rect[]): { arrived: boolean } {
    const clamped = clampToZones({ x: this.x, y: this.y }, zones, this.size);
    this.x = clamped.x;
    this.y = clamped.y;

    if (!this.target) return { arrived: false };
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = (this.speed * dtMs) / 1000;

    if (dist <= Math.max(step, 1.5)) {
      const settled = clampToZones(this.target, zones, this.size);
      this.x = settled.x;
      this.y = settled.y;
      this.target = null;
      return { arrived: true };
    }

    this.facing = dx >= 0 ? 1 : -1;
    const next = { x: this.x + (dx / dist) * step, y: this.y + (dy / dist) * step };
    const settled = clampToZones(next, zones, this.size);
    this.x = settled.x;
    this.y = settled.y;
    return { arrived: false };
  }
}
