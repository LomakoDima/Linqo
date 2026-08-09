import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface TourStep {
  // CSS selector for the element to spotlight. Looked up fresh on every
  // step change (and polled briefly) since the target may only exist after
  // `onBeforeShow` switches tabs and its content mounts.
  target: string;
  title: string;
  body: string;
  onBeforeShow?: () => void;
}

const PAD = 8;
const MAX_LOOKUP_TRIES = 20;

export function GuideTour({
  steps,
  active,
  onFinish,
}: {
  steps: TourStep[];
  active: boolean;
  onFinish: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (active) setStepIndex(0);
  }, [active]);

  const step = active ? steps[stepIndex] : undefined;

  useEffect(() => {
    if (!step) return;
    step.onBeforeShow?.();

    let cancelled = false;
    let tries = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(step.target);
      // offsetParent is null for display:none elements (and their hidden
      // descendants) — e.g. the preview aside is `hidden lg:block`, so on
      // narrower viewports it exists in the DOM but has nothing to spotlight.
      const visible = el && el.offsetParent !== null;
      if (!visible) {
        if (cancelled) return;
        if (tries++ < MAX_LOOKUP_TRIES) {
          setTimeout(measure, 50);
        } else if (stepIndex + 1 < steps.length) {
          // Never became visible — skip it instead of dimming the whole
          // screen with a zero-size spotlight and no visible target.
          setStepIndex(stepIndex + 1);
        } else {
          onFinish();
        }
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(() => {
        if (!cancelled) setRect(el.getBoundingClientRect());
      }, 260);
    };
    setRect(null);
    measure();

    const onResize = () => {
      const el = document.querySelector<HTMLElement>(step.target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
    // step identity changes with stepIndex/active, which is all we need to re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stepIndex, active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  if (!step) return null;

  const isLast = stepIndex === steps.length - 1;
  const next = () => (isLast ? onFinish() : setStepIndex((i) => i + 1));
  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const spotlightStyle = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
      }
    : { top: 0, left: 0, width: 0, height: 0, boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)" };

  // Prefer the card below the spotlight; flip above if it would overflow the
  // viewport, and always clamp horizontally so it never runs off-screen.
  const cardWidth = 320;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1024;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 768;
  const spaceBelow = rect ? viewportH - rect.bottom : 0;
  const showAbove = !!rect && spaceBelow < 200 && rect.top > 200;
  const cardTop = rect
    ? showAbove
      ? Math.max(16, rect.top - PAD - 12)
      : rect.bottom + PAD + 12
    : viewportH / 2 - 80;
  const idealLeft = rect
    ? rect.left + rect.width / 2 - cardWidth / 2
    : viewportW / 2 - cardWidth / 2;
  const cardLeft = Math.min(Math.max(16, idealLeft), viewportW - cardWidth - 16);

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0" onClick={onFinish} />
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
        style={spotlightStyle}
      />
      <div
        className="absolute w-80 animate-scale-in rounded-xl border border-border bg-card p-4 shadow-xl"
        style={{
          top: cardTop,
          left: cardLeft,
          transform: showAbove ? "translateY(-100%)" : "none",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold">{step.title}</h3>
          <button
            onClick={onFinish}
            className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === stepIndex ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button size="sm" variant="ghost" onClick={back}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
