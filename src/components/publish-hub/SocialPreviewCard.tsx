import { Rocket, ImageIcon } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { APP_DOMAIN } from "@/lib/constants";
import type { Profile } from "@/lib/link-store";

function usePreviewData(profile: Profile) {
  const title = profile.seoTitle || profile.name || profile.slug;
  const description =
    profile.seoDescription || profile.bio || `Check out @${profile.slug} on Linqo.`;
  const image = profile.ogImage || profile.avatar || undefined;
  return { title, description, image };
}

function PreviewImage({ image, aspect }: { image: string | undefined; aspect: string }) {
  if (image) {
    return (
      <div className={`w-full overflow-hidden bg-muted ${aspect}`}>
        <img src={image} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`grid w-full place-items-center bg-gradient-to-br from-primary/15 to-primary/5 ${aspect}`}
    >
      <Rocket className="h-8 w-8 text-primary/50" />
    </div>
  );
}

// One of the most important cards — this is what a visitor actually sees
// before they click. Live, not static: reads the exact fallback chain the
// public page's real head() uses (seoTitle/seoDescription/ogImage -> name,
// bio, avatar -> generated placeholder), so what's shown here is what a
// crawler would really produce, not an approximation of it.
export function SocialPreviewCard({ profile }: { profile: Profile }) {
  const { title, description, image } = usePreviewData(profile);

  return (
    <SectionCard
      icon={ImageIcon}
      title="Social Preview"
      description="How your link looks when shared on Twitter, LinkedIn, and Discord."
      defaultOpen={false}
    >
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Twitter / X
        </p>
        <div className="overflow-hidden rounded-2xl border border-border">
          <PreviewImage image={image} aspect="aspect-[1.91/1]" />
          <div className="space-y-1 bg-background p-3">
            <p className="line-clamp-1 text-sm font-semibold text-foreground">{title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground/70">{APP_DOMAIN}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          LinkedIn
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <PreviewImage image={image} aspect="aspect-[1.91/1]" />
          <div className="space-y-1 bg-muted/40 p-3">
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{APP_DOMAIN}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Discord
        </p>
        <div className="flex gap-3 rounded-lg border-l-4 border-primary/60 bg-muted/30 p-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] text-muted-foreground">{APP_DOMAIN}</p>
            <p className="line-clamp-1 text-sm font-semibold text-primary">{title}</p>
            <p className="line-clamp-3 text-xs text-muted-foreground">{description}</p>
          </div>
          {image ? (
            <img src={image} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5">
              <Rocket className="h-6 w-6 text-primary/50" />
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
