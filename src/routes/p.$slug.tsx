import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LinkPreview } from "@/components/LinkPreview";
import { decodeProfile, loadProfile, defaultProfile, type Profile } from "@/lib/link-store";
import { getPublishedProfile } from "@/lib/publish";

export const Route = createFileRoute("/p/$slug")({
  // The URL fragment (the self-contained, no-backend link) never reaches the
  // server, so this only ever resolves a link created via Publish — the
  // client effect below still handles the fragment case on top of this.
  loader: async ({ params }) => {
    const profile = await getPublishedProfile(params.slug);
    return { profile };
  },
  // Runs during SSR (loadMatches resolves this alongside the loader, before
  // <HeadContent /> renders in __root.tsx) as well as client nav — this is
  // what makes the tags below crawler-visible, unlike the client-only
  // document.title effect below (which only covers the hash-fragment/local-
  // draft paths head() has no loaderData for).
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
  const { slug } = Route.useParams();
  const { profile: publishedProfile } = Route.useLoaderData();
  const [profile, setProfile] = useState<Profile | null>(publishedProfile);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const decoded = decodeProfile(hash);
      if (decoded) {
        setProfile(decoded);
        document.title = `@${decoded.slug} — Linqo`;
        return;
      }
    }
    if (publishedProfile) {
      setProfile(publishedProfile);
      document.title = `@${publishedProfile.slug} — Linqo`;
      return;
    }
    const local = loadProfile();
    if (local.slug === slug) {
      setProfile(local);
      document.title = `@${local.slug} — Linqo`;
    } else {
      setProfile({ ...defaultProfile, slug });
    }
  }, [slug, publishedProfile]);

  if (!profile) return null;
  return <LinkPreview profile={profile} />;
}
