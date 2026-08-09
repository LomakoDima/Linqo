// AnimationController — owns which frame of which clip is currently showing.
// Pure timing/state: it knows nothing about the DOM, canvas, or *why* the
// state changed (that's CompanionEngine's job) — feed it milliseconds via
// update(dt), ask it for a source rect via getFrameRect(). Non-looping clips
// (jump, wave) hold their last frame and fire `onComplete` exactly once so
// the engine can chain into whatever comes next (e.g. jump → idle).

import type { CompanionAnimState, CompanionConfig } from "./types";

export interface FrameRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export class AnimationController {
  private config: CompanionConfig;
  private state: CompanionAnimState;
  private frame = 0;
  private elapsedMs = 0;
  private onComplete?: () => void;

  constructor(config: CompanionConfig, initial: CompanionAnimState = "idle") {
    this.config = config;
    this.state = initial;
  }

  get current(): CompanionAnimState {
    return this.state;
  }

  get currentFrame(): number {
    return this.frame;
  }

  /** Switches clip. No-ops if already playing that state, unless `restart`. */
  play(state: CompanionAnimState, opts?: { onComplete?: () => void; restart?: boolean }): void {
    if (this.state === state && !opts?.restart) {
      if (opts?.onComplete) this.onComplete = opts.onComplete;
      return;
    }
    this.state = state;
    this.frame = 0;
    this.elapsedMs = 0;
    this.onComplete = opts?.onComplete;
  }

  update(dtMs: number): void {
    const clip = this.config.animations[this.state];
    if (!clip || clip.frames <= 1) return;
    this.elapsedMs += dtMs;
    const frameDurationMs = 1000 / clip.fps;
    // A while-loop (not a single step) so a long tab-throttle stall catches
    // up to the right frame in one update rather than crawling through every
    // frame it missed.
    while (this.elapsedMs >= frameDurationMs) {
      this.elapsedMs -= frameDurationMs;
      this.frame += 1;
      if (this.frame >= clip.frames) {
        if (clip.loop) {
          this.frame = 0;
        } else {
          this.frame = clip.frames - 1;
          const cb = this.onComplete;
          this.onComplete = undefined;
          if (cb) cb();
          break;
        }
      }
    }
  }

  getFrameRect(): FrameRect {
    const clip = this.config.animations[this.state];
    return {
      sx: this.frame * this.config.frameWidth,
      sy: (clip?.row ?? 0) * this.config.frameHeight,
      sw: this.config.frameWidth,
      sh: this.config.frameHeight,
    };
  }
}
