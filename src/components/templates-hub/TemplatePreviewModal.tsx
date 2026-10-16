import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { THEMES, type Profile } from "@/lib/link-store";
import { TEMPLATE_CATEGORIES, previewProfileForTemplate, type Template } from "@/lib/templates";
import { LinkPreview } from "@/components/LinkPreview";
import { TemplateBadge } from "./TemplateBadge";

export function TemplatePreviewModal({
  template,
  profile,
  open,
  onOpenChange,
  onUse,
}: {
  template: Template | null;
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (t: Template) => void;
}) {
  // Keeps rendering the last-opened template while Radix plays the dialog's
  // own close animation — `template` itself already flips to null the
  // instant the modal starts closing (see TemplatesHub), which would
  // otherwise blank the content mid-animation.
  const [displayed, setDisplayed] = useState<Template | null>(null);
  useEffect(() => {
    if (template) setDisplayed(template);
  }, [template]);

  const previewProfile = useMemo(
    () => (displayed ? previewProfileForTemplate(profile, displayed) : null),
    [displayed, profile],
  );

  if (!displayed) return null;
  const t = displayed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="sr-only">{t.name} template preview</DialogTitle>
        <DialogDescription className="sr-only">{t.description}</DialogDescription>

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="mx-auto shrink-0">
            {previewProfile && <LinkPreview profile={previewProfile} framed />}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="eyebrow">{TEMPLATE_CATEGORIES[t.category].label}</span>
              {t.badges?.map((b) => (
                <TemplateBadge key={b} kind={b} />
              ))}
            </div>
            <div>
              <h2 className="font-display text-2xl font-medium leading-tight">{t.name}</h2>
              <p className="eyebrow mt-2">{t.tagline}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.description}</p>

            {!t.blank && (
              <p className="text-xs text-muted-foreground/70">
                {t.blocks.length} block{t.blocks.length === 1 ? "" : "s"} ·{" "}
                {THEMES[t.theme]?.label ?? t.theme} theme
              </p>
            )}

            <div className="mt-auto flex items-center gap-2 pt-4">
              <Button onClick={() => onUse(t)}>{t.blank ? "Start blank" : "Use template"}</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
