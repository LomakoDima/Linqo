import { useState } from "react";
import { Globe, BellRing, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { toast } from "@/components/notifications";

const EXAMPLE_DOMAINS = ["yourname.com", "portfolio.dev", "john.me"];

// UI only, as asked — no waitlist backend exists, "Notify me" is a local
// confirmation, not a real signup. Static Coming Soon card naming the
// feature rather than pretending it's live.
export function DomainCard() {
  const [notified, setNotified] = useState(false);

  return (
    <SectionCard
      icon={Globe}
      title="Custom Domain"
      description="Use your own domain instead of linqo.app."
      defaultOpen={false}
      deemphasized
    >
      <Badge variant="secondary" className="w-fit">
        Coming Soon
      </Badge>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_DOMAINS.map((domain) => (
          <span
            key={domain}
            className="rounded-full border border-border bg-card/60 px-3 py-1.5 font-mono text-xs text-muted-foreground"
          >
            {domain}
          </span>
        ))}
      </div>

      <Button
        type="button"
        variant={notified ? "secondary" : "outline"}
        disabled={notified}
        onClick={() => {
          setNotified(true);
          toast.success("We'll let you know!");
        }}
      >
        {notified ? (
          <>
            <Check className="mr-2 h-4 w-4" /> We'll notify you
          </>
        ) : (
          <>
            <BellRing className="mr-2 h-4 w-4" /> Notify me
          </>
        )}
      </Button>
    </SectionCard>
  );
}
