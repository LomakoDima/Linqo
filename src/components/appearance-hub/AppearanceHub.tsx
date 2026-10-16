import { useState } from "react";
import type { Profile } from "@/lib/link-store";
import { THEMES } from "@/lib/link-store";
import { ColorField } from "@/components/BlockEditor";
import { Button } from "@/components/ui/button";
import { ThemeLibrary } from "./ThemeLibrary";
import { BackgroundSelector } from "./BackgroundSelector";
import { EffectsPanel } from "./EffectsPanel";

// Appearance is three distinct jobs, in the order you do them: pick a whole
// theme, adjust its colour and backdrop, then add effects. Splitting them
// into panels (rather than one long stack of collapsible cards) keeps each
// job's controls next to the phone preview instead of a scroll away.
type Panel = "theme" | "colour" | "effects";

const PANELS: { id: Panel; label: string; hint: string }[] = [
  { id: "theme", label: "Theme", hint: "A complete look" },
  { id: "colour", label: "Colour & background", hint: "Accent and backdrop" },
  { id: "effects", label: "Effects", hint: "Glass, glow, grain" },
];

export function AppearanceHub({
  profile,
  update,
  onUploadBgImage,
  setActiveTab,
  onPreviewProfile,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  onUploadBgImage: (file: File) => void | Promise<void>;
  setActiveTab: (tab: string) => void;
  onPreviewProfile: (p: Profile | null) => void;
}) {
  const [panel, setPanel] = useState<Panel>("theme");
  const theme = THEMES[profile.theme];

  return (
    <div className="space-y-6">
      <div className="max-w-xl">
        <p className="eyebrow">Appearance</p>
        <h2 className="font-display mt-3 text-3xl font-medium leading-tight sm:text-4xl">
          How your page looks.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Current theme: <span className="font-medium text-foreground">{theme.label}</span>. Changes
          show in the preview straight away and save in this browser; Publish to update your live
          page.
        </p>
      </div>

      <div
        role="group"
        aria-label="Appearance sections"
        className="grid grid-cols-3 border-y border-border"
      >
        {PANELS.map((p) => {
          const active = panel === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPanel(p.id)}
              aria-pressed={active}
              className={`-mb-px cursor-pointer border-b-2 px-1 py-3 text-left transition-colors duration-150 sm:px-3 ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="block text-sm font-medium">{p.label}</span>
              <span className="eyebrow mt-1.5 hidden normal-case tracking-normal sm:block">
                {p.hint}
              </span>
            </button>
          );
        })}
      </div>

      {panel === "theme" && (
        <ThemeLibrary profile={profile} update={update} onPreviewProfile={onPreviewProfile} />
      )}

      {panel === "colour" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <ColorField
              label="Accent colour"
              value={profile.accentColor}
              onChange={(v) => update({ accentColor: v })}
              fallback={theme.accentHex}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Used for highlights, glow and animated effects. Defaults to the theme&rsquo;s own
                accent.
              </p>
              {profile.accentColor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ accentColor: undefined })}
                  className="shrink-0"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
          <BackgroundSelector profile={profile} update={update} onUpload={onUploadBgImage} />
        </div>
      )}

      {panel === "effects" && (
        <EffectsPanel profile={profile} update={update} setActiveTab={setActiveTab} />
      )}
    </div>
  );
}
