import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  placeTourCard,
  tourSpotlight,
  type TourRect,
  type TourStep,
  type TourViewport,
} from "@/lib/guide-tour";
export type { TourStep } from "@/lib/guide-tour";

type Anchor = { index: number; rect: TourRect | null; viewport: TourViewport };
const viewportNow = (): TourViewport => {
  const view = window.visualViewport;
  return {
    left: view?.offsetLeft ?? 0,
    top: view?.offsetTop ?? 0,
    width: view?.width ?? window.innerWidth,
    height: view?.height ?? window.innerHeight,
  };
};
const sameRect = (a: TourRect | null, b: TourRect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5);

function visibleTarget(step: TourStep): HTMLElement | null {
  for (const selector of typeof step.target === "string" ? [step.target] : step.target) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        element.getClientRects().length &&
        rect.width > 1 &&
        rect.height > 1 &&
        style.visibility !== "hidden" &&
        style.visibility !== "collapse"
      )
        return element;
    }
  }
  return null;
}

function revealTarget(element: HTMLElement) {
  element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  const rect = element.getBoundingClientRect();
  const view = viewportNow();
  // Keep content clear of the sticky header. Fixed header/footer controls
  // already occupy their intended position and must not move the page.
  if (
    !element.closest("header") &&
    rect.height < view.height - 160 &&
    (rect.top < view.top + 72 || rect.bottom > view.top + view.height - 72)
  ) {
    window.scrollBy({
      top: rect.top - view.top - Math.max(80, (view.height - rect.height) / 2),
      behavior: "instant",
    });
  }
}

// The session unmounts after its exit animation, so restarting always begins
// at step one. Radix owns focus trapping, Escape and modal outside interaction.
export function GuideTour({
  steps,
  active,
  onFinish,
}: {
  steps: TourStep[];
  active: boolean;
  onFinish: () => void;
}) {
  const finishRef = useRef(onFinish);
  const closing = useRef(false);
  useLayoutEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);
  useEffect(() => {
    if (active) closing.current = false;
  }, [active]);
  const finish = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    finishRef.current();
  }, []);
  return (
    <Dialog.Root
      open={active && steps.length > 0}
      onOpenChange={(open) => {
        if (!open) finish();
      }}
    >
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {active && steps.length > 0 && (
            <TourSession key="builder-tour" steps={steps} onFinish={finish} />
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TourSession({ steps, onFinish }: { steps: TourStep[]; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [cardHeight, setCardHeight] = useState(240);
  const [showPending, setShowPending] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const nextRef = useRef<HTMLButtonElement>(null);
  const navigating = useRef(false);
  const reduced = useReducedMotion();
  const maskId = `tour-${useId().replace(/:/g, "")}`;
  const current = steps[index];
  const prepared = anchor?.index === index;
  const shown = steps[anchor?.index ?? index];
  const positionedHole = anchor ? tourSpotlight(anchor.rect, anchor.viewport) : null;
  const hole = prepared ? positionedHole : null;
  const viewport = anchor?.viewport ?? viewportNow();
  const position = placeTourCard(positionedHole, viewport, cardHeight);
  const ease = [0.22, 1, 0.36, 1] as const;

  useEffect(() => {
    if (prepared) {
      setShowPending(false);
      return;
    }
    // Slow mounts get a visible, dismissible explanation. Fast steps never
    // flash a centered card before moving to their anchor.
    const timer = window.setTimeout(() => setShowPending(true), 160);
    return () => window.clearTimeout(timer);
  }, [index, prepared]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () =>
      setCardHeight((previous) =>
        Math.abs(previous - card.getBoundingClientRect().height) < 0.5
          ? previous
          : card.getBoundingClientRect().height,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!current) return;
    current.onBeforeShow?.();
    let cancelled = false;
    let looking = true;
    let lookupFrame = 0;
    let updateFrame = 0;
    let tracked: HTMLElement | null = null;
    let previous: TourRect | null = null;
    let stableFrames = 0;
    const deadline = performance.now() + 1800;
    const commit = (element: HTMLElement | null) => {
      if (cancelled) return;
      if (tracked !== element) {
        if (tracked) observer.unobserve(tracked);
        tracked = element;
        if (tracked) observer.observe(tracked);
      }
      const rect = element?.getBoundingClientRect() ?? null;
      const view = viewportNow();
      setAnchor((old) =>
        old?.index === index && sameRect(old.rect, rect) && sameRect(old.viewport, view)
          ? old
          : { index, rect, viewport: view },
      );
    };
    const refresh = () => {
      if (looking || cancelled || updateFrame) return;
      updateFrame = requestAnimationFrame(() => {
        updateFrame = 0;
        commit(visibleTarget(current));
      });
    };
    const observer = new ResizeObserver(refresh);
    observer.observe(document.body);
    const lookup = () => {
      if (cancelled) return;
      const element = visibleTarget(current);
      if (element) {
        if (!tracked) {
          revealTarget(element);
          tracked = element;
          observer.observe(element);
        }
        const rect = element.getBoundingClientRect();
        stableFrames = sameRect(previous, rect) ? stableFrames + 1 : 0;
        previous = rect;
        if (stableFrames >= 2 || performance.now() >= deadline) {
          looking = false;
          commit(element);
          return;
        }
      } else if (performance.now() >= deadline) {
        // A removed/hidden control never traps the user in a dark overlay.
        looking = false;
        commit(null);
        return;
      }
      lookupFrame = requestAnimationFrame(lookup);
    };
    lookupFrame = requestAnimationFrame(lookup);
    const resize = () => {
      const element = visibleTarget(current);
      if (element && !looking) revealTarget(element);
      refresh();
    };
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", refresh);
    return () => {
      cancelled = true;
      cancelAnimationFrame(lookupFrame);
      cancelAnimationFrame(updateFrame);
      observer.disconnect();
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", refresh);
    };
  }, [current, index]);

  useLayoutEffect(() => {
    if (!prepared) return;
    navigating.current = false;
    nextRef.current?.focus({ preventScroll: true });
  }, [index, prepared]);

  const move = (direction: number) => {
    if (!prepared || navigating.current) return;
    if (direction > 0 && index === steps.length - 1) {
      onFinish();
      return;
    }
    const next = Math.max(0, Math.min(steps.length - 1, index + direction));
    if (next === index) return;
    navigating.current = true;
    setIndex(next);
  };

  return (
    <>
      <Dialog.Overlay forceMount asChild>
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.08 : 0.18 }}
        >
          <svg aria-hidden className="pointer-events-none h-full w-full">
            <defs>
              <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                <rect width="100%" height="100%" fill="white" />
                {hole && (
                  <motion.rect
                    key={current.id}
                    x={hole.left}
                    y={hole.top}
                    width={hole.width}
                    height={hole.height}
                    rx="10"
                    fill="black"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduced ? 0.08 : 0.15 }}
                  />
                )}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="var(--tour-scrim)" mask={`url(#${maskId})`} />
            {hole && (
              <rect
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx="10"
                fill="none"
                stroke="var(--card)"
                strokeOpacity="0.75"
                strokeWidth="1.5"
              />
            )}
          </svg>
        </motion.div>
      </Dialog.Overlay>
      <Dialog.Content
        forceMount
        asChild
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cardRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = openerRef.current;
          if (
            opener &&
            opener !== document.body &&
            opener.isConnected &&
            opener.getClientRects().length &&
            !opener.closest('[role="menu"]')
          ) {
            opener.focus({ preventScroll: true });
          } else {
            Array.from(
              document.querySelectorAll<HTMLElement>(
                '[data-tour="tour-launcher"], [aria-label="Account menu"]',
              ),
            )
              .find((element) => element.getClientRects().length)
              ?.focus({ preventScroll: true });
          }
        }}
      >
        <motion.div
          ref={cardRef}
          tabIndex={-1}
          aria-busy={!prepared}
          data-tour-step={current.id}
          className="fixed z-[101] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card text-card-foreground shadow-xl outline-none"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
          initial={{ opacity: 0, y: reduced ? 0 : 6 }}
          animate={{
            opacity: anchor || showPending ? 1 : 0,
            y: anchor || showPending ? 0 : reduced ? 0 : 6,
          }}
          exit={{ opacity: 0, y: reduced ? 0 : 4 }}
          transition={{ duration: reduced ? 0.08 : 0.16, ease }}
          onKeyDown={(event) => {
            if (event.repeat && ["ArrowRight", "ArrowLeft", "Enter", " "].includes(event.key)) {
              event.preventDefault();
              return;
            }
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (
              (event.target as HTMLElement).closest(
                'input, textarea, select, [contenteditable="true"]',
              )
            )
              return;
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3 pl-5 pr-2 pt-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              Step {index + 1} of {steps.length}
            </span>
            <button
              type="button"
              onClick={onFinish}
              aria-label="Close tour"
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-ui text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 pb-5" aria-live="polite" aria-atomic="true">
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, y: reduced ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.08 : 0.14, ease }}
            >
              <Dialog.Title className="font-display text-2xl font-medium leading-tight">
                {shown.title}
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {shown.body}
              </Dialog.Description>
              {!prepared && showPending && (
                <p role="status" className="mt-3 text-xs text-muted-foreground">
                  Finding this section…
                </p>
              )}
              {prepared && !anchor.rect && (
                <p role="status" className="mt-3 text-xs text-muted-foreground">
                  This control isn't visible right now. You can continue with the tour.
                </p>
              )}
            </motion.div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
            <Button
              type="button"
              variant="ghost"
              className="h-11 px-2 text-xs text-muted-foreground"
              onClick={onFinish}
            >
              Skip tour
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-3"
                disabled={!prepared || index === 0}
                onClick={() => move(-1)}
                aria-label="Previous tour step"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                ref={nextRef}
                type="button"
                className="h-11 px-3"
                disabled={!prepared}
                onClick={() => move(1)}
              >
                {index === steps.length - 1 ? "Finish" : "Next"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </Dialog.Content>
    </>
  );
}
