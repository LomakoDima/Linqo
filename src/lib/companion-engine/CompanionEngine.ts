// CompanionEngine — the orchestrator. Owns the one requestAnimationFrame
// loop for a mounted companion and composes the other four modules around
// it:
//   AnimationController   — which frame is showing
//   MovementController     — where the companion is / is headed
//   InteractionController  — raw DOM events, normalized
//   (CompanionRegistry lives one layer up — the engine is handed an already-
//    resolved CompanionConfig, it never looks anything up by id itself)
//
// Everything state-machine-shaped (idle vs. walking vs. asleep, what a click
// does, when to sleep) lives here, in one tick() function, so the four
// modules above it can stay dumb and reusable. mount()/destroy() are the
// only lifecycle surface a caller needs.

import { AnimationController } from "./AnimationController";
import { InteractionController } from "./InteractionController";
import { clampToZones, MovementController, pickShortWalkTarget } from "./MovementController";
import { resolveSpriteSheet } from "./spriteSheetBaker";
import type { CompanionAnimState, CompanionConfig, Point, Rect } from "./types";

const SLEEP_AFTER_MS = 60_000;
const PROXIMITY_PX = 130;
const PROXIMITY_WALK_COOLDOWN_MS = 3_500;
const SCROLL_REACTION_COOLDOWN_MS = 4_000;
const ZONES_REFRESH_MS = 500;
const SPIN_DURATION_MS = 350;
const ZZZ_INTERVAL_MS = 2_400;
const MAX_DT_MS = 100; // clamps the catch-up jump after a backgrounded/throttled tab

type OneShotStep = CompanionAnimState | { state: CompanionAnimState; holdMs: number };

export interface CompanionEngineOptions {
  size: number;
  home: string;
}

export class CompanionEngine {
  private readonly config: CompanionConfig;
  private readonly stageEl: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private sheet: CanvasImageSource | null = null;

  private readonly animation: AnimationController;
  private readonly movement: MovementController;
  private interaction: InteractionController | null = null;

  private size: number;
  private home: string;
  // Behavior-preset knobs (see setBehaviorMultipliers) — all default to 1,
  // reproducing today's exact idle-brain feel for every profile that never
  // sets a behavior. The engine only knows these as numbers; resolving a
  // named preset ("explorer", ...) to multipliers is the caller's job.
  private idleChanceMultiplier = 1;
  private wanderRadiusMultiplier = 1;
  private zones: Rect[] = [];
  private lastZonesAt = 0;

  private mode: "awake" | "asleep" = "awake";
  private dancing = false;
  private busyOneShot = false;
  private reducedMotion = false;
  private destroyed = false;

  private lastFrameAt = 0;
  private rafId: number | null = null;
  private pendingTimers: number[] = [];
  private lastActivityAt = performance.now();
  private nextIdleTickAt = 0;
  private lastScrollReactionAt = 0;
  private lastProximityWalkAt = 0;
  private lastSeenPointer: Point | null = null;
  private spinStartedAt: number | null = null;
  private resizeHandler = () => {
    this.lastZonesAt = 0;
  };
  private motionQuery: MediaQueryList | null = null;
  private motionQueryHandler = () => {
    this.reducedMotion = this.motionQuery?.matches ?? false;
  };

  constructor(config: CompanionConfig, stageEl: HTMLElement, opts: CompanionEngineOptions) {
    this.config = config;
    this.stageEl = stageEl;
    this.size = opts.size;
    this.home = opts.home;
    this.animation = new AnimationController(config, "idle");
    this.movement = new MovementController({ x: 0, y: 0 }, config.speed, this.size);

    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0";
    this.canvas.style.top = "0";
    this.canvas.style.pointerEvents = "auto";
    this.canvas.style.cursor = "pointer";
    this.canvas.style.touchAction = "none";
    this.applyCanvasSize();
  }

  mount(): void {
    this.stageEl.appendChild(this.canvas);
    this.interaction = new InteractionController(this.stageEl, this.canvas, {
      onClick: () => this.handleClick(),
      onDoubleClick: () => this.handleDoubleClick(),
      onScroll: () => this.reactToScroll(),
      onVisibilityChange: (visible) => {
        if (visible) this.wake();
      },
    });
    window.addEventListener("resize", this.resizeHandler);
    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionQuery.matches;
    this.motionQuery.addEventListener("change", this.motionQueryHandler);

    this.zones = this.computeSafeZones();
    this.movement.teleport(this.getHomePoint());

    resolveSpriteSheet(this.config)
      .then((sheet) => {
        // The sheet cache means this can resolve well after mount() returned
        // — including after destroy() already ran (fast unmount, a redirect
        // mid-load, ...). Reviving the tick loop at that point would drive
        // it against a stageEl that's been removed from the page, which is
        // exactly the "zones ends up empty, getHomePoint reads .x of
        // undefined" crash this guards against.
        if (this.destroyed) return;
        this.sheet = sheet;
        // Say hello: a wave, then a couple of curious glances — "page
        // opened → waves, looks around".
        this.playOneShotSequence(["wave"], () => {
          this.glanceAround();
        });
        this.lastFrameAt = performance.now();
        this.rafId = requestAnimationFrame(this.tick);
      })
      .catch(() => {
        // No sprite to draw — fail quiet. The rest of the page must never
        // break because a pet's art failed to load.
      });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    for (const t of this.pendingTimers) window.clearTimeout(t);
    this.pendingTimers = [];
    this.interaction?.destroy();
    window.removeEventListener("resize", this.resizeHandler);
    this.motionQuery?.removeEventListener("change", this.motionQueryHandler);
    this.canvas.remove();
  }

  setHome(home: string): void {
    this.home = home;
  }

  setSize(size: number): void {
    if (size === this.size) return;
    this.size = size;
    this.applyCanvasSize();
    const clamped = clampToZones(this.movement.position, this.zones, this.size);
    this.movement.teleport(clamped);
  }

  setDancing(dancing: boolean): void {
    if (dancing) this.lastActivityAt = performance.now();
    this.dancing = dancing;
  }

  setBehaviorMultipliers(mult: { idleChance: number; speed: number; wanderRadius: number }): void {
    this.idleChanceMultiplier = mult.idleChance;
    this.wanderRadiusMultiplier = mult.wanderRadius;
    this.movement.setSpeed(this.config.speed * mult.speed);
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------

  private tick = (now: number): void => {
    if (this.destroyed) return;
    const dtMs = Math.min(now - this.lastFrameAt, MAX_DT_MS);
    this.lastFrameAt = now;

    if (now - this.lastZonesAt > ZONES_REFRESH_MS) {
      this.zones = this.computeSafeZones();
      this.lastZonesAt = now;
    }

    this.trackPointer(now);

    if (
      this.mode === "awake" &&
      !this.dancing &&
      !this.busyOneShot &&
      now - this.lastActivityAt > SLEEP_AFTER_MS &&
      !this.movement.isMoving
    ) {
      this.enterSleep();
    }

    if (this.mode === "awake" && !this.dancing && !this.busyOneShot && now >= this.nextIdleTickAt) {
      this.nextIdleTickAt = now + 2_200 + Math.random() * 2_600;
      if (!this.movement.isMoving) this.runIdleBrainTick();
    }

    const zones = this.mode === "asleep" ? [] : this.zones;
    const moveResult = this.movement.update(dtMs, zones.length ? zones : this.zones);
    if (moveResult.arrived && !this.busyOneShot) {
      this.nextIdleTickAt = Math.min(this.nextIdleTickAt, now + 400);
    }

    this.syncBaseAnimation();

    const frozen =
      this.reducedMotion &&
      (this.animation.current === "idle" || this.animation.current === "sleep");
    if (!frozen) this.animation.update(dtMs);

    this.draw(now);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private syncBaseAnimation(): void {
    if (this.busyOneShot) return;
    if (this.mode === "asleep") {
      this.animation.play("sleep");
      return;
    }
    if (this.dancing) {
      this.animation.play("dance");
      return;
    }
    if (this.interaction?.hovering) {
      this.animation.play("happy");
      return;
    }
    if (this.movement.isMoving) {
      this.animation.play("walk");
      return;
    }
    this.animation.play("idle");
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sheet) return;
    ctx.clearRect(0, 0, this.size, this.size);
    const rect = this.animation.getFrameRect();

    ctx.save();
    ctx.translate(this.size / 2, this.size / 2);
    if (this.movement.facing === -1) ctx.scale(-1, 1);
    if (this.spinStartedAt !== null) {
      const progress = Math.min(1, (now - this.spinStartedAt) / SPIN_DURATION_MS);
      ctx.rotate(progress * Math.PI * 2);
      if (progress >= 1) this.spinStartedAt = null;
    }
    ctx.drawImage(
      this.sheet,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size,
    );
    ctx.restore();

    this.canvas.style.transform = `translate(${this.movement.x}px, ${this.movement.y}px)`;
  }

  private applyCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    const ctx = this.canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx = ctx;
  }

  // ---------------------------------------------------------------------
  // Interaction reactions
  // ---------------------------------------------------------------------

  private handleClick(): void {
    this.bumpActivity();
    if (this.mode === "asleep") {
      this.wake();
      return;
    }
    this.movement.clearTarget();
    this.spinStartedAt = performance.now();
    this.spawnParticle(Math.random() < 0.5 ? "💛" : "✨");
    this.playOneShotSequence(["jump", "wave"]);
  }

  private handleDoubleClick(): void {
    this.bumpActivity();
    if (this.mode === "asleep") {
      this.wake();
      return;
    }
    this.movement.clearTarget();
    this.spawnParticle("💛");
    this.spawnParticle("✨");
    this.playOneShotSequence([{ state: "happy", holdMs: 1_500 }]);
  }

  private reactToScroll(): void {
    this.bumpActivity();
    const now = performance.now();
    if (now - this.lastScrollReactionAt < SCROLL_REACTION_COOLDOWN_MS) return;
    this.lastScrollReactionAt = now;
    if (this.busyOneShot || this.mode === "asleep") return;
    this.movement.setFacing(this.movement.facing === 1 ? -1 : 1);
  }

  private trackPointer(now: number): void {
    const pointer = this.interaction?.getPointerInStage() ?? null;
    if (!pointer) return;
    if (
      !this.lastSeenPointer ||
      Math.hypot(pointer.x - this.lastSeenPointer.x, pointer.y - this.lastSeenPointer.y) > 1
    ) {
      this.bumpActivity();
    }
    this.lastSeenPointer = pointer;

    if (this.mode !== "awake" || this.busyOneShot) return;
    const center = { x: this.movement.x + this.size / 2, y: this.movement.y + this.size / 2 };
    const dist = Math.hypot(pointer.x - center.x, pointer.y - center.y);
    if (dist > PROXIMITY_PX) return;

    this.movement.setFacing(pointer.x >= center.x ? 1 : -1);
    if (
      !this.movement.isMoving &&
      !this.interaction?.hovering &&
      now - this.lastProximityWalkAt > PROXIMITY_WALK_COOLDOWN_MS &&
      Math.random() < 0.02
    ) {
      this.lastProximityWalkAt = now;
      this.movement.setTarget(clampToZones(pointer, this.zones, this.size));
    }
  }

  // ---------------------------------------------------------------------
  // Idle brain
  // ---------------------------------------------------------------------

  private runIdleBrainTick(): void {
    if (this.reducedMotion) return;
    const idleChance = Math.min(1, this.config.idleChance * this.idleChanceMultiplier);
    if (Math.random() >= idleChance) return;
    const goHome = Math.random() < 0.15;
    const doWalk = goHome || Math.random() < 0.4;
    if (doWalk) {
      const target = goHome
        ? this.getHomePoint()
        : pickShortWalkTarget(
            this.movement.position,
            this.zones,
            this.size,
            90 * this.wanderRadiusMultiplier,
          );
      if (target) this.movement.setTarget(target);
    } else {
      this.movement.setFacing(Math.random() < 0.5 ? -1 : 1);
    }
  }

  private glanceAround(): void {
    if (this.reducedMotion) return;
    this.movement.setFacing(-1);
    const t1 = window.setTimeout(() => this.movement.setFacing(1), 900);
    this.pendingTimers.push(t1);
  }

  // ---------------------------------------------------------------------
  // Sleep / wake
  // ---------------------------------------------------------------------

  private bumpActivity(): void {
    this.lastActivityAt = performance.now();
  }

  private enterSleep(): void {
    this.mode = "asleep";
    this.movement.clearTarget();
    this.scheduleZzz();
  }

  private wake(): void {
    const wasAsleep = this.mode === "asleep";
    this.mode = "awake";
    this.bumpActivity();
    if (wasAsleep) this.nextIdleTickAt = performance.now() + 600;
  }

  private scheduleZzz(): void {
    if (this.mode !== "asleep") return;
    this.spawnParticle("💤");
    const t = window.setTimeout(() => this.scheduleZzz(), ZZZ_INTERVAL_MS + Math.random() * 800);
    this.pendingTimers.push(t);
  }

  // ---------------------------------------------------------------------
  // One-shot sequences & particles
  // ---------------------------------------------------------------------

  private playOneShotSequence(steps: OneShotStep[], onDone?: () => void): void {
    this.busyOneShot = true;
    const runStep = (i: number) => {
      if (i >= steps.length) {
        this.busyOneShot = false;
        onDone?.();
        return;
      }
      const step = steps[i];
      if (typeof step === "string") {
        this.animation.play(step, { restart: true, onComplete: () => runStep(i + 1) });
      } else {
        this.animation.play(step.state, { restart: true });
        const t = window.setTimeout(() => runStep(i + 1), step.holdMs);
        this.pendingTimers.push(t);
      }
    };
    runStep(0);
  }

  private spawnParticle(emoji: string): void {
    const el = document.createElement("span");
    el.textContent = emoji;
    el.className = "companion-particle";
    el.style.left = `${this.movement.x + this.size / 2}px`;
    el.style.top = `${this.movement.y}px`;
    el.addEventListener("animationend", () => el.remove(), { once: true });
    this.stageEl.appendChild(el);
  }

  // ---------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------

  // The page's own layout tells the engine where it's safe to roam: the
  // banner strip (always available, full width) plus — on wide-enough
  // viewports — the empty gutters beside the centered content column. Those
  // gutters vanish on narrow/mobile layouts where the column fills the
  // width, in which case the companion simply stays on the banner. Either
  // way, buttons and text live inside the column, never inside a zone this
  // returns — so "never blocks buttons or text" is a property of the
  // geometry, not a runtime collision check against arbitrary elements.
  private computeSafeZones(): Rect[] {
    const stageRect = this.stageEl.getBoundingClientRect();
    const toLocal = (r: DOMRect): Rect => ({
      x: r.left - stageRect.left,
      y: r.top - stageRect.top,
      w: r.width,
      h: r.height,
    });
    // The zone-marked elements are siblings of the stage div (see
    // CompanionStage), not descendants of it — both are plain children of
    // LinkPreview's root content div, so that's where the search has to
    // start. Coordinates still convert relative to `stageRect`, which is
    // safe: the stage div is `absolute inset-0` in that same parent, so its
    // box and the parent's content box coincide.
    const searchRoot = this.stageEl.parentElement ?? this.stageEl;
    const bannerEl = searchRoot.querySelector<HTMLElement>('[data-companion-zone="banner"]');
    const columnEl = searchRoot.querySelector<HTMLElement>('[data-companion-zone="column"]');

    const bannerRect = bannerEl
      ? toLocal(bannerEl.getBoundingClientRect())
      : { x: 0, y: 0, w: stageRect.width, h: 112 };
    const zones: Rect[] = [bannerRect];

    if (columnEl) {
      const col = toLocal(columnEl.getBoundingClientRect());
      const gutter = 30;
      const visibleTop = Math.max(0, -stageRect.top);
      const visibleBottom = Math.min(stageRect.height, window.innerHeight - stageRect.top);
      const gy = Math.max(visibleTop, bannerRect.y + bannerRect.h);
      const gh = visibleBottom - gy;
      if (gh > 40) {
        const leftW = col.x;
        const rightW = stageRect.width - (col.x + col.w);
        if (leftW >= gutter) zones.push({ x: 0, y: gy, w: leftW, h: gh });
        if (rightW >= gutter) zones.push({ x: col.x + col.w, y: gy, w: rightW, h: gh });
      }
    }

    const usable = zones.filter((z) => z.w > 0 && z.h > 0);
    // A detached or momentarily zero-size stageEl (mid route-transition, a
    // stale tick from an already-torn-down engine, ...) can legitimately
    // yield nothing here. Never hand back an empty list — every caller
    // (getHomePoint chief among them) indexes zones[0] assuming at least one
    // exists, and a page-crashing exception is a far worse outcome than the
    // companion sitting at a degenerate top-left point for one frame.
    if (usable.length === 0) return [{ x: 0, y: 0, w: this.size, h: this.size }];
    return usable;
  }

  private getHomePoint(): Point {
    const zones = this.zones.length ? this.zones : this.computeSafeZones();
    const banner = zones[0] ?? { x: 0, y: 0, w: this.size, h: this.size };
    const margin = 8;
    switch (this.home) {
      case "banner-top-left":
        return { x: banner.x + margin, y: banner.y + margin };
      case "banner-top-right":
        return { x: banner.x + banner.w - this.size - margin, y: banner.y + margin };
      case "banner-bottom-left":
        return { x: banner.x + margin, y: banner.y + banner.h - this.size - margin };
      case "banner-bottom-right":
      default:
        return {
          x: banner.x + banner.w - this.size - margin,
          y: banner.y + banner.h - this.size - margin,
        };
    }
  }
}
