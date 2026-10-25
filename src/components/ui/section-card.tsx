import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, type LucideIcon } from "lucide-react";

// Shared builder shell: the template library's typography, flat surfaces,
// thin borders and compact radius, with accessible collapsible controls.
export function SectionCard({
  icon: Icon,
  title,
  description,
  defaultOpen = true,
  deemphasized = false,
  deemphasizedHint,
  headerAccessory,
  layout = "default",
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  // Visually quieter (not hidden, not interaction-disabled) — e.g. the
  // Visualizer card while Background Music is off. Its controls still work;
  // they just don't have anything audible to reflect yet.
  deemphasized?: boolean;
  deemphasizedHint?: string;
  // Optional control rendered in the header row itself (e.g. an enable
  // Switch), to the left of the expand chevron.
  headerAccessory?: React.ReactNode;
  layout?: "default" | "studio";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div
      className={`@container overflow-hidden rounded-lg border border-border bg-card transition-opacity duration-150 ${
        deemphasized && layout !== "studio" ? "opacity-70" : ""
      }`}
    >
      <div
        className={`flex w-full items-center gap-3 p-5 ${layout === "studio" ? "flex-wrap sm:px-6" : ""}`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={contentId}
          className={`flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-ui text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${layout === "studio" ? "basis-24" : ""}`}
        >
          {layout !== "studio" && (
            <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-medium leading-tight">{title}</h3>
            {description && layout !== "studio" && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
        </button>
        {headerAccessory}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          aria-expanded={open}
          aria-controls={contentId}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-ui text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            id={contentId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            <div
              className={`border-t border-border p-5 ${layout === "studio" ? "space-y-6 sm:p-6" : "space-y-5"}`}
            >
              {layout === "studio" && description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              {deemphasized && deemphasizedHint && (
                <p className="rounded-ui bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {deemphasizedHint}
                </p>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
