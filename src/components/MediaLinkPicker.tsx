import { useRef, useState } from "react";
import { Upload, Pencil, X, ImageIcon, Music2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SHAPE_CLASS: Record<"square" | "circle" | "wide", string> = {
  square: "h-14 w-14 rounded-ui",
  circle: "h-14 w-14 rounded-full",
  wide: "h-14 w-24 rounded-ui",
};

const KIND_ICON: Record<"image" | "audio", LucideIcon> = {
  image: ImageIcon,
  audio: Music2,
};

/**
 * Replaces the "text input + Upload button" row that used to sit next to
 * every file picker (avatar, cover, banner image, background image, image
 * block, music track) — one compact tile that's either a live thumbnail or
 * an empty-state icon, opening a small popover with the same two paths
 * (upload a file / paste a link you already host) instead of a bare input
 * sitting half-empty in the layout at all times.
 */
export function MediaLinkPicker({
  value,
  displayLabel,
  onUrlChange,
  onUpload,
  accept,
  uploading = false,
  placeholder = "Paste a link…",
  kind = "image",
  shape = "square",
  thumbnailSrc,
  emptyFallback,
  onClear,
  className,
}: {
  value: string;
  // Precomputed label for the caption — e.g. a filename for an upload, the
  // raw URL for a pasted link. Caller already has this logic
  // (imageFieldDisplay) for images; music passes its own.
  displayLabel?: string;
  onUrlChange: (url: string) => void;
  onUpload: (file: File) => void;
  accept: string;
  uploading?: boolean;
  placeholder?: string;
  kind?: "image" | "audio";
  shape?: "square" | "circle" | "wide";
  // Image src to render inside the tile. Omit for audio (or any value with
  // no visual thumbnail) — the kind's fallback icon shows instead.
  thumbnailSrc?: string;
  // Overrides the kind's default icon for the empty state — e.g. an
  // avatar's initial letter instead of a generic image icon.
  emptyFallback?: React.ReactNode;
  onClear?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = KIND_ICON[kind];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      onUpload(file);
      setOpen(false);
    }
  };

  const submitLink = (e: React.FormEvent) => {
    e.preventDefault();
    const url = draft.trim();
    if (!url) return;
    onUrlChange(url);
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setDraft(value.startsWith("data:") ? "" : value);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group relative shrink-0 cursor-pointer overflow-hidden border border-border bg-muted transition-colors hover:border-primary/50",
              SHAPE_CLASS[shape],
            )}
            aria-label="Choose image or paste a link"
          >
            {thumbnailSrc ? (
              <img src={thumbnailSrc} alt="" className="h-full w-full object-cover" />
            ) : emptyFallback ? (
              emptyFallback
            ) : (
              <span className="grid h-full w-full place-items-center">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </span>
            )}
            <span className="absolute inset-0 hidden items-center justify-center bg-black/55 group-hover:flex">
              <Pencil className="h-4 w-4 text-white" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3 p-3" align="start">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload a file"}
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submitLink} className="flex gap-1.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className="h-8.5 text-sm"
            />
            <Button type="submit" size="sm" className="shrink-0" disabled={!draft.trim()}>
              Use
            </Button>
          </form>
          {value && onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </PopoverContent>
      </Popover>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{displayLabel || "Not set"}</p>
        <p className="text-xs text-muted-foreground">Click the tile to upload or paste a link</p>
      </div>
    </div>
  );
}
