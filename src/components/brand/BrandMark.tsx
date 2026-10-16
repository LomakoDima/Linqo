import { Link } from "@tanstack/react-router";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";

// The one place the Linqo wordmark is set — typographic only (Fraunces, with
// the vermilion full stop from .wordmark-dot), so the marketing site, auth
// screens and the builder header all carry the same mark. `id` is only for
// the splash screen's FLIP morph target (see LoadingScreen).
export function BrandMark({
  id,
  size = "md",
  animate = true,
  className = "",
}: {
  id?: string;
  size?: "md" | "lg";
  animate?: boolean;
  className?: string;
}) {
  const text = size === "lg" ? "text-3xl" : "text-[1.375rem]";
  return (
    <Link
      to="/"
      aria-label="Linqo home"
      className={`inline-flex items-center rounded-ui font-display font-semibold leading-none ${text} ${className}`}
    >
      {animate ? (
        <AnimatedWordmark id={id} text="Linqo." delay={120} />
      ) : (
        <span id={id}>
          Linqo<span className="text-brand">.</span>
        </span>
      )}
    </Link>
  );
}
