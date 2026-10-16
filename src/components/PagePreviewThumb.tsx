import { useEffect, useRef, useState } from "react";
import { LinkPreview } from "@/components/LinkPreview";
import type { Profile } from "@/lib/link-store";

// LinkPreview lays itself out for a ~320px-wide phone screen. This renders
// the *real* component at that width and scales it to whatever box it's
// given (measured, not a magic number), so a thumbnail is always the same
// page the visitor will publish — never a screenshot or a mock.
//
// The copy inside is decorative here: `inert` takes its links out of the tab
// order and `aria-hidden` out of the accessibility tree; the caller supplies
// the real accessible name for whatever wraps it.
const BASE_WIDTH = 320;

export function PagePreviewThumb({
  profile,
  aspect = "4 / 5",
  className = "",
  crop = 0,
}: {
  profile: Profile;
  aspect?: string;
  className?: string;
  // Page pixels (at 320px width) to hide from the top. Every page opens with
  // the same empty cover band; cropping most of it lets a small thumbnail
  // spend its space on the part that differs between pages.
  crop?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  // Each thumbnail is a full LinkPreview — only mount one once it's near the
  // viewport, so a long catalog doesn't render every page up front.
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setScale(el.clientWidth / BASE_WIDTH);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      aria-hidden
      className={`relative overflow-hidden bg-muted ${className}`}
      style={{ aspectRatio: aspect }}
    >
      {near && scale !== null && (
        <div
          inert
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: BASE_WIDTH,
            transform: `translateY(${-crop * scale}px) scale(${scale})`,
          }}
        >
          <LinkPreview profile={profile} />
        </div>
      )}
    </div>
  );
}
