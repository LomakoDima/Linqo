// Hallmark · component: atmosphere controls · theme: existing Linqo Paper & Ink.
// Immediate local edits; upload loading/error states stay in MediaLinkPicker.
import { useId, type ReactNode } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const isHexColor = (value: string | undefined): value is string =>
  !!value && /^#[0-9a-f]{6}$/i.test(value);

export function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-3 text-sm font-medium">{label}</legend>
      {children}
    </fieldset>
  );
}

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex min-w-0 flex-wrap gap-1 rounded-ui border border-border p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-ui px-2 text-xs font-medium transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === option.value ? "bg-muted text-foreground" : "text-muted-foreground"}`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingSlider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <Label id={id}>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{display ?? value}</span>
      </div>
      <Slider.Root
        aria-labelledby={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        className="relative flex h-10 w-full touch-none select-none items-center"
      >
        <Slider.Track className="relative h-1 w-full grow rounded-full bg-border">
          <Slider.Range className="absolute h-full rounded-full bg-foreground" />
        </Slider.Track>
        <Slider.Thumb
          aria-labelledby={id}
          aria-valuetext={display ?? String(value)}
          className="block h-4 w-4 cursor-grab rounded-full border border-foreground bg-card ring-offset-card hover:bg-muted active:cursor-grabbing active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      </Slider.Root>
    </div>
  );
}

export function AccentControl({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value?: string;
  fallback: string;
  onChange: (value: string | undefined) => void;
}) {
  const id = useId();
  const invalid = !!value && !isHexColor(value);
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          aria-label={`Choose ${label.toLowerCase()}`}
          value={isHexColor(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-ui border border-border bg-transparent p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Input
          id={id}
          value={value ?? ""}
          placeholder="Theme default"
          maxLength={7}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="min-w-0 flex-1 font-mono text-xs"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="min-h-10 cursor-pointer rounded-ui px-2 text-xs text-muted-foreground hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reset
          </button>
        )}
      </div>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          Use a hex color, such as #f97316.
        </p>
      )}
    </div>
  );
}
