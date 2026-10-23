import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaLinkPicker } from "@/components/MediaLinkPicker";
import { toast } from "@/components/notifications";
import { uploadOgImage } from "@/lib/publish";
import type { Profile } from "@/lib/link-store";

export function SeoCard({
  profile,
  updateSeo,
}: {
  profile: Profile;
  updateSeo: (patch: Partial<Profile>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const title = profile.seoTitle ?? "";
  const description = profile.seoDescription ?? "";

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadOgImage(profile.slug, file);
      updateSeo({ ogImage: url, ogImageName: file.name });
    } catch {
      toast.error("Couldn't upload that image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <Label htmlFor={titleId} className="mb-2 flex items-center justify-between gap-2">
          <span>Link title</span>
          <span
            className={`text-xs tabular-nums ${title.length > 60 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {title.length}/60
          </span>
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(e) => updateSeo({ seoTitle: e.target.value })}
          placeholder={profile.name || profile.slug}
          maxLength={120}
        />
        {title.length > 60 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Search results may shorten this title.
          </p>
        )}
      </div>
      <div>
        <Label htmlFor={descriptionId} className="mb-2 flex items-center justify-between gap-2">
          <span>Description</span>
          <span
            className={`text-xs tabular-nums ${description.length > 160 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {description.length}/160
          </span>
        </Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(e) => updateSeo({ seoDescription: e.target.value })}
          placeholder={profile.bio || "A few words about your page…"}
          maxLength={300}
          rows={4}
        />
        {description.length > 160 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Previews may shorten this description.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="block">Share image</Label>
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
          placeholder="Image URL"
        />
        <p className="text-xs text-muted-foreground">1200 × 630 px · Optional</p>
      </div>
    </div>
  );
}
