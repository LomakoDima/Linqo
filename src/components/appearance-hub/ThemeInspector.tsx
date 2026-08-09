import { THEMES, type ThemeName } from "@/lib/link-store";
import { THEME_META } from "@/lib/theme-meta";

// Informational only, as asked — reflects whichever theme is currently
// applied (profile.theme), with no interaction of its own. Clicking a
// ThemeCard applies instantly, so there's no separate "previewing" state
// for this to track.
export function ThemeInspector({ theme: name }: { theme: ThemeName }) {
  const theme = THEMES[name];
  const meta = THEME_META[name];

  const rows: { label: string; swatch?: string; value: string }[] = [
    {
      label: "Background",
      swatch: theme.bg,
      value: theme.kind === "gradient" ? "Gradient" : "Solid",
    },
    { label: "Accent", swatch: `bg-current ${theme.accent}`, value: theme.accentHex },
    { label: "Buttons", swatch: theme.card, value: "Soft card" },
    { label: "Text", value: theme.light ? "Dark on light" : "Light on dark" },
    { label: "Border Radius", value: "Rounded (2xl)" },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span>{meta.emoji}</span>
        <span>{theme.label}</span>
      </div>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="flex items-center gap-1.5 font-medium text-foreground">
              {row.swatch && (
                <span className={`h-3.5 w-3.5 rounded-full ring-1 ring-border ${row.swatch}`} />
              )}
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
