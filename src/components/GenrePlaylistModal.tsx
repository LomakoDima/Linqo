import { Music2 } from "lucide-react";
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
 * a floating "browse this vibe" window. `genre.tracks` starts empty for
 * every genre (see MUSIC_GENRES) since this app has nowhere of its own to
 * host sample audio; the empty state says so plainly rather than pretending
 * a playlist exists. The moment a deployment populates `tracks` for a
 * genre, real rows with working "Use" buttons show up here automatically.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        {genre && genreKey && (
          <>
            <div
              className={`relative h-28 w-full ${genre.image ? "bg-cover bg-center" : genre.gradient}`}
              style={genre.image ? { backgroundImage: `url(${genre.image})` } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
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
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
                        <Music2 className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{t.label}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => onUseTrack(genreKey, t.url)}
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
