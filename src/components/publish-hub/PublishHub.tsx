import { useState } from "react";
import { toast } from "@/components/notifications";
import { copyToClipboard } from "@/lib/clipboard";
import type { Profile } from "@/lib/link-store";
import { YourPageCard } from "./YourPageCard";
import { SeoCard } from "./SeoCard";
import { SocialPreviewCard } from "./SocialPreviewCard";
import { ShareCard } from "./ShareCard";
import { QRCodeCard } from "./QRCodeCard";
import { AnalyticsCard } from "./AnalyticsCard";
import { DomainCard } from "./DomainCard";
import { PublishDialog } from "./PublishDialog";
import { SuccessDialog } from "./SuccessDialog";
import { ConfettiBurst } from "./ConfettiBurst";

// The Launch Center — orchestrates the Publish tab's stack of cards, plus
// the publish flow's two dialogs (PublishDialog's step animation and the
// SuccessDialog it hands off to). All of this state is ephemeral UI state
// owned right here — nothing outside the Publish tab needs it.
export function PublishHub({
  profile,
  update,
  lastPublishedAt,
  onPublishSuccess,
  shortUrl,
  sharePath,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  lastPublishedAt: string | null;
  onPublishSuccess: (updatedAt: string) => void;
  shortUrl: string;
  sharePath: string;
}) {
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handlePublishSuccess = (updatedAt: string) => {
    onPublishSuccess(updatedAt);
    setPublishDialogOpen(false);
    setShowConfetti(true);
    setSuccessDialogOpen(true);
  };

  const handleCopyLink = async () => {
    if (await copyToClipboard(shortUrl)) {
      toast.success("Link copied");
    } else {
      toast.error("Couldn't copy — select and copy the link manually");
    }
  };

  return (
    <div className="space-y-4">
      <YourPageCard
        shortUrl={shortUrl}
        sharePath={sharePath}
        lastPublishedAt={lastPublishedAt}
        publishing={publishDialogOpen}
        onPublish={() => setPublishDialogOpen(true)}
        onCopyLink={handleCopyLink}
      />
      <SeoCard profile={profile} updateSeo={update} />
      <SocialPreviewCard profile={profile} />
      <ShareCard profile={profile} shortUrl={shortUrl} />
      <QRCodeCard slug={profile.slug} shortUrl={shortUrl} />
      <AnalyticsCard />
      <DomainCard />

      <PublishDialog
        open={publishDialogOpen}
        profile={profile}
        onOpenChange={setPublishDialogOpen}
        onSuccess={handlePublishSuccess}
      />
      <SuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        profile={profile}
        shortUrl={shortUrl}
        sharePath={sharePath}
      />
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
    </div>
  );
}
