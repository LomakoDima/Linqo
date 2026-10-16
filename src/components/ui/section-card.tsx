import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { blockSpring } from "@/lib/block-motion/variants";

// The shared collapsible-card shell used across the builder's dashboard-style
// tabs (Atmosphere, Publish, ...) — icon, title, one-line description,
// expand/collapse chevron, soft shadow. Keeping this structural (one
// component every module reuses) rather than per-module styling is what
// keeps a tab reading as a set of mini editors instead of one long form.
export function SectionCard({
  icon: Icon,
  title,
  description,
  defaultOpen = true,
  deemphasized = false,
  deemphasizedHint,
  headerAccessory,
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
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card transition-opacity duration-150 ${
        deemphasized ? "opacity-70" : ""
      }`}
    >
      <div className="flex w-full items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-[0.9375rem] font-semibold tracking-tight">{title}</div>
            {description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </button>
        {headerAccessory}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-ui text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={blockSpring}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border/60 p-4 pt-4">
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
