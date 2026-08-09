import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ImageIcon,
  Palette,
  Sparkles as GradientIcon,
  Check,
  UploadCloud,
  X,
  LayoutGrid,
  Wand2,
  Camera,
} from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { BANNER_STYLES, type BannerStyle, type Profile } from "@/lib/link-store";

const MOODY_KEYS = (Object.keys(BANNER_STYLES) as BannerStyle[]).filter(
  (k) => BANNER_STYLES[k].kind === "moody",
);
const GRADIENT_KEYS = (Object.keys(BANNER_STYLES) as BannerStyle[]).filter(
  (k) => BANNER_STYLES[k].kind === "gradient",
);

type CardKind = "image" | "solid" | "gradient";

function activeCardOf(profile: Profile): CardKind {
  if ((profile.bgType ?? "image") === "image") return "image";
  const current = BANNER_STYLES[profile.bgStyle ?? "dark"] ?? BANNER_STYLES.dark;
  return current.kind === "gradient" ? "gradient" : "solid";
}

const CARDS: { key: CardKind; label: string; icon: typeof ImageIcon }[] = [
  { key: "image", label: "Upload Image", icon: ImageIcon },
  { key: "solid", label: "Solid Color", icon: Palette },
  { key: "gradient", label: "Gradient", icon: GradientIcon },
];

const COMING_SOON = [
  { label: "Gallery", icon: LayoutGrid },
  { label: "AI Background", icon: Wand2 },
  { label: "Unsplash", icon: Camera },
];

// Mirrors profile-hub/CoverSelector.tsx exactly — same coverType/coverStyle
// pattern, applied to the page's base background (bgType/bgStyle) instead
// of the cover banner, so the background can be chosen independently of the
// active theme just like Cover already is.
export function BackgroundSelector({
  profile,
  update,
  onUpload,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const active = activeCardOf(profile);

  const selectCard = (key: CardKind) => {
    if (key === "image") {
      update({ bgType: "image" });
      return;
    }
    const keys = key === "solid" ? MOODY_KEYS : GRADIENT_KEYS;
    const currentKind = BANNER_STYLES[profile.bgStyle ?? "dark"]?.kind;
    const wantsKind = key === "solid" ? "moody" : "gradient";
    update({
      bgType: "color",
      bgStyle: currentKind === wantsKind ? profile.bgStyle : keys[0],
    });
  };

  return (
    <SectionCard
      icon={ImageIcon}
      title="Background"
      description="Set the base backdrop of your page."
    >
      <div className="grid grid-cols-3 gap-2.5">
        {CARDS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectCard(key)}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-center transition-all duration-200 ${
              active === key
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${active === key ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {active === "image" ? (
        <BackgroundDropzone profile={profile} update={update} onUpload={onUpload} />
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {(active === "solid" ? MOODY_KEYS : GRADIENT_KEYS).map((k) => {
            const s = BANNER_STYLES[k];
            const selected = profile.bgStyle === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => update({ bgStyle: k })}
                title={s.label}
                aria-label={s.label}
                className={`relative h-11 w-11 shrink-0 cursor-pointer rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 ${s.gradient} ${
                  selected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "ring-1 ring-border hover:ring-muted-foreground/40"
                }`}
              >
                {selected && (
                  <Check
                    className={`absolute inset-0 m-auto h-4 w-4 drop-shadow ${s.light ? "text-neutral-900" : "text-white"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {COMING_SOON.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="relative flex cursor-not-allowed flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-3.5 text-center opacity-60"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <Badge
              variant="secondary"
              className="absolute -right-1.5 -top-1.5 px-1.5 py-0 text-[9px]"
            >
              Soon
            </Badge>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function BackgroundDropzone({
  profile,
  update,
  onUpload,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
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
    <div
      className={`relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
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
      {profile.bgImage && (
        <>
          <img
            src={profile.bgImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            aria-label="Remove background image"
            onClick={(e) => {
              e.stopPropagation();
              update({ bgImage: undefined, bgImageName: undefined });
            }}
            className="absolute right-2 top-2 z-10 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      <div
        className={`relative flex flex-col items-center gap-1.5 ${profile.bgImage ? "rounded-lg bg-black/55 px-4 py-3 text-white" : "text-muted-foreground"}`}
      >
        {uploading ? (
          <motion.span
            className="h-5 w-5 rounded-full border-2 border-current/30 border-t-current"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
        ) : (
          <UploadCloud className="h-5 w-5" />
        )}
        <span className="text-xs font-medium">
          {profile.bgImage
            ? "Drop, paste, or click to replace"
            : "Drag & drop, paste, or click — PNG, JPG, WEBP"}
        </span>
      </div>
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
    </div>
  );
}
