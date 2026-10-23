import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MUSIC_GENRES, type MusicGenre } from "@/lib/link-store";

/**
 * Clicking a genre used to select it outright. Now it opens this instead —
 * a floating "browse this vibe" window listing the genre's bundled tracks
 * (see MUSIC_GENRES / MUSIC_LIBRARY). Each row can be previewed in place
 * before "Use" picks it; only one preview plays at a time, and closing the
 * window stops it. The empty state stays for a genre with no tracks.
 */
export function GenrePlaylistModal({
  genreKey,
  open,
  onOpenChange,
  onUseTrack,
  onUseGenre,
}: {
  genreKey: MusicGenre | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTrack: (genre: MusicGenre, url: string) => void;
  onUseGenre: (genre: MusicGenre) => void;
}) {
  const genre = genreKey ? MUSIC_GENRES[genreKey] : null;
  const tracks = genre?.tracks ?? [];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const stopPreview = () => {
    audioRef.current?.pause();
    setPreviewing(null);
  };

  const togglePreview = (url: string) => {
    if (previewing === url) {
      stopPreview();
      return;
    }
    audioRef.current ??= new Audio();
    const audio = audioRef.current;
    audio.src = url;
    audio.onended = () => setPreviewing(null);
    audio.play().catch(() => setPreviewing(null));
    setPreviewing(url);
  };

  // Stop on close, and never leave a preview playing after the builder
  // unmounts the modal.
  useEffect(() => {
    if (open) return;
    audioRef.current?.pause();
    setPreviewing(null);
  }, [open]);
  useEffect(() => () => audioRef.current?.pause(), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        {genre && genreKey && (
          <>
            <div className={`relative h-28 w-full overflow-hidden ${genre.gradient}`}>
              {genre.image && (
                <img
                  src={genre.image}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <DialogHeader className="absolute inset-x-0 bottom-0 items-start px-4 pb-3 text-left">
                <DialogTitle className="text-white">{genre.label}</DialogTitle>
                <DialogDescription className="text-white/75">{genre.blurb}</DialogDescription>
              </DialogHeader>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {tracks.length > 0 ? (
                <div className="space-y-0.5">
                  {tracks.map((t) => (
                    <div
                      key={t.url}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                    >
                      <button
                        type="button"
                        aria-label={`${previewing === t.url ? "Pause" : "Preview"} ${t.label}`}
                        onClick={() => togglePreview(t.url)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted transition-colors hover:bg-foreground hover:text-background"
                      >
                        {previewing === t.url ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="ml-0.5 h-3.5 w-3.5" />
                        )}
                      </button>
                      <span className="min-w-0 flex-1 truncate text-sm">{t.label}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          stopPreview();
                          onUseTrack(genreKey, t.url);
                        }}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                    <Music2 className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    No sample tracks for this vibe yet — pick it for its look, then add your own
                    track below.
                  </p>
                  <Button size="sm" onClick={() => onUseGenre(genreKey)}>
                    Use {genre.label}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
