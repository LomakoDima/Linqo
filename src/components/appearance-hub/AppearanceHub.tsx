import { useRef } from "react";
import type { Profile } from "@/lib/link-store";
import { AppearanceSidebar, type AppearanceSection } from "./AppearanceSidebar";
import { CustomizationCard } from "./CustomizationCard";
import { ThemeLibrary } from "./ThemeLibrary";
import { BackgroundSelector } from "./BackgroundSelector";
import { EffectsPanel } from "./EffectsPanel";
import { ComingSoonCard } from "./ComingSoonCard";
import { Type, Sliders } from "lucide-react";

const SECTIONS: AppearanceSection[] = [
  { id: "appearance", label: "Appearance" },
  { id: "theme-library", label: "Theme Library" },
  { id: "background", label: "Background" },
  { id: "effects", label: "Effects" },
  { id: "typography", label: "Typography" },
  { id: "advanced", label: "Advanced" },
];

// The Theme Studio — orchestrates the Appearance tab's stack of cards, plus
// the sticky chip-nav that jump-scrolls between them. Everything here
// writes through the same `update` shallow-merge setter every other
// builder tab already uses.
export function AppearanceHub({
  profile,
  update,
  onUploadBgImage,
  setActiveTab,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  onUploadBgImage: (file: File) => void | Promise<void>;
  setActiveTab: (tab: string) => void;
}) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <AppearanceSidebar sections={SECTIONS} onSelect={scrollToSection} />

      <div
        ref={(el) => {
          sectionRefs.current.appearance = el;
        }}
      >
        <CustomizationCard profile={profile} update={update} />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current["theme-library"] = el;
        }}
      >
        <ThemeLibrary profile={profile} update={update} />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.background = el;
        }}
      >
        <BackgroundSelector profile={profile} update={update} onUpload={onUploadBgImage} />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.effects = el;
        }}
      >
        <EffectsPanel profile={profile} update={update} setActiveTab={setActiveTab} />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.typography = el;
        }}
      >
        <ComingSoonCard
          icon={Type}
          title="Typography"
          description="Custom fonts and text styles for your whole page."
        />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.advanced = el;
        }}
      >
        <ComingSoonCard
          icon={Sliders}
          title="Advanced"
          description="Custom CSS and fine-grained layout controls."
        />
      </div>
    </div>
  );
}
