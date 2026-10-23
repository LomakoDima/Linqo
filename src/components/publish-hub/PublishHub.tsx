import { useState } from "react";
import { toast } from "@/components/notifications";
import { copyToClipboard } from "@/lib/clipboard";
import type { Profile } from "@/lib/link-store";
import { YourPageCard } from "./YourPageCard";
import { SeoCard } from "./SeoCard";
import { SocialPreviewCard } from "./SocialPreviewCard";
import { ShareCard } from "./ShareCard";
import { QRCodeCard } from "./QRCodeCard";
import { PublishDialog } from "./PublishDialog";
import { SuccessDialog } from "./SuccessDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Publication stays in view while secondary tools switch by task. The
// existing publish flow and success dialog remain owned by this panel.
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

  const handlePublishSuccess = (updatedAt: string) => {
    onPublishSuccess(updatedAt);
    setPublishDialogOpen(false);
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
    <div className="space-y-8">
      <YourPageCard
        shortUrl={shortUrl}
        sharePath={sharePath}
        lastPublishedAt={lastPublishedAt}
        publishing={publishDialogOpen}
        onPublish={() => setPublishDialogOpen(true)}
        onCopyLink={handleCopyLink}
      />
      <Tabs defaultValue="preview">
        <TabsList aria-label="Publishing tools">
          <TabsTrigger value="preview">Link preview</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
          <TabsTrigger value="qr">QR code</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="mt-6">
          <div className="grid items-start gap-6 sm:grid-cols-2">
            <SeoCard profile={profile} updateSeo={update} />
            <SocialPreviewCard profile={profile} />
          </div>
        </TabsContent>
        <TabsContent value="share" className="mt-6">
          <ShareCard profile={profile} shortUrl={shortUrl} />
        </TabsContent>
        <TabsContent value="qr" className="mt-6">
          <QRCodeCard slug={profile.slug} shortUrl={shortUrl} />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
