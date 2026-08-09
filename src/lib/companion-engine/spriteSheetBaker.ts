// Synthesizes a real, multi-frame sprite sheet from a companion's config.
//
// Two paths:
//  - `config.spriteSheet` set → a hand-authored asset. It's loaded as-is and
//    must already be laid out in the exact grid `config.animations` /
//    `frameWidth` / `frameHeight` describe. This is the intended long-term
//    path — nothing below runs.
//  - `config.portrait` set (today, for every built-in companion) → there is
//    no multi-frame art yet, only one static pixel-art pose. This module
//    bakes a genuine sprite sheet out of it once, on an offscreen canvas,
//    by redrawing that portrait into every cell of the grid with a per-frame
//    affine transform (squash/stretch/rotate/translate — the same "juice"
//    technique hand-animators use for a walk/idle cycle) plus a couple of
//    small painted overlays (a blink, closed eyes for sleep, a ground
//    shadow). The result is consumed identically to a hand-drawn sheet by
//    AnimationController — draw calls don't know or care which path built
//    the canvas they're reading from.
//
// Either way this only ever runs once per companion; the resolved sheet is
// cached and reused by every CompanionEngine instance that plays it.

import type { CompanionAnimState, CompanionClip, CompanionConfig } from "./types";

const sheetCache = new Map<string, Promise<CanvasImageSource>>();

export function resolveSpriteSheet(config: CompanionConfig): Promise<CanvasImageSource> {
  const key = config.spriteSheet ?? config.portrait;
  if (!key) return Promise.reject(new Error(`Companion "${config.id}" has no sprite source`));
  const cached = sheetCache.get(key);
  if (cached) return cached;

  const built = config.spriteSheet
    ? loadImage(config.spriteSheet)
    : loadImage(config.portrait!).then((portrait) => bakeFromPortrait(portrait, config));
  sheetCache.set(key, built);
  return built;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function bakeFromPortrait(portrait: HTMLImageElement, config: CompanionConfig): HTMLCanvasElement {
  const { frameWidth: fw, frameHeight: fh, animations } = config;
  const clips = Object.entries(animations) as [CompanionAnimState, CompanionClip][];
  const cols = Math.max(...clips.map(([, c]) => c.frames));
  const rows = Math.max(...clips.map(([, c]) => c.row)) + 1;

  const canvas = document.createElement("canvas");
  canvas.width = cols * fw;
  canvas.height = rows * fh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  for (const [state, clip] of clips) {
    for (let frame = 0; frame < clip.frames; frame++) {
      drawFrame(ctx, portrait, state, frame, clip.frames, clip.row, fw, fh);
    }
  }
  return canvas;
}

interface FrameTransform {
  scaleX: number;
  scaleY: number;
  rotateDeg: number;
  offsetX: number;
  offsetY: number;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  portrait: HTMLImageElement,
  state: CompanionAnimState,
  frame: number,
  totalFrames: number,
  row: number,
  fw: number,
  fh: number,
) {
  const cellX = frame * fw;
  const cellY = row * fh;
  const cx = cellX + fw / 2;
  const cy = cellY + fh / 2;
  const xf = frameTransform(state, frame, totalFrames);

  ctx.save();
  ctx.beginPath();
  ctx.rect(cellX, cellY, fw, fh);
  ctx.clip();

  drawGroundShadow(ctx, state, cx, cellY + fh * 0.9, fw);

  ctx.translate(cx + xf.offsetX, cy + xf.offsetY);
  ctx.rotate((xf.rotateDeg * Math.PI) / 180);
  ctx.scale(xf.scaleX, xf.scaleY);
  const size = Math.min(fw, fh) * 0.86;
  ctx.drawImage(portrait, -size / 2, -size / 2, size, size);
  ctx.restore();

  // Eyes are painted on afterwards, in un-rotated frame space — the idle sway
  // and breathing scale are subtle enough that a fixed heuristic eye-line
  // (these portraits are all front-facing chibi animals, eyes centered
  // around 45% down the frame) still reads correctly at every frame.
  if (state === "sleep") {
    drawEyeOverlay(ctx, cellX, cellY, fw, fh);
  } else if (state === "idle" && frame === Math.floor(totalFrames * 0.7)) {
    drawEyeOverlay(ctx, cellX, cellY, fw, fh);
  }
}

// Every clip's motion recipe. Formulas (not hand-keyed arrays) for the
// looping states so frame count can change without re-authoring poses; the
// two short one-shots (jump/wave) are explicit per-frame beats since they're
// a specific little performance, not a cycle.
function frameTransform(state: CompanionAnimState, frame: number, total: number): FrameTransform {
  const t = frame / total;
  const twoPi = Math.PI * 2;

  switch (state) {
    case "idle": {
      const breathe = Math.sin(twoPi * t);
      return {
        scaleX: 1 - 0.025 * breathe,
        scaleY: 1 + 0.045 * breathe,
        rotateDeg: 1.5 * Math.sin(twoPi * t + 0.6),
        offsetX: 0,
        offsetY: -2 * breathe,
      };
    }
    case "walk": {
      const step = Math.sin(twoPi * t * 2);
      const bounce = Math.abs(step);
      return {
        scaleX: 1 + 0.04 * bounce,
        scaleY: 1 - 0.05 * bounce,
        rotateDeg: 9 * Math.sin(twoPi * t),
        offsetX: 0,
        offsetY: 3 * bounce - 2,
      };
    }
    case "jump": {
      const beats: FrameTransform[] = [
        { scaleX: 1.18, scaleY: 0.82, rotateDeg: 0, offsetX: 0, offsetY: 6 },
        { scaleX: 0.85, scaleY: 1.25, rotateDeg: -4, offsetX: 0, offsetY: -10 },
        { scaleX: 0.95, scaleY: 1.08, rotateDeg: 0, offsetX: 0, offsetY: -20 },
        { scaleX: 0.88, scaleY: 1.2, rotateDeg: 4, offsetX: 0, offsetY: -8 },
        { scaleX: 1.15, scaleY: 0.85, rotateDeg: 0, offsetX: 0, offsetY: 2 },
      ];
      return beats[Math.min(frame, beats.length - 1)];
    }
    case "wave": {
      const beats: FrameTransform[] = [
        { scaleX: 1, scaleY: 1, rotateDeg: 0, offsetX: 0, offsetY: 0 },
        { scaleX: 1, scaleY: 1.04, rotateDeg: 11, offsetX: 0, offsetY: -2 },
        { scaleX: 1, scaleY: 1.02, rotateDeg: -9, offsetX: 0, offsetY: -1 },
        { scaleX: 1, scaleY: 1.04, rotateDeg: 11, offsetX: 0, offsetY: -2 },
        { scaleX: 1, scaleY: 1, rotateDeg: 0, offsetX: 0, offsetY: 0 },
      ];
      return beats[Math.min(frame, beats.length - 1)];
    }
    case "happy": {
      const bounce = Math.abs(Math.sin(twoPi * t * 2));
      return {
        scaleX: 1 - 0.08 * bounce,
        scaleY: 1 + 0.12 * bounce,
        rotateDeg: 12 * Math.sin(twoPi * t * 2 + 0.3),
        offsetX: 0,
        offsetY: -10 * bounce,
      };
    }
    case "dance": {
      const bounce = Math.abs(Math.sin(twoPi * t * 2));
      return {
        scaleX: 1 - 0.05 * bounce,
        scaleY: 1 + 0.08 * bounce,
        rotateDeg: 14 * Math.sin(twoPi * t),
        offsetX: 3 * Math.sin(twoPi * t),
        offsetY: -6 * bounce,
      };
    }
    case "sleep": {
      const breathe = Math.sin(twoPi * t);
      return { scaleX: 1, scaleY: 1 + 0.02 * breathe, rotateDeg: 13, offsetX: 0, offsetY: 4 };
    }
    default:
      return { scaleX: 1, scaleY: 1, rotateDeg: 0, offsetX: 0, offsetY: 0 };
  }
}

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  state: CompanionAnimState,
  cx: number,
  groundY: number,
  fw: number,
) {
  if (state === "sleep") return;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(cx, groundY, fw * 0.24, fw * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEyeOverlay(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  fw: number,
  fh: number,
) {
  const eyeY = cellY + fh * 0.46;
  const eyeDx = fw * 0.13;
  const w = fw * 0.1;
  const h = fh * 0.03;
  ctx.save();
  ctx.fillStyle = "#2a1c14";
  for (const dx of [-eyeDx, eyeDx]) {
    ctx.beginPath();
    ctx.ellipse(cellX + fw / 2 + dx, eyeY, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
