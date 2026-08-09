import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Replaces the bare browser `<audio controls>` bar in the Track section
 * with something that actually matches the rest of the builder — same
 * play button voice as everywhere else, a draggable scrubber instead of
 * the OS-themed native one.
 */
export function AudioPreviewPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [dragging, setDragging] = useState(false);

  // A new track src means the old playback position is meaningless.
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  const seek = (clientX: number) => {
    const bar = barRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => seek(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, duration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          if (!dragging) setCurrent(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        onClick={toggle}
        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="h-4 w-4" fill="currentColor" />
        ) : (
          <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          ref={barRef}
          className="group relative h-1.5 cursor-pointer rounded-full bg-muted"
          onPointerDown={(e) => {
            setDragging(true);
            seek(e.clientX);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          audio.muted = !audio.muted;
          setMuted(audio.muted);
        }}
        className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
