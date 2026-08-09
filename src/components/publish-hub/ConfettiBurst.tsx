import { useEffect, useRef } from "react";

// A one-shot celebration burst — simpler than the Atmosphere Particles
// engine (no live prop updates, no continuous loop, no kind switching), so
// it's a plain canvas + rAF effect rather than a reusable controller class.
// Self-removes via onDone once every piece has faded out.
interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  color: string;
}

const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#a855f7"];
const DURATION_MS = 2200;
const PIECE_COUNT = 120;
const GRAVITY = 900;

export function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDoneRef.current();
      return () => window.removeEventListener("resize", resize);
    }

    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * 0.35;
    const pieces: ConfettiPiece[] = Array.from({ length: PIECE_COUNT }, () => ({
      x: originX + (Math.random() - 0.5) * 200,
      y: originY,
      vx: (Math.random() - 0.5) * 500,
      vy: -Math.random() * 500 - 200,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 10,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let rafId: number;
    let lastT = performance.now();
    const start = lastT;

    const tick = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const elapsed = now - start;
      const life = Math.max(0, 1 - elapsed / DURATION_MS);

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of pieces) {
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vr * dt;

        ctx.save();
        ctx.globalAlpha = life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (elapsed < DURATION_MS) {
        rafId = requestAnimationFrame(tick);
      } else {
        onDoneRef.current();
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[100]" />
  );
}
