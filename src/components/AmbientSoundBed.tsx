import { forwardRef, useImperativeHandle } from "react";
import { useAmbientLayers } from "@/hooks/useAmbientLayers";
import type { AmbientSettings } from "@/lib/link-store";

export interface AmbientSoundBedHandle {
  unlockAll: () => void;
  pauseAll: () => void;
}

// Invisible <audio> elements for every enabled ambient layer — mounted
// alongside NowPlayingWidget/AmbientOnlyWidget in LinkPreview, which call
// unlockAll()/pauseAll() from their own gesture-gated click handler.
export const AmbientSoundBed = forwardRef<
  AmbientSoundBedHandle,
  { ambient: AmbientSettings | undefined }
>(function AmbientSoundBed({ ambient }, ref) {
  const { activeLayers, registerRef, unlockAll, pauseAll } = useAmbientLayers(ambient);

  useImperativeHandle(ref, () => ({ unlockAll, pauseAll }), [unlockAll, pauseAll]);

  return (
    <>
      {activeLayers.map((layer) => (
        <audio key={layer.kind} ref={registerRef(layer.kind)} src={layer.url} loop preload="none" />
      ))}
    </>
  );
});
