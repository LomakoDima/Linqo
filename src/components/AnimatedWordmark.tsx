/**
 * Brand wordmark that cascades in letter-by-letter on mount (see
 * .wordmark-letter / .wordmark-dot in styles.css). Purely CSS-driven so it
 * plays once per page load with no layout-shift risk; collapses to static
 * text under prefers-reduced-motion.
 */
export function AnimatedWordmark({
  text,
  className = "",
  delay = 0,
  letterDelay = 45,
  id,
}: {
  text: string;
  className?: string;
  delay?: number;
  letterDelay?: number;
  id?: string;
}) {
  const letters = Array.from(text);
  return (
    <span id={id} className={`inline-flex ${className}`} aria-label={text}>
      {letters.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={`inline-block ${ch === "." ? "wordmark-dot" : "wordmark-letter"}`}
          style={{ animationDelay: `${delay + i * letterDelay}ms` }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
