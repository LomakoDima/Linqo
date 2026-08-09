// InteractionController — the only module that touches the DOM's event
// system. It normalizes raw browser events into either a discrete hook call
// (click, double-click, scroll, visibility change) or continuous state read
// by whoever owns this controller (`getPointerInStage()`/`hovering`) — it
// has no opinion on what a click *means* for the companion; that's
// CompanionEngine's state machine.
//
// Click vs. double-click: the browser fires `click` on both clicks of a
// double-click sequence before `dblclick` fires on the second — a single
// click is held for a short window so a genuine double-click can cancel it
// and fire once, not three reactions for one double-click.

import type { Point } from "./types";

export interface InteractionHooks {
  onClick: () => void;
  onDoubleClick: () => void;
  onScroll: () => void;
  onVisibilityChange: (visible: boolean) => void;
}

const CLICK_HOLD_MS = 220;

export class InteractionController {
  hovering = false;
  private lastClientPoint: Point | null = null;
  private clickTimer: number | null = null;

  constructor(
    private readonly stageEl: HTMLElement,
    private readonly hitEl: HTMLElement,
    private readonly hooks: InteractionHooks,
  ) {
    this.hitEl.addEventListener("click", this.handleClick);
    this.hitEl.addEventListener("dblclick", this.handleDoubleClick);
    this.hitEl.addEventListener("pointerenter", this.handlePointerEnter);
    this.hitEl.addEventListener("pointerleave", this.handlePointerLeave);
    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    // capture:true — scroll events don't bubble, but they do fire on
    // capturing-phase listeners of ancestors, which is the only way to hear
    // about scrolling inside the builder's phone-mockup preview (an
    // `overflow-y-auto` div) from a listener that doesn't know that element
    // exists.
    document.addEventListener("scroll", this.handleScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("focus", this.handleFocus);
  }

  /** Pointer position in the stage element's local coordinate space, or null before any movement. */
  getPointerInStage(): Point | null {
    if (!this.lastClientPoint) return null;
    const rect = this.stageEl.getBoundingClientRect();
    return { x: this.lastClientPoint.x - rect.left, y: this.lastClientPoint.y - rect.top };
  }

  destroy(): void {
    if (this.clickTimer !== null) window.clearTimeout(this.clickTimer);
    this.hitEl.removeEventListener("click", this.handleClick);
    this.hitEl.removeEventListener("dblclick", this.handleDoubleClick);
    this.hitEl.removeEventListener("pointerenter", this.handlePointerEnter);
    this.hitEl.removeEventListener("pointerleave", this.handlePointerLeave);
    window.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("scroll", this.handleScroll, true);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("focus", this.handleFocus);
  }

  private handlePointerMove = (e: PointerEvent): void => {
    this.lastClientPoint = { x: e.clientX, y: e.clientY };
  };

  private handlePointerEnter = (): void => {
    this.hovering = true;
  };

  private handlePointerLeave = (): void => {
    this.hovering = false;
  };

  private handleClick = (): void => {
    if (this.clickTimer !== null) return;
    this.clickTimer = window.setTimeout(() => {
      this.clickTimer = null;
      this.hooks.onClick();
    }, CLICK_HOLD_MS);
  };

  private handleDoubleClick = (): void => {
    if (this.clickTimer !== null) {
      window.clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
    this.hooks.onDoubleClick();
  };

  private handleScroll = (): void => {
    this.hooks.onScroll();
  };

  private handleVisibilityChange = (): void => {
    this.hooks.onVisibilityChange(document.visibilityState === "visible");
  };

  private handleBlur = (): void => {
    this.hooks.onVisibilityChange(false);
  };

  private handleFocus = (): void => {
    this.hooks.onVisibilityChange(true);
  };
}
