import { useEffect, useRef } from "react";
import { CompanionEngine, getCompanionConfig } from "@/lib/companion-engine";
import { COMPANION_BEHAVIORS, COMPANION_SIZES, type CompanionSettings } from "@/lib/link-store";

// Mounts one living CompanionEngine instance into the page. The engine owns
// its own canvas and requestAnimationFrame loop from here on — this
// component's only job is lifecycle (create on mount / id change, tear down
// on unmount) and forwarding the few props that can change without a full
// re-mount (home corner, size, whether music is currently playing).
export function CompanionStage({
  companion,
  musicPlaying = false,
}: {
  companion: CompanionSettings;
  musicPlaying?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CompanionEngine | null>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    const config = getCompanionConfig(companion.id);
    if (!stageEl || !config) return;

    const engine = new CompanionEngine(config, stageEl, {
      size: COMPANION_SIZES[companion.size ?? "md"].px,
      home: companion.home ?? "banner-bottom-right",
    });
    engineRef.current = engine;
    engine.mount();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Only the animal itself warrants a full remount (new sprite sheet, new
    // config) — home/size/dancing are pushed to the live instance below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion.id]);

  useEffect(() => {
    engineRef.current?.setHome(companion.home ?? "banner-bottom-right");
  }, [companion.home]);

  useEffect(() => {
    engineRef.current?.setSize(COMPANION_SIZES[companion.size ?? "md"].px);
  }, [companion.size]);

  useEffect(() => {
    const preset = COMPANION_BEHAVIORS[companion.behavior ?? "idle"];
    engineRef.current?.setBehaviorMultipliers({
      idleChance: preset.idleChanceMultiplier,
      speed: preset.speedMultiplier,
      wanderRadius: preset.wanderRadiusMultiplier,
    });
  }, [companion.behavior]);

  useEffect(() => {
    engineRef.current?.setDancing(musicPlaying);
  }, [musicPlaying]);

  return <div ref={stageRef} aria-hidden className="pointer-events-none absolute inset-0 z-30" />;
}
