import type { Transition, Variants } from "motion/react";

// The shared motion vocabulary for the block editor's new interactive
// surfaces (Block Library cards, block insert/remove) — the equivalent of
// THEMES/BANNER_STYLES for motion instead of color: one spring, reused
// everywhere, so nothing feels like it was tuned in isolation. Existing
// CSS-keyframe animations elsewhere in the app are untouched; this is
// scoped to what Phase 6 actually added.
export const blockSpring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.9,
};

// A block appearing (inserted or duplicated) or disappearing (deleted).
// Slides/fades rather than popping — AnimatePresence plays `exit` on
// removal, which a plain array `.map()` can never do on its own.
export const blockEntryVariants: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: blockSpring },
  exit: {
    opacity: 0,
    scale: 0.97,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    transition: { ...blockSpring, opacity: { duration: 0.12 } },
  },
};

// Block Library / Command Palette cards: a light lift on hover, a real
// press-down on click — the "selection animation" and "click animation"
// the redesign asked for, layered on top of cmdk's own aria-selected state
// rather than replacing it.
export const libraryCardHover = { scale: 1.02, transition: blockSpring };
export const libraryCardTap = { scale: 0.96, transition: { duration: 0.1 } };
