import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LinkPreview } from "@/components/LinkPreview";
import { loadProfile, type Profile } from "@/lib/link-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [{ title: "Draft preview — Linqo" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: DraftPreview,
});

function DraftPreview() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!isLoading && !user) void navigate({ to: "/login", search: { redirect: "/preview" } });
    if (user) setProfile(loadProfile());
  }, [user, isLoading, navigate]);
  if (!user || !profile) return null;
  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2 text-xs text-muted-foreground">
        <span>Private draft preview</span>
        <Link to="/build" className="text-foreground underline underline-offset-4">
          Back to builder
        </Link>
      </div>
      <LinkPreview profile={profile} />
    </>
  );
}
