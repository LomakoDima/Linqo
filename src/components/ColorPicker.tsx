import { Check, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BANNER_STYLES, type BannerStyle } from "@/lib/link-store";

const MOODY_KEYS = (Object.keys(BANNER_STYLES) as BannerStyle[]).filter(
  (k) => BANNER_STYLES[k].kind === "moody",
);
const GRADIENT_KEYS = (Object.keys(BANNER_STYLES) as BannerStyle[]).filter(
  (k) => BANNER_STYLES[k].kind === "gradient",
);

/**
 * A trigger swatch that opens a popover of curated solid/gradient styles —
 * same BANNER_STYLES palette used for banner colors, just condensed behind
 * one button instead of two permanently-expanded grids.
 */
export function ColorPicker({
  value,
  onChange,
}: {
  value: BannerStyle;
  onChange: (style: BannerStyle) => void;
}) {
  const current = BANNER_STYLES[value] ?? BANNER_STYLES.dark;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 hover:border-muted-foreground/30 hover:bg-muted/50 active:scale-[0.98]"
        >
          <span
            className={`h-6 w-9 shrink-0 rounded-md ring-1 ring-black/10 ${current.gradient}`}
          />
          <span className="font-medium">{current.label}</span>
          <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Solid &amp; moody
            </Label>
            <div className="flex flex-wrap gap-2">
              {MOODY_KEYS.map((k) => (
                <ColorSwatch
                  key={k}
                  styleKey={k}
                  active={value === k}
                  onSelect={() => onChange(k)}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Gradient
            </Label>
            <div className="flex flex-wrap gap-2">
              {GRADIENT_KEYS.map((k) => (
                <ColorSwatch
                  key={k}
                  styleKey={k}
                  active={value === k}
                  onSelect={() => onChange(k)}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorSwatch({
  styleKey,
  active,
  onSelect,
}: {
  styleKey: BannerStyle;
  active: boolean;
  onSelect: () => void;
}) {
  const s = BANNER_STYLES[styleKey];
  return (
    <button
      type="button"
      onClick={onSelect}
      title={s.label}
      aria-label={s.label}
      className={`relative h-9 w-9 shrink-0 cursor-pointer rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${s.gradient} ${
        active
          ? "ring-2 ring-primary ring-offset-2 ring-offset-popover"
          : "ring-1 ring-border hover:ring-muted-foreground/40"
      }`}
    >
      {active && (
        <Check
          className={`absolute inset-0 m-auto h-4 w-4 drop-shadow ${s.light ? "text-neutral-900" : "text-white"}`}
        />
      )}
    </button>
  );
}
