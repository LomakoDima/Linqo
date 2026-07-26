import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation } from "@tanstack/react-router";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";

const WORDMARK = "Linqo.";
const ENTRANCE_DELAY = 150;
const LETTER_STEP = 80;
const ENTRANCE_DURATION = 650;
const HOLD = 350;
const MORPH_DURATION = 650;
const FADE_DURATION = 300;

const TOTAL_ENTER = ENTRANCE_DELAY + (WORDMARK.length - 1) * LETTER_STEP + ENTRANCE_DURATION;

type Stage = "enter" | "morph" | "fade" | "done";

// Established from the very first paint (not added at the same time as the
// transform value) so the browser has an existing transition to pick up when
// `transform` changes later — setting both in the same style update is a
// classic no-op trap for CSS transitions.
const MORPH_TRANSITION_STYLE: CSSProperties = {
  transitionProperty: "transform",
  transitionDuration: `${MORPH_DURATION}ms`,
  transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
};

/**
 * Full-screen splash shown once per hard page load (mounted at the route
 * root, so it never replays on client-side navigation). Site content
 * underneath renders and starts fetching immediately — this is a purely
 * visual curtain, not a data-loading gate.
 *
 * The big centered wordmark doesn't just fade out: it FLIP-animates
 * (measure from/to rects, transition transform) onto the real header
 * wordmark's exact position and size — which is already rendered underneath,
 * just hidden — so the title appears to shrink straight into the header.
 *
 * Skipped on /build: someone actively working in the builder reloads far
 * more often than a first-time visitor to the landing page, and replaying a
 * multi-second splash on every one of those reloads reads as an obstacle,
 * not a first impression.
 */
export function LoadingScreen() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const skip = pathname.startsWith("/build");
  const skipRef = useRef(skip);
  const [stage, setStage] = useState<Stage>(skip ? "done" : "enter");
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const [morphTransform, setMorphTransform] = useState<CSSProperties>({});

  useEffect(() => {
    if (skipRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("done");
      return;
    }

    const morphTimer = setTimeout(() => {
      const from = wordmarkRef.current?.getBoundingClientRect();
      const to = document.getElementById("header-wordmark-target")?.getBoundingClientRect();
      if (from && to && from.width > 0) {
        const scale = to.width / from.width;
        setMorphTransform({
          transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`,
          transformOrigin: "top left",
        });
      }
      setStage("morph");
    }, TOTAL_ENTER + HOLD);

    const fadeTimer = setTimeout(() => setStage("fade"), TOTAL_ENTER + HOLD + MORPH_DURATION);
    const doneTimer = setTimeout(
      () => setStage("done"),
      TOTAL_ENTER + HOLD + MORPH_DURATION + FADE_DURATION,
    );

    return () => {
      clearTimeout(morphTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (stage === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stage]);

  if (stage === "done") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        stage === "fade" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        ref={wordmarkRef}
        style={{
          ...MORPH_TRANSITION_STYLE,
          ...(stage === "morph" || stage === "fade" ? morphTransform : null),
        }}
      >
        <AnimatedWordmark
          text={WORDMARK}
          delay={ENTRANCE_DELAY}
          letterDelay={LETTER_STEP}
          className="text-6xl font-semibold tracking-tight sm:text-7xl lg:text-8xl"
        />
      </div>
    </div>
  );
}
