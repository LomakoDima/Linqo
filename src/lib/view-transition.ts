import { flushSync } from "react-dom";

// Wraps a state update in the View Transitions API so the resulting DOM
// change (e.g. a banner resizing between horizontal/vertical) morphs
// smoothly instead of snapping instantly — elements sharing a stable
// `viewTransitionName` across the before/after DOM are auto-interpolated in
// position and size, similar to a phone's orientation-change animation.
// Falls back to a plain synchronous update wherever unsupported or when the
// user prefers reduced motion.
export function withViewTransition(update: () => void) {
  const supported =
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!supported) {
    update();
    return;
  }
  // Every same-document view transition — including the router's full-page
  // one — implicitly wraps the whole page in a "root" group. Without this
  // marker, the router's page-out/page-in slide (styles.css) would also
  // play here; the "vt-local" class scopes that slide to real navigations
  // only, leaving just the named blocks below to visibly animate.
  const root = document.documentElement;
  root.classList.add("vt-local");
  const transition = document.startViewTransition(() => flushSync(update));
  // Both `ready` and `finished` reject (InvalidStateError) when a newer
  // transition interrupts this one before it completes — expected under
  // rapid toggling, not a bug — so swallow both rather than let either
  // surface as an unhandled rejection.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {}).finally(() => root.classList.remove("vt-local"));
}
