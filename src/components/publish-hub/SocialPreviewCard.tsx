import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { SegmentedToggle } from "@/components/BlockEditor";
import { APP_DOMAIN } from "@/lib/constants";
import type { Profile } from "@/lib/link-store";

type Platform = "x" | "linkedin" | "discord";

export function SocialPreviewCard({ profile }: { profile: Profile }) {
  const [platform, setPlatform] = useState<Platform>("x");
  const title = profile.seoTitle || profile.name || profile.slug;
  const description =
    profile.seoDescription || profile.bio || `Check out @${profile.slug} on Linqo.`;
  const image = profile.ogImage || profile.avatar || undefined;

  const previewImage = (className: string) => (
    <div className={`overflow-hidden bg-muted ${className}`}>
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  return (
    <section aria-label="Social link preview" className="min-w-0 space-y-4">
      <SegmentedToggle<Platform>
        value={platform}
        onChange={setPlatform}
        options={[
          { value: "x", label: "X" },
          { value: "linkedin", label: "LinkedIn" },
          { value: "discord", label: "Discord" },
        ]}
      />
      <div aria-live="polite" className="overflow-hidden rounded-lg border border-border bg-card">
        {platform === "discord" ? (
          <div className="flex gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs text-muted-foreground">{APP_DOMAIN}</p>
              <p className="break-words text-sm font-medium">{title}</p>
              <p className="line-clamp-3 break-words text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
            {previewImage("h-16 w-16 shrink-0 rounded-ui")}
          </div>
        ) : (
          <>
            {previewImage("aspect-[1.91/1] w-full")}
            <div className="space-y-1.5 border-t border-border p-4">
              {platform === "x" && <p className="text-xs text-muted-foreground">{APP_DOMAIN}</p>}
              <p className="line-clamp-2 break-words text-sm font-medium">{title}</p>
              {platform === "x" && (
                <p className="line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
              {platform === "linkedin" && (
                <p className="text-xs text-muted-foreground">{APP_DOMAIN}</p>
              )}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Uses your name and bio unless overridden.</p>
    </section>
  );
}
