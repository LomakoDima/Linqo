import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";

// Shared shell for sections that are visible but not yet functional
// (Typography, Advanced) — same "Coming Soon" precedent as DomainCard in
// the Publish Hub, rather than hiding the section entirely.
export function ComingSoonCard({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <SectionCard
      icon={icon}
      title={title}
      description={description}
      defaultOpen={false}
      deemphasized
    >
      <Badge variant="secondary" className="w-fit">
        Coming Soon
      </Badge>
    </SectionCard>
  );
}
