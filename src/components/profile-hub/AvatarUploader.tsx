import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/notifications";
import type { Profile } from "@/lib/link-store";
import { IMAGE_ACCEPT } from "@/lib/file-safety";
import { safeContentUrl } from "@/lib/content-safety";

export function AvatarUploader({
  profile,
  update,
  onUpload,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (uploading || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      await onUpload(file);
    } catch {
      toast.error("Couldn't upload that photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="relative flex items-end gap-4"
      onPaste={(e) => {
        const file = Array.from(e.clipboardData.items)
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
        if (file) {
          e.preventDefault();
          void handleFile(file);
        }
      }}
    >
      <button
        type="button"
        aria-label={profile.avatar ? "Change profile photo" : "Upload profile photo"}
        disabled={uploading}
        className={`group relative -mt-10 grid h-24 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-4 border-card bg-muted text-2xl font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait ${dragging ? "ring-2 ring-ring" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        {profile.avatar ? (
          <img
            src={safeContentUrl(profile.avatar, "image") || undefined}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : profile.name ? (
          profile.name.charAt(0).toUpperCase()
        ) : (
          <Camera className="h-6 w-6" />
        )}
        <span
          className={`absolute inset-0 grid place-items-center bg-foreground/70 text-background transition-opacity duration-150 ${uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>
      <div className="flex min-w-0 flex-wrap items-center gap-1 pb-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : profile.avatar ? "Change photo" : "Add photo"}
        </Button>
        {profile.avatar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled={uploading}
            aria-label="Remove profile photo"
            title="Remove photo"
            onClick={() => update({ avatar: "", avatarName: undefined })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-label="Profile photo file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
