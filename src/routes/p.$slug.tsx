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
    const profile = await getPublishedProfile({ data: { slug: params.slug } });
    return { profile };
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
