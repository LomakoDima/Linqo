import { useEffect, useRef } from "react";
import { AtmosphereEngine } from "@/lib/atmosphere-engine/AtmosphereEngine";
import type { ParticleSettings } from "@/lib/link-store";

// Mounts one AtmosphereEngine instance covering the page content area — same
// shape as CompanionStage (mount once, push live prop updates to the
// running instance rather than remounting, so a running sim's particle
// positions never reset or flicker on every settings tweak).
export function ParticleStage({ particles }: { particles: ParticleSettings | undefined }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AtmosphereEngine | null>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const engine = new AtmosphereEngine(stageEl);
    engineRef.current = engine;
    engine.mount();
    engine.update(particles);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Mounted once — particle updates flow through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.update(particles);
  }, [particles]);

  return <div ref={stageRef} aria-hidden className="pointer-events-none absolute inset-0 z-40" />;
}
