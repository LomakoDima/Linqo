import { createFileRoute } from "@tanstack/react-router";
import { LinkPreview } from "@/components/LinkPreview";
import { getPublishedProfile } from "@/lib/publish";

export const Route = createFileRoute("/p/$slug")({
  // Public pages only resolve content validated and saved by the API.
  loader: async ({ params }) => {
    const profile = await getPublishedProfile(params.slug);
    return { profile };
  },
  // Runs during SSR (loadMatches resolves this alongside the loader, before
  // <HeadContent /> renders in __root.tsx) as well as client nav — this is
  // what makes the tags below crawler-visible.
  head: ({ loaderData }) => {
    const profile = loaderData?.profile;
    if (!profile) {
      return {
        meta: [
          { title: "Linqo — Build your personal page, without code" },
          { name: "description", content: "Build your personal page, without code." },
        ],
      };
    }
    const title = profile.seoTitle || profile.name || profile.slug;
    const description =
      profile.seoDescription || profile.bio || `Check out @${profile.slug} on Linqo.`;
    const image = profile.ogImage;
    return {
      meta: [
        { title: `${title} — Linqo` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
    };
  },
  component: PublicPage,
});

function PublicPage() {
  const { profile } = Route.useLoaderData();
  if (!profile)
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-muted-foreground">
        This page is unavailable or has not been published.
      </main>
    );
  return <LinkPreview profile={profile} />;
}
