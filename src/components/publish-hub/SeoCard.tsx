import { useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaLinkPicker } from "@/components/MediaLinkPicker";
import { SectionCard } from "@/components/ui/section-card";
import { uploadOgImage } from "@/lib/publish";
import type { Profile } from "@/lib/link-store";

const TITLE_MIN = 15;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

function counterColor(len: number, min: number, max: number): string {
  if (len === 0) return "text-muted-foreground";
  if (len < min || len > max) return "text-amber-500";
  return "text-emerald-600";
}

// Every field here is a page-wide "how this looks to the outside world"
// setting — title/description drive both search results and (with no OG
// image override) the Social Preview card's text. Live counters + threshold
// hints instead of a submit-time validator, since nothing here ever blocks
// publishing — they're guidance, not gates.
export function SeoCard({
  profile,
  updateSeo,
}: {
  profile: Profile;
  updateSeo: (patch: Partial<Profile>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const title = profile.seoTitle ?? "";
  const description = profile.seoDescription ?? "";
  const titleFallback = profile.name || profile.slug;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadOgImage(profile.slug, file);
      updateSeo({ ogImage: url, ogImageName: file.name });
    } finally {
      setUploading(false);
    }
  };

  return (
    <SectionCard
      icon={Search}
      title="SEO"
      description="How your page shows up in search and previews."
      defaultOpen={false}
    >
      <div>
        <Label className="mb-2 flex items-center justify-between">
          <span>Title</span>
          <span
            className={`text-xs font-medium tabular-nums ${counterColor(title.length, TITLE_MIN, TITLE_MAX)}`}
          >
            {title.length}/{TITLE_MAX}
          </span>
        </Label>
        <Input
          value={title}
          onChange={(e) => updateSeo({ seoTitle: e.target.value })}
          placeholder={titleFallback}
          maxLength={120}
        />
        {title.length === 0 ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3 shrink-0" /> Empty — falls back to "{titleFallback}".
          </p>
        ) : title.length < TITLE_MIN ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            A bit short — {TITLE_MIN}-{TITLE_MAX} characters reads best in search results.
          </p>
        ) : title.length > TITLE_MAX ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            May be truncated in search results past {TITLE_MAX} characters.
          </p>
        ) : null}
      </div>

      <div>
        <Label className="mb-2 flex items-center justify-between">
          <span>Description</span>
          <span
            className={`text-xs font-medium tabular-nums ${counterColor(description.length, DESC_MIN, DESC_MAX)}`}
          >
            {description.length}/{DESC_MAX}
          </span>
        </Label>
        <Textarea
          value={description}
          onChange={(e) => updateSeo({ seoDescription: e.target.value })}
          placeholder={profile.bio || "A few words about yourself and your project"}
          maxLength={300}
          rows={3}
        />
        {description.length === 0 ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3 shrink-0" /> Empty — falls back to your bio.
          </p>
        ) : description.length < DESC_MIN ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            A bit short — {DESC_MIN}-{DESC_MAX} characters reads best.
          </p>
        ) : description.length > DESC_MAX ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            May be truncated in previews past {DESC_MAX} characters.
          </p>
        ) : null}
      </div>

      <div>
        <Label className="mb-2 block">OG Image</Label>
        <MediaLinkPicker
          value={profile.ogImage ?? ""}
          displayLabel={profile.ogImageName ?? profile.ogImage ?? ""}
          onUrlChange={(url) => updateSeo({ ogImage: url, ogImageName: undefined })}
          onUpload={handleUpload}
          onClear={() => updateSeo({ ogImage: undefined, ogImageName: undefined })}
          accept="image/png,image/jpeg,image/webp,image/gif"
          kind="image"
          shape="wide"
          uploading={uploading}
          placeholder="Paste a link to an image you host…"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Recommended: 1200×630px.</p>
        {!profile.ogImage && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3 shrink-0" /> No image set — add one so your link looks
            great when shared.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
