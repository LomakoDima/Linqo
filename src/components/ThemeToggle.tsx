import { useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTheme, getCurrentTheme } from "@/lib/theme";

/**
 * Light/dark switch. The flip itself plays as an expanding-circle wipe
 * (View Transitions API) centered on the button, rather than an instant
 * class swap — same "vt-local" scoping BlockEditor's banner-layout morph
 * uses, so the router's full-page slide (styles.css) doesn't also fire here.
 * Falls back to a plain instant toggle wherever unsupported or reduced
 * motion is requested.
 */
export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const next: "light" | "dark" = getCurrentTheme() === "dark" ? "light" : "dark";
    const button = buttonRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!button || reduced || !("startViewTransition" in document)) {
      applyTheme(next);
      return;
    }

    const { left, top, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const root = document.documentElement;
    root.classList.add("vt-local");
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.finished.catch(() => {}).finally(() => root.classList.remove("vt-local"));
    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 550,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {});
  };

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={toggle}
      className="relative"
    >
      <Sun className="h-4 w-4 scale-100 rotate-0 transition-all duration-300 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute inset-0 m-auto h-4 w-4 scale-0 rotate-90 transition-all duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
