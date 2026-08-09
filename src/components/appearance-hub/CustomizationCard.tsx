import { Sliders, Circle, MousePointerClick, CloudDrizzle, Gauge } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ColorField } from "@/components/BlockEditor";
import { THEMES, type Profile } from "@/lib/link-store";

const COMING_SOON_ROWS = [
  { icon: Circle, label: "Corner Radius" },
  { icon: MousePointerClick, label: "Button Style" },
  { icon: CloudDrizzle, label: "Shadow" },
  { icon: Gauge, label: "Animation Speed" },
];

// Real Accent Color, plus the rest of the requested customization knobs as
// visible-but-inert "Coming Soon" rows — making them real would mean
// rewriting hardcoded corner-radius/shadow classes across every block type
// in LinkPreview, a much larger refactor than the rest of this feature, and
// the brief itself asks to keep customization minimal.
export function CustomizationCard({
  profile,
  update,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
}) {
  const theme = THEMES[profile.theme];

  return (
    <SectionCard icon={Sliders} title="Appearance" description="Fine-tune the details.">
      <ColorField
        label="Accent Color"
        value={profile.accentColor}
        onChange={(v) => update({ accentColor: v })}
        fallback={theme.accentHex}
      />

      <div className="space-y-2">
        {COMING_SOON_ROWS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3.5 py-2.5 opacity-60"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm text-muted-foreground">{label}</span>
            <Badge variant="secondary" className="text-[10px]">
              Coming Soon
            </Badge>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
