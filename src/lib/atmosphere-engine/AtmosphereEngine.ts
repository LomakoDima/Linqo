// The orchestrator for whatever inside Atmosphere genuinely needs a
// lifecycle owner outside React's render cycle — today that's only the
// particle canvas/rAF loop. Background Music, Ambient Sounds, and the
// Visualizer are all plain React state + existing components/hooks (see
// the Atmosphere plan's decision 1); this class exists so a future
// "future effects" module with its own canvas/timer can register here
// without touching ParticleStage or LinkPreview.
import { ParticleController } from "./ParticleController";
import type { ParticleSettings } from "@/lib/link-store";

export class AtmosphereEngine {
  private readonly particles: ParticleController;

  constructor(stageEl: HTMLElement) {
    this.particles = new ParticleController(stageEl);
  }

  mount(): void {
    this.particles.mount();
  }

  update(particleSettings: ParticleSettings | undefined): void {
    this.particles.update(particleSettings);
  }

  destroy(): void {
    this.particles.destroy();
  }
}
