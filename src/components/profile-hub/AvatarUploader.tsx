import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, RefreshCw, Trash2, Crop, Check, UploadCloud } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { blockSpring } from "@/lib/block-motion/variants";
import type { Profile } from "@/lib/link-store";

// Large preview + explicit actions, replacing the old MediaLinkPicker tile
// for this one field — click/drag/paste all funnel through the same
// onUpload prop (build.tsx's existing handleAvatarFile -> fileToResizedDataUrl),
// so this component owns none of the resize/compress logic itself.
export function AvatarUploader({
  profile,
  update,
  onUpload,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      await onUpload(file);
      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 1200);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) handleFile(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SectionCard
      icon={ImagePlus}
      title="Avatar"
      description="The photo visitors see next to your name."
    >
      <div ref={cardRef} className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          className={`group relative grid h-28 w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed bg-muted transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid place-items-center text-muted-foreground">
              <UploadCloud className="h-6 w-6" />
            </span>
          )}

          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <motion.span
                className="h-6 w-6 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            </div>
          )}

          <AnimatePresence>
            {justUploaded && !uploading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={blockSpring}
                className="absolute inset-0 grid place-items-center bg-emerald-600/70"
              >
                <Check className="h-8 w-8 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {!profile.avatar && !uploading && (
            <span className="absolute inset-0 hidden items-center justify-center bg-black/55 text-xs font-medium text-white group-hover:flex">
              Drop, paste, or click
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2.5">
          {!profile.avatar && (
            <p className="text-sm text-muted-foreground">
              Add a photo so visitors recognize you. Drag one in, paste it, or click the circle.
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {profile.avatar ? (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" /> Replace
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-3.5 w-3.5" /> Upload
                </>
              )}
            </Button>
            {profile.avatar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => update({ avatar: undefined, avatarName: undefined })}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
              </Button>
            )}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button type="button" variant="outline" size="sm" disabled>
                      <Crop className="mr-2 h-3.5 w-3.5" /> Crop
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
