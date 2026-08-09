import { BarChart3, Eye, MousePointerClick, Percent, Users, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";

const STATS = [
  { label: "Views", icon: Eye },
  { label: "Clicks", icon: MousePointerClick },
  { label: "CTR", icon: Percent },
  { label: "Unique Visitors", icon: Users },
];

// Static for v1 — the point is to show what's coming and where it'll live,
// not to fake real numbers. No backend, no persisted state.
export function AnalyticsCard() {
  return (
    <SectionCard
      icon={BarChart3}
      title="Analytics"
      description="How your page is performing."
      defaultOpen={false}
      deemphasized
      deemphasizedHint="Analytics are coming soon — this is a preview of what's on the way."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card/60 p-4 text-center"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-bold text-muted-foreground/50">—</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> Top Referrers
          </div>
          <p className="text-xs text-muted-foreground/70">No data yet</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> Countries
          </div>
          <p className="text-xs text-muted-foreground/70">No data yet</p>
        </div>
      </div>

      <Badge variant="secondary" className="w-fit">
        Coming Soon
      </Badge>
    </SectionCard>
  );
}
