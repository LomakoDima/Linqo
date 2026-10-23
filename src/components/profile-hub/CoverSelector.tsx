import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedToggle } from "@/components/BlockEditor";
import { toast } from "@/components/notifications";
import { BANNER_STYLES, type BannerStyle, type Profile } from "@/lib/link-store";

type CoverKind = "image" | "solid" | "gradient";

export function CoverSelector({
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
  const preset = BANNER_STYLES[profile.coverStyle ?? "dark"] ?? BANNER_STYLES.dark;
  const kind: CoverKind =
    profile.coverType !== "color" ? "image" : preset.kind === "gradient" ? "gradient" : "solid";

  const setKind = (next: CoverKind) => {
    if (next === "image") {
      update({ coverType: "image" });
      return;
    }
    const match = next === "gradient" ? "gradient" : "moody";
    const first = (Object.keys(BANNER_STYLES) as BannerStyle[]).find(
      (k) => BANNER_STYLES[k].kind === match,
    );
    update({
      coverType: "color",
      coverStyle: preset.kind === match ? (profile.coverStyle ?? first) : first,
    });
  };

  const handleFile = async (file: File) => {
    if (uploading || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      await onUpload(file);
      update({ coverType: "image" });
    } catch {
      toast.error("Couldn't upload that cover");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`relative h-36 border-b border-border sm:h-44 ${kind === "image" ? "bg-muted" : preset.gradient} ${dragging ? "ring-2 ring-inset ring-ring" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void handleFile(file);
      }}
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
      {kind === "image" && profile.cover && (
        <img src={profile.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {uploading && (
        <div
          role="status"
          aria-label="Uploading cover"
          className="absolute inset-0 grid place-items-center bg-card/70"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      <div className="absolute right-3 top-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-card text-card-foreground"
            >
              <ImagePlus className="h-4 w-4" /> Cover
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)] space-y-4">
            <SegmentedToggle<CoverKind>
              value={kind}
              onChange={setKind}
              options={[
                { value: "image", label: "Image" },
                { value: "solid", label: "Solid" },
                { value: "gradient", label: "Gradient" },
              ]}
            />
            {kind === "image" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> {profile.cover ? "Replace" : "Upload"}
                </Button>
                {profile.cover && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploading}
                    onClick={() => update({ cover: undefined, coverName: undefined })}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(BANNER_STYLES) as BannerStyle[])
                  .filter(
                    (k) => BANNER_STYLES[k].kind === (kind === "gradient" ? "gradient" : "moody"),
                  )
                  .map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-label={BANNER_STYLES[k].label}
                      title={BANNER_STYLES[k].label}
                      aria-pressed={profile.coverStyle === k}
                      onClick={() => update({ coverStyle: k })}
                      className={`relative h-9 cursor-pointer rounded-ui ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${BANNER_STYLES[k].gradient}`}
                    >
                      {profile.coverStyle === k && (
                        <Check
                          className={`absolute inset-0 m-auto h-4 w-4 ${BANNER_STYLES[k].light ? "text-neutral-900" : "text-white"}`}
                        />
                      )}
                    </button>
                  ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Cover image file"
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
