// One shared canvas + one generic particle sim, config-driven per kind (see
// particle-kinds.ts) rather than ten hand-built systems. The rAF loop is owned
// outside React, with a mount()/destroy() lifecycle.
import type { ParticleKind, ParticleSettings } from "@/lib/link-store";
import {
  PARTICLE_KINDS,
  resolveParticleLook,
  type ParticleKindConfig,
  type ResolvedParticleLook,
} from "./particle-kinds";

interface ParticleInstance {
  x: number;
  y: number;
  // Per-particle variation only; the live size/speed come from the current
  // settings every frame, so slider changes affect particles already on
  // screen instead of waiting for them to respawn.
  sizeJitter: number;
  speedJitter: number;
  opacity: number;
  swayPhase: number;
  swaySpeed: number;
}

const MAX_DT_MS = 100; // clamps the catch-up jump after a backgrounded/throttled tab

export class ParticleController {
  private readonly stageEl: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private motionQuery: MediaQueryList | null = null;
  private reducedMotion = false;
  private rafId: number | null = null;
  private lastFrameAt = 0;
  private destroyed = false;

  private width = 0;
  private height = 0;
  private particles: ParticleInstance[] = [];

  private enabled = false;
  private kind: ParticleKind = "snow";
  private density = 0;
  private speedMul = 1;
  private sizeMul = 1;
  private opacityMul = 1;
  private color = "";
  private look: ResolvedParticleLook = { type: "circle", sizeBase: 4 };

  private motionQueryHandler = () => {
    this.reducedMotion = this.motionQuery?.matches ?? false;
  };

  constructor(stageEl: HTMLElement) {
    this.stageEl = stageEl;
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.inset = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
  }

  mount(): void {
    this.stageEl.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.resizeObserver = new ResizeObserver(() => this.applySize());
    this.resizeObserver.observe(this.stageEl);
    this.applySize();

    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionQuery.matches;
    this.motionQuery.addEventListener("change", this.motionQueryHandler);

    this.lastFrameAt = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.motionQuery?.removeEventListener("change", this.motionQueryHandler);
    this.canvas.remove();
  }

  // Live prop update — no remount. Reseeds the particle pool only when the
  // active count actually changes (kind swap, density change, first enable);
  // cheap enough (tens of objects) that a full reseed beats diffing per-item.
  update(settings: ParticleSettings | undefined): void {
    const wasEnabled = this.enabled;
    this.enabled = settings?.enabled ?? false;
    this.kind = settings?.kind ?? "snow";
    const preset = PARTICLE_KINDS[this.kind];

    this.density = settings?.density ?? preset.density;
    this.speedMul = settings?.speed ?? 1;
    this.sizeMul = settings?.size ?? 1;
    this.opacityMul = (settings?.opacity ?? preset.opacity) / 100;
    this.color = settings?.color || preset.color;
    this.look = resolveParticleLook(preset, settings);

    if (!this.enabled) {
      this.particles = [];
      return;
    }
    const targetCount = Math.max(0, Math.round(this.density));
    if (!wasEnabled || this.particles.length !== targetCount) {
      this.seed(targetCount, preset);
    }
  }

  private applySize(): void {
    const rect = this.stageEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // The stage can be measured before layout settles (first enable, a panel
    // animating in); keep already-seeded particles spread across the real
    // size instead of stuck in the stale one.
    if (this.width > 0 && this.height > 0 && rect.width > 0 && rect.height > 0) {
      const kx = rect.width / this.width;
      const ky = rect.height / this.height;
      for (const p of this.particles) {
        p.x *= kx;
        p.y *= ky;
      }
    }
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.max(1, Math.round(this.width * dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr));
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private seed(count: number, preset: ParticleKindConfig): void {
    this.particles = Array.from({ length: count }, () =>
      this.spawn(preset, Math.random() * this.height),
    );
  }

  private spawn(_preset: ParticleKindConfig, y: number): ParticleInstance {
    return {
      x: Math.random() * Math.max(1, this.width),
      y,
      sizeJitter: 0.7 + Math.random() * 0.6,
      speedJitter: 0.7 + Math.random() * 0.6,
      opacity: 0.5 + Math.random() * 0.5,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.5 + Math.random() * 0.5,
    };
  }

  private tick = (now: number): void => {
    if (this.destroyed) return;
    const dtMs = Math.min(now - this.lastFrameAt, MAX_DT_MS);
    this.lastFrameAt = now;
    if (!this.reducedMotion && this.enabled) this.step(dtMs);
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private step(dtMs: number): void {
    const dt = dtMs / 1000;
    const preset = PARTICLE_KINDS[this.kind];
    for (const p of this.particles) {
      const size = this.look.sizeBase * this.sizeMul * p.sizeJitter;
      const fall = preset.speed * this.speedMul * p.speedJitter;
      p.swayPhase += p.swaySpeed * dt;
      if (preset.direction === "down") {
        p.y += fall * dt;
        p.x += Math.sin(p.swayPhase) * preset.sway * dt;
        if (p.y - size > this.height) {
          p.y = -size;
          p.x = Math.random() * Math.max(1, this.width);
        }
      } else if (preset.direction === "up") {
        p.y -= fall * dt;
        p.x += Math.sin(p.swayPhase) * preset.sway * dt;
        if (p.y + size < 0) {
          p.y = this.height + size;
          p.x = Math.random() * Math.max(1, this.width);
        }
      } else {
        p.x += Math.cos(p.swayPhase) * preset.sway * dt * 0.4;
        p.y += Math.sin(p.swayPhase * 0.7) * preset.sway * dt * 0.4 - fall * dt * 0.15;
        if (p.x < -size) p.x = this.width + size;
        if (p.x > this.width + size) p.x = -size;
        if (p.y < -size) p.y = this.height + size;
        if (p.y > this.height + size) p.y = -size;
      }
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    if (!this.enabled || this.particles.length === 0) return;

    const look = this.look;
    ctx.fillStyle = this.color;
    if (look.type === "glyph") {
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
    }
    for (const p of this.particles) {
      const size = look.sizeBase * this.sizeMul * p.sizeJitter;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity * this.opacityMul));
      if (look.type === "glyph") {
        ctx.font = `${size}px sans-serif`;
        ctx.fillText(look.glyph, p.x, p.y);
      } else if (look.type === "square") {
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
