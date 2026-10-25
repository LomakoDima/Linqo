import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "@/components/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BANNER_PATTERNS,
  BANNER_STYLES,
  DIVIDER_ICON_NAMES,
  HEADING_SIZES,
  IMAGE_SHAPES,
  bannerPatternSize,
  bannerPatternUrl,
  imageFieldDisplay,
  normalizeBannerPattern,
  resolveTextRuns,
  uid,
  type BannerLayout,
  type BannerPattern,
  type BannerStyle,
  type CountdownStyle,
  type DividerStyle,
  type FaqDefaultOpen,
  type FaqItem,
  type GalleryLayout,
  type HeadingSize,
  type ImageShape,
  type LinkBlock,
  type QuoteStyle,
  type SocialKind,
  type TextRun,
  type TimelineItem,
  type VideoAspect,
} from "@/lib/link-store";
import { fileToResizedDataUrl } from "@/lib/image";
import { CONTENT_LIMITS } from "@/lib/content-safety";
import { IMAGE_ACCEPT } from "@/lib/file-safety";
import { withViewTransition } from "@/lib/view-transition";
import { HeadingFontPicker } from "@/components/HeadingFontPicker";
import { MediaLinkPicker } from "@/components/MediaLinkPicker";
import { getHeadingFont, loadGoogleFont } from "@/lib/fonts";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  Trash2,
  Plus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Star,
  Heart,
  Sun,
  Moon,
  Feather,
  X,
  type LucideIcon,
} from "lucide-react";

// Same finite icon set as LinkPreview.tsx's DIVIDER_ICONS — this is the
// picker side, that's the renderer side, both keyed by DIVIDER_ICON_NAMES
// (link-store.ts) so they can never drift out of sync silently.
const DIVIDER_ICON_COMPONENTS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  star: Star,
  heart: Heart,
  sun: Sun,
  moon: Moon,
  feather: Feather,
};

const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;
const isHexColor = (v: string | undefined): v is string => !!v && HEX_COLOR_RE.test(v);

const SOCIAL_KINDS: SocialKind[] = [
  "instagram",
  "telegram",
  "tiktok",
  "youtube",
  "twitter",
  "x",
  "threads",
  "facebook",
  "whatsapp",
  "discord",
  "twitch",
  "pinterest",
  "spotify",
  "dribbble",
  "figma",
  "slack",
  "linkedin",
  "github",
  "website",
];

// Field-only editor for a block's content — no outer card chrome, no
// move/delete/duplicate controls. That chrome now lives one layer up, in
// BlockRenderer/BlockToolbar (src/components/block-editor/), which mounts
// this for whichever block isn't currently collapsed. This split is
// deliberate: BlockRenderer owns "is this block expanded, and what happens
// when you drag/duplicate/delete it," this file only owns "what do this
// block's own fields look like."
export function BlockFieldsEditor({
  block,
  onChange,
}: {
  block: LinkBlock;
  onChange: (b: LinkBlock) => void;
}) {
  const handleBannerImageFile = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 960, 0.78, 55_000);
      onChange({ ...block, image: dataUrl, imageName: file.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that image");
    }
  };

  const handleImageBlockFile = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 960, 0.78, 55_000);
      onChange({ ...block, image: dataUrl, imageName: file.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that image");
    }
  };

  const handleGalleryFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const existing = block.galleryImages ?? [];
    if (existing.length + files.length > CONTENT_LIMITS.galleryImages) {
      toast.error("Use at most 20 gallery images per block");
      return;
    }
    const added: NonNullable<LinkBlock["galleryImages"]> = [];
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await fileToResizedDataUrl(file, 960, 0.78, 55_000);
        added.push({ id: uid(), image: dataUrl, imageName: file.name });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Couldn't read "${file.name}"`);
      }
    }
    if (added.length > 0) onChange({ ...block, galleryImages: [...existing, ...added] });
  };

  const updateTimelineItem = (index: number, item: TimelineItem) => {
    const items = [...(block.timelineItems ?? [])];
    items[index] = item;
    onChange({ ...block, timelineItems: items });
  };

  const updateFaqItem = (index: number, item: FaqItem) => {
    const items = [...(block.faqItems ?? [])];
    items[index] = item;
    onChange({ ...block, faqItems: items });
  };

  return (
    <>
      {block.type === "link" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input
              value={block.title ?? ""}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
              placeholder="My website"
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={block.url ?? ""}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
      )}

      {block.type === "banner" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input
                value={block.title ?? ""}
                onChange={(e) => onChange({ ...block, title: e.target.value })}
                placeholder="Project name"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={block.subtitle ?? ""}
                onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
                placeholder="Short description"
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={block.url ?? ""}
                onChange={(e) => onChange({ ...block, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Image</Label>
              <MediaLinkPicker
                value={block.image ?? ""}
                displayLabel={imageFieldDisplay(block.image ?? "", block.imageName)}
                thumbnailSrc={block.image || undefined}
                onUrlChange={(url) => onChange({ ...block, image: url, imageName: undefined })}
                onUpload={handleBannerImageFile}
                onClear={() => onChange({ ...block, image: undefined, imageName: undefined })}
                accept={IMAGE_ACCEPT}
                shape="wide"
              />
            </div>
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Banner layout
            </Label>
            <div className="flex gap-2">
              {(["horizontal", "vertical"] as BannerLayout[]).map((k) => {
                const active = (block.bannerLayout ?? "horizontal") === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      withViewTransition(() => onChange({ ...block, bannerLayout: k }))
                    }
                    className={`cursor-pointer rounded-ui px-3 py-1.5 text-sm capitalize transition-colors duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
          <BannerColorPicker block={block} onChange={onChange} />
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Banner pattern
            </Label>
            <BannerPatternPicker block={block} onChange={onChange} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Pattern opacity
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {block.bannerPatternOpacity ?? 70}%
                </span>
              </Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[block.bannerPatternOpacity ?? 70]}
                onValueChange={([v]) => onChange({ ...block, bannerPatternOpacity: v })}
              />
            </div>
            <div>
              <Label className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Pattern scale
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {block.bannerPatternScale ?? 100}%
                </span>
              </Label>
              <Slider
                min={50}
                max={200}
                step={5}
                value={[block.bannerPatternScale ?? 100]}
                onValueChange={([v]) => onChange({ ...block, bannerPatternScale: v })}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Transparency
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {block.bannerOpacity ?? 100}%
              </span>
            </Label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[block.bannerOpacity ?? 100]}
              onValueChange={([v]) => onChange({ ...block, bannerOpacity: v })}
            />
          </div>
          <div className="flex items-center gap-2.5 pt-1.5">
            <Checkbox
              id={`tall-banner-${block.id}`}
              checked={block.tall ?? false}
              onCheckedChange={(checked) =>
                withViewTransition(() => onChange({ ...block, tall: checked === true }))
              }
            />
            <Label
              htmlFor={`tall-banner-${block.id}`}
              className="text-sm font-normal cursor-pointer select-none"
            >
              Tall banner
            </Label>
          </div>
        </div>
      )}

      {block.type === "header" && (
        <div className="space-y-4">
          <div>
            <Label>Heading text</Label>
            <Input
              value={block.title ?? ""}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
              placeholder="My projects"
            />
          </div>

          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Font
            </Label>
            <HeadingFontPicker
              value={block.headingFont}
              onChange={(key) => onChange({ ...block, headingFont: key })}
            />
          </div>

          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Size
            </Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(HEADING_SIZES) as HeadingSize[]).map((k) => {
                const active = (block.headingSize ?? "sm") === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onChange({ ...block, headingSize: k })}
                    className={`cursor-pointer rounded-ui px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {HEADING_SIZES[k].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Color
              </span>
              <SegmentedToggle
                value={(block.headingUseGradient ?? false) ? "gradient" : "solid"}
                options={[
                  { value: "solid", label: "Solid" },
                  { value: "gradient", label: "Gradient" },
                ]}
                onChange={(mode) =>
                  onChange({
                    ...block,
                    headingUseGradient: mode === "gradient",
                    ...(mode === "gradient"
                      ? {
                          headingGradientFrom: block.headingGradientFrom ?? "#f97316",
                          headingGradientTo: block.headingGradientTo ?? "#ec4899",
                        }
                      : {}),
                  })
                }
              />
            </Label>
            {block.headingUseGradient ? (
              <div key="gradient" className="grid animate-swap-in grid-cols-2 gap-2">
                <ColorField
                  label="From"
                  value={block.headingGradientFrom}
                  onChange={(v) => onChange({ ...block, headingGradientFrom: v })}
                  fallback="#f97316"
                />
                <ColorField
                  label="To"
                  value={block.headingGradientTo}
                  onChange={(v) => onChange({ ...block, headingGradientTo: v })}
                  fallback="#ec4899"
                />
              </div>
            ) : (
              <div key="solid" className="animate-swap-in">
                <ColorField
                  value={block.headingColor}
                  onChange={(v) => onChange({ ...block, headingColor: v })}
                  fallback="#f97316"
                />
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Background
            </Label>
            <ColorField
              value={block.headingBgColor}
              onChange={(v) => onChange({ ...block, headingBgColor: v })}
              fallback="#1c1c22"
            />
          </div>

          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Style
            </Label>
            <div className="flex flex-wrap gap-2">
              <StyleToggle
                active={block.headingBold ?? false}
                onClick={() => onChange({ ...block, headingBold: !(block.headingBold ?? false) })}
                className="font-bold"
              >
                Bold
              </StyleToggle>
              <StyleToggle
                active={block.headingItalic ?? false}
                onClick={() =>
                  onChange({ ...block, headingItalic: !(block.headingItalic ?? false) })
                }
                className="italic"
              >
                Italic
              </StyleToggle>
              <StyleToggle
                active={block.headingUnderline ?? false}
                onClick={() =>
                  onChange({ ...block, headingUnderline: !(block.headingUnderline ?? false) })
                }
                className="underline underline-offset-4"
              >
                Underline
              </StyleToggle>
              <StyleToggle
                active={block.headingStrikethrough ?? false}
                onClick={() =>
                  onChange({
                    ...block,
                    headingStrikethrough: !(block.headingStrikethrough ?? false),
                  })
                }
                className="line-through"
              >
                Strikethrough
              </StyleToggle>
              <StyleToggle
                active={block.headingUppercase ?? true}
                onClick={() =>
                  onChange({ ...block, headingUppercase: !(block.headingUppercase ?? true) })
                }
              >
                Uppercase
              </StyleToggle>
            </div>
          </div>
        </div>
      )}

      {block.type === "contact" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactField
            label="Email"
            enabled={block.contactEmailEnabled ?? true}
            onToggle={(enabled) => onChange({ ...block, contactEmailEnabled: enabled })}
          >
            <Input
              type="email"
              value={block.email ?? ""}
              onChange={(e) => onChange({ ...block, email: e.target.value })}
              placeholder="you@example.com"
              disabled={!(block.contactEmailEnabled ?? true)}
            />
          </ContactField>
          <ContactField
            label="Phone"
            enabled={block.contactPhoneEnabled ?? true}
            onToggle={(enabled) => onChange({ ...block, contactPhoneEnabled: enabled })}
          >
            <Input
              type="tel"
              value={block.phone ?? ""}
              onChange={(e) => onChange({ ...block, phone: e.target.value })}
              placeholder="+1 234 567 8900"
              disabled={!(block.contactPhoneEnabled ?? true)}
            />
          </ContactField>
        </div>
      )}

      {block.type === "image" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Image</Label>
              <MediaLinkPicker
                value={block.image ?? ""}
                displayLabel={imageFieldDisplay(block.image ?? "", block.imageName)}
                thumbnailSrc={block.image || undefined}
                onUrlChange={(url) => onChange({ ...block, image: url, imageName: undefined })}
                onUpload={handleImageBlockFile}
                onClear={() => onChange({ ...block, image: undefined, imageName: undefined })}
                accept={IMAGE_ACCEPT}
                shape="wide"
              />
            </div>
            <div>
              <Label>Link (on click)</Label>
              <Input
                value={block.url ?? ""}
                onChange={(e) => onChange({ ...block, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Shape
            </Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(IMAGE_SHAPES) as ImageShape[]).map((k) => {
                const active = (block.imageShape ?? "rounded") === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onChange({ ...block, imageShape: k })}
                    className={`cursor-pointer rounded-ui px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {IMAGE_SHAPES[k].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Transparency
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {block.imageOpacity ?? 100}%
              </span>
            </Label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[block.imageOpacity ?? 100]}
              onValueChange={([v]) => onChange({ ...block, imageOpacity: v })}
            />
          </div>
        </div>
      )}

      {block.type === "text" && <TextBlockFields block={block} onChange={onChange} />}

      {block.type === "social" && (
        <div className="space-y-3">
          {(block.socials ?? []).map((s, i) => (
            <div key={i} className="flex gap-2">
              <Select
                value={s.kind}
                onValueChange={(val) => {
                  const next = [...(block.socials ?? [])];
                  next[i] = { ...s, kind: val as SocialKind };
                  onChange({ ...block, socials: next });
                }}
              >
                <SelectTrigger className="w-[130px] shrink-0">
                  <SelectValue placeholder="Social" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k.charAt(0).toUpperCase() + k.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                value={s.url}
                onChange={(e) => {
                  const next = [...(block.socials ?? [])];
                  next[i] = { ...s, url: e.target.value };
                  onChange({ ...block, socials: next });
                }}
                placeholder="https://..."
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = (block.socials ?? []).filter((_, j) => j !== i);
                  onChange({ ...block, socials: next });
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                socials: [...(block.socials ?? []), { kind: "instagram", url: "" }],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Social
          </Button>
        </div>
      )}

      {block.type === "divider" && (
        <div className="space-y-4">
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Style
            </Label>
            <SegmentedToggle<DividerStyle>
              value={block.dividerStyle ?? "solid"}
              options={[
                { value: "solid", label: "Solid" },
                { value: "dashed", label: "Dashed" },
                { value: "dotted", label: "Dotted" },
                { value: "icon", label: "Icon" },
              ]}
              onChange={(v) => onChange({ ...block, dividerStyle: v })}
            />
          </div>
          {(block.dividerStyle ?? "solid") === "icon" && (
            <div className="animate-swap-in">
              <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Icon
              </Label>
              <div className="flex flex-wrap gap-2">
                {DIVIDER_ICON_NAMES.map((name) => {
                  const Icon = DIVIDER_ICON_COMPONENTS[name];
                  const active = (block.dividerIcon ?? DIVIDER_ICON_NAMES[0]) === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onChange({ ...block, dividerIcon: name })}
                      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-ui transition-colors duration-150 ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Color
            </Label>
            <ColorField
              value={block.dividerColor}
              onChange={(v) => onChange({ ...block, dividerColor: v })}
              fallback="#8a8a8a"
            />
          </div>
          <div>
            <Label className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Opacity
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {block.dividerOpacity ??
                  (block.dividerColor || block.dividerStyle === "icon" ? 100 : 15)}
                %
              </span>
            </Label>
            <Slider
              aria-label="Divider opacity"
              min={0}
              max={100}
              step={1}
              value={[
                block.dividerOpacity ??
                  (block.dividerColor || block.dividerStyle === "icon" ? 100 : 15),
              ]}
              onValueChange={([v]) => onChange({ ...block, dividerOpacity: v })}
            />
          </div>
          {(block.dividerStyle ?? "solid") !== "icon" && (
            <div className="grid gap-3 sm:grid-cols-2 animate-swap-in">
              <div>
                <Label className="mb-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Width
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {block.dividerWidth ?? 100}%
                  </span>
                </Label>
                <Slider
                  min={25}
                  max={100}
                  step={5}
                  value={[block.dividerWidth ?? 100]}
                  onValueChange={([v]) => onChange({ ...block, dividerWidth: v })}
                />
              </div>
              <div>
                <Label className="mb-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Thickness
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {block.dividerThickness ?? 1}px
                  </span>
                </Label>
                <Slider
                  min={1}
                  max={4}
                  step={1}
                  value={[block.dividerThickness ?? 1]}
                  onValueChange={([v]) => onChange({ ...block, dividerThickness: v })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {block.type === "quote" && (
        <div className="space-y-4">
          <div>
            <Label>Quote</Label>
            <Textarea
              rows={3}
              value={block.quoteText ?? ""}
              onChange={(e) => onChange({ ...block, quoteText: e.target.value })}
              placeholder="Type a quote…"
            />
          </div>
          <div>
            <Label>Attribution</Label>
            <Input
              value={block.quoteAuthor ?? ""}
              onChange={(e) => onChange({ ...block, quoteAuthor: e.target.value })}
              placeholder="Someone, somewhere"
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Style
            </Label>
            <SegmentedToggle<QuoteStyle>
              value={block.quoteStyle ?? "plain"}
              options={[
                { value: "plain", label: "Plain" },
                { value: "card", label: "Card" },
                { value: "bigmark", label: "Big mark" },
              ]}
              onChange={(v) => onChange({ ...block, quoteStyle: v })}
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Alignment
            </Label>
            <SegmentedToggle
              value={block.quoteAlign ?? "center"}
              options={[
                { value: "left", label: "Left", icon: AlignLeft },
                { value: "center", label: "Center", icon: AlignCenter },
                { value: "right", label: "Right", icon: AlignRight },
              ]}
              onChange={(v) => onChange({ ...block, quoteAlign: v })}
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Color
            </Label>
            <ColorField
              value={block.quoteColor}
              onChange={(v) => onChange({ ...block, quoteColor: v })}
              fallback="#f97316"
            />
          </div>
        </div>
      )}

      {block.type === "gallery" && (
        <div className="space-y-4">
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Layout
            </Label>
            <SegmentedToggle<GalleryLayout>
              value={block.galleryLayout ?? "grid"}
              options={[
                { value: "grid", label: "Grid" },
                { value: "carousel", label: "Carousel" },
                { value: "masonry", label: "Masonry" },
              ]}
              onChange={(v) => onChange({ ...block, galleryLayout: v })}
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Shape
            </Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(IMAGE_SHAPES) as ImageShape[]).map((k) => {
                const active = (block.galleryShape ?? "rounded") === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onChange({ ...block, galleryShape: k })}
                    className={`cursor-pointer rounded-ui px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {IMAGE_SHAPES[k].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="mb-2.5 block">Images</Label>
            <div className="grid grid-cols-4 gap-2">
              {(block.galleryImages ?? []).map((img, i) => (
                <div
                  key={img.id}
                  className="group relative overflow-hidden rounded-ui border border-border"
                >
                  <img src={img.image} alt="" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...block,
                        galleryImages: (block.galleryImages ?? []).filter((_, j) => j !== i),
                      })
                    }
                    className="absolute right-1 top-1 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-ui border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground">
                <Plus className="h-5 w-5" />
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => handleGalleryFiles(e.target.files)}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {block.type === "video" && (
        <div className="space-y-4">
          <div>
            <Label>Video URL</Label>
            <Input
              value={block.videoUrl ?? ""}
              onChange={(e) => onChange({ ...block, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=…"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              A YouTube or Vimeo link, or a direct link to a video file.
            </p>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={block.videoTitle ?? ""}
              onChange={(e) => onChange({ ...block, videoTitle: e.target.value })}
              placeholder="My video"
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Aspect ratio
            </Label>
            <SegmentedToggle<VideoAspect>
              value={block.videoAspect ?? "16:9"}
              options={[
                { value: "16:9", label: "16:9" },
                { value: "9:16", label: "9:16" },
                { value: "1:1", label: "1:1" },
              ]}
              onChange={(v) => onChange({ ...block, videoAspect: v })}
            />
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox
              id={`video-autoplay-${block.id}`}
              checked={block.videoAutoplay ?? false}
              onCheckedChange={(checked) => onChange({ ...block, videoAutoplay: checked === true })}
            />
            <Label
              htmlFor={`video-autoplay-${block.id}`}
              className="cursor-pointer select-none text-sm font-normal"
            >
              Autoplay (muted)
            </Label>
          </div>
        </div>
      )}

      {block.type === "timeline" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {(block.timelineItems ?? []).map((item, i) => (
              <div key={item.id} className="space-y-2 rounded-ui border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Milestone {i + 1}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      onChange({
                        ...block,
                        timelineItems: (block.timelineItems ?? []).filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground transition-colors hover:text-destructive" />
                  </Button>
                </div>
                <Input
                  value={item.title}
                  onChange={(e) => updateTimelineItem(i, { ...item, title: e.target.value })}
                  placeholder="Title"
                />
                <Input
                  value={item.date ?? ""}
                  onChange={(e) => updateTimelineItem(i, { ...item, date: e.target.value })}
                  placeholder="Date (e.g. 2024)"
                />
                <Textarea
                  rows={2}
                  value={item.description ?? ""}
                  onChange={(e) => updateTimelineItem(i, { ...item, description: e.target.value })}
                  placeholder="Description"
                />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                timelineItems: [
                  ...(block.timelineItems ?? []),
                  { id: uid(), title: "New milestone" },
                ],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Milestone
          </Button>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Orientation
            </Label>
            <SegmentedToggle
              value={block.timelineOrientation ?? "vertical"}
              options={[
                { value: "vertical", label: "Vertical" },
                { value: "horizontal", label: "Horizontal" },
              ]}
              onChange={(v) => onChange({ ...block, timelineOrientation: v })}
            />
          </div>
        </div>
      )}

      {block.type === "countdown" && (
        <div className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input
              value={block.countdownLabel ?? ""}
              onChange={(e) => onChange({ ...block, countdownLabel: e.target.value })}
              placeholder="Counting down to"
            />
          </div>
          <div>
            <Label>Target date &amp; time</Label>
            <Input
              type="datetime-local"
              value={isoToDatetimeLocal(block.countdownTarget)}
              onChange={(e) =>
                onChange({ ...block, countdownTarget: datetimeLocalToIso(e.target.value) })
              }
            />
          </div>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Style
            </Label>
            <SegmentedToggle<CountdownStyle>
              value={block.countdownStyle ?? "digits"}
              options={[
                { value: "digits", label: "Digits" },
                { value: "words", label: "Words" },
              ]}
              onChange={(v) => onChange({ ...block, countdownStyle: v })}
            />
          </div>
          <div>
            <Label>Message when it's over</Label>
            <Input
              value={block.countdownExpiredMessage ?? ""}
              onChange={(e) => onChange({ ...block, countdownExpiredMessage: e.target.value })}
              placeholder="We're live!"
            />
          </div>
        </div>
      )}

      {block.type === "faq" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {(block.faqItems ?? []).map((item, i) => (
              <div key={item.id} className="space-y-2 rounded-ui border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Question {i + 1}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      onChange({
                        ...block,
                        faqItems: (block.faqItems ?? []).filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground transition-colors hover:text-destructive" />
                  </Button>
                </div>
                <Input
                  value={item.question}
                  onChange={(e) => updateFaqItem(i, { ...item, question: e.target.value })}
                  placeholder="Question"
                />
                <Textarea
                  rows={2}
                  value={item.answer}
                  onChange={(e) => updateFaqItem(i, { ...item, answer: e.target.value })}
                  placeholder="Answer"
                />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                faqItems: [
                  ...(block.faqItems ?? []),
                  { id: uid(), question: "New question", answer: "" },
                ],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Question
          </Button>
          <div>
            <Label className="mb-2.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Default state
            </Label>
            <SegmentedToggle<FaqDefaultOpen>
              value={block.faqDefaultOpen ?? "none"}
              options={[
                { value: "none", label: "Collapsed" },
                { value: "first", label: "First open" },
                { value: "all", label: "All open" },
              ]}
              onChange={(v) => onChange({ ...block, faqDefaultOpen: v })}
            />
          </div>
        </div>
      )}
    </>
  );
}

// `datetime-local` inputs want "YYYY-MM-DDTHH:mm" in the *browser's* local
// time, with no timezone suffix; countdownTarget is stored as a real ISO
// string (UTC-anchored) so it means the same instant no matter who's
// viewing the page. These two are the read/write halves of that
// conversion — round-tripping through `Date` handles the local-offset math
// so callers never touch it directly.
function isoToDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Swatch (native color-picker widget) + hex field + optional reset, reused
// for every heading color slot (solid, background, gradient from/to).
// A real segmented control — a sliding pill measures the active option's own
// box (via offsetLeft/offsetWidth) and glides to it, rather than each button
// just flipping its own background on click. Reuses the same "measure the
// real element, transition to it" approach as TabsList's indicator.
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: LucideIcon }[];
  onChange: (v: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const active = containerRef.current?.querySelector<HTMLElement>(`[data-value="${value}"]`);
    if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value, options]);

  return (
    <div ref={containerRef} className="relative flex w-fit gap-0.5 rounded-ui bg-muted/60 p-0.5">
      {indicator && (
        <div
          aria-hidden
          className="absolute inset-y-0.5 rounded-md bg-background transition-opacity duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-value={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`relative z-10 flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors duration-200 ${
            value === opt.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.icon && <opt.icon className="h-3.5 w-3.5" />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// A field the visitor-facing page can hide without losing the value —
// dims + disables its input when off, so it's obvious at a glance which
// contact methods are actually live, without erasing anything the user typed.
function ContactField({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`transition-opacity duration-200 ${enabled ? "" : "opacity-60"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={`Show ${label.toLowerCase()} on the page`}
        />
      </div>
      {children}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  fallback,
}: {
  label?: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  fallback: string;
}) {
  return (
    <div>
      {label && <Label className="mb-1.5 block text-[11px] text-muted-foreground">{label}</Label>}
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-10 shrink-0 overflow-hidden rounded-ui border border-border shadow-sm">
          <input
            type="color"
            value={isHexColor(value) ? value : fallback}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label ?? "Color"}
            className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer border-none p-0"
          />
        </div>
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="Theme default"
          className="flex-1 font-mono text-xs uppercase"
        />
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

function StyleToggle({
  active,
  onClick,
  className = "",
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-ui px-3.5 py-1.5 text-sm transition-colors duration-150 ${className} ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// Swaps in one size's Tailwind class, removing whichever other size class
// might already be on the span — classList.add alone would leave two
// conflicting font-size classes applied at once if a run's size is changed
// more than once before a new selection resets it.
function setSpanSizeClass(span: HTMLSpanElement, size: HeadingSize) {
  Object.values(HEADING_SIZES).forEach((s) => span.classList.remove(s.className));
  span.classList.add(HEADING_SIZES[size].className);
}

// Builds one DOM node for a run's content, carrying only the overrides that
// run actually has (as both a `data-*` attribute — the trusted signal
// domToRuns reads back — and an inline style/className for how it actually
// looks while editing).
function buildRunNode(run: TextRun): Node {
  if (run.text === "\n") return document.createElement("br");
  const hasOverride =
    run.font ||
    run.color ||
    run.size ||
    run.bold !== undefined ||
    run.italic !== undefined ||
    run.underline !== undefined ||
    run.strikethrough !== undefined;
  if (!hasOverride) return document.createTextNode(run.text);
  const span = document.createElement("span");
  if (run.font) {
    span.dataset.font = run.font;
    span.style.fontFamily = getHeadingFont(run.font).family;
  }
  if (run.color) {
    span.dataset.color = run.color;
    span.style.color = run.color;
  }
  if (run.size) {
    span.dataset.size = run.size;
    setSpanSizeClass(span, run.size);
  }
  if (run.bold !== undefined) {
    span.dataset.bold = String(run.bold);
    span.style.fontWeight = run.bold ? "700" : "400";
  }
  if (run.italic !== undefined) {
    span.dataset.italic = String(run.italic);
    span.style.fontStyle = run.italic ? "italic" : "normal";
  }
  if (run.underline !== undefined) span.dataset.underline = String(run.underline);
  if (run.strikethrough !== undefined) span.dataset.strike = String(run.strikethrough);
  if (run.underline !== undefined || run.strikethrough !== undefined) {
    const parts = [run.underline && "underline", run.strikethrough && "line-through"].filter(
      Boolean,
    );
    span.style.textDecorationLine = parts.length ? parts.join(" ") : "none";
  }
  span.appendChild(document.createTextNode(run.text));
  return span;
}

// Walks a "text" block's live contentEditable DOM back into plain TextRuns —
// the only things ever read off it are .textContent (safe, inert strings)
// and a span's `data-*` attributes (values we chose ourselves in
// buildRunNode/wrapSelection, never something pasted/typed content can
// forge), so no HTML the browser produced here is ever trusted or
// persisted, only plain text + our own style keys. Nested spans (from
// overlapping selections) cascade like CSS: an inner span's own attributes
// win, everything else inherits from the enclosing one.
function domToRuns(root: HTMLElement): TextRun[] {
  const runs: TextRun[] = [];
  const pushBreak = () => {
    if (runs.length > 0 && runs[runs.length - 1].text !== "\n") runs.push({ text: "\n" });
  };
  function walk(node: ChildNode, style: Omit<TextRun, "text">) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? "").split("\n");
      parts.forEach((part, i) => {
        if (part) runs.push({ text: part, ...style });
        if (i < parts.length - 1) pushBreak();
      });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      pushBreak();
      return;
    }
    let nextStyle = style;
    if (el.tagName === "SPAN") {
      nextStyle = { ...style };
      if (el.dataset.font) nextStyle.font = el.dataset.font;
      if (el.dataset.color) nextStyle.color = el.dataset.color;
      if (el.dataset.size) nextStyle.size = el.dataset.size as HeadingSize;
      if (el.dataset.bold) nextStyle.bold = el.dataset.bold === "true";
      if (el.dataset.italic) nextStyle.italic = el.dataset.italic === "true";
      if (el.dataset.underline) nextStyle.underline = el.dataset.underline === "true";
      if (el.dataset.strike) nextStyle.strikethrough = el.dataset.strike === "true";
    }
    Array.from(el.childNodes).forEach((child) => walk(child, nextStyle));
    if (el.tagName === "DIV" || el.tagName === "P") pushBreak();
  }
  Array.from(root.childNodes).forEach((child) => walk(child, {}));
  while (runs.length > 0 && runs[runs.length - 1].text === "\n") runs.pop();
  return runs;
}

type ActiveTextStyle = Omit<TextRun, "text">;

// Resolves what's actually applied right at the caret/selection — walking
// up from the given node through ancestor spans and taking the first (i.e.
// innermost, most specific) value set for each property — so the toolbar can
// show a button as pressed only when the text it's sitting in really has
// that formatting, not just because the block's own default happens to
// match.
function resolveStyleAtNode(node: Node | null, root: HTMLElement): ActiveTextStyle {
  const style: ActiveTextStyle = {};
  let el: HTMLElement | null = node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el) {
    if (el.tagName === "SPAN") {
      if (style.font === undefined && el.dataset.font) style.font = el.dataset.font;
      if (style.color === undefined && el.dataset.color) style.color = el.dataset.color;
      if (style.size === undefined && el.dataset.size) style.size = el.dataset.size as HeadingSize;
      if (style.bold === undefined && el.dataset.bold) style.bold = el.dataset.bold === "true";
      if (style.italic === undefined && el.dataset.italic)
        style.italic = el.dataset.italic === "true";
      if (style.underline === undefined && el.dataset.underline)
        style.underline = el.dataset.underline === "true";
      if (style.strikethrough === undefined && el.dataset.strike)
        style.strikethrough = el.dataset.strike === "true";
    }
    if (el === root) break;
    el = el.parentElement;
  }
  return style;
}

// The Text block's rich editor. Every property — font, color, size, style —
// applies to just the selected run when text is highlighted, exactly like
// Word: select a word, change one thing, and only that word changes.
// Without a selection, the same controls fall back to changing the whole
// block's own default. Align is the one exception, staying whole-block only,
// since alignment is a paragraph-level property even in Word.
function TextBlockFields({
  block,
  onChange,
}: {
  block: LinkBlock;
  onChange: (b: LinkBlock) => void;
}) {
  const editableRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  // What's actually applied right at the caret/current selection — drives
  // every toolbar button's pressed state, so clicking Bold on text that's
  // already bold turns it off, instead of the button only ever reflecting
  // the block's own default regardless of where you're actually standing.
  const [activeStyle, setActiveStyle] = useState<ActiveTextStyle>({});

  // Rebuilds the editable's DOM from the block's runs only when switching to
  // a different block — never when block.title/textRuns itself changes, or
  // every keystroke would reset the DOM (and the caret) out from under the
  // person typing. The live DOM is the source of truth while editing; this
  // effect only seeds it.
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    el.replaceChildren();
    for (const run of resolveTextRuns(block)) {
      el.appendChild(buildRunNode(run));
    }
    setActiveStyle({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  function syncFromDom() {
    const el = editableRef.current;
    if (!el) return;
    if ((el.textContent?.length ?? 0) > CONTENT_LIMITS.text) {
      el.textContent = el.textContent!.slice(0, CONTENT_LIMITS.text);
      toast.error("Use at most 10,000 characters per text block");
    }
    onChange({ ...block, textRuns: domToRuns(el), title: undefined });
  }

  function pastePlainText(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const el = editableRef.current;
    const selection = window.getSelection();
    if (!el || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const remaining = CONTENT_LIMITS.text - (el.textContent?.length ?? 0) + range.toString().length;
    const node = document.createTextNode(
      event.clipboardData.getData("text/plain").slice(0, Math.max(0, remaining)),
    );
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    syncFromDom();
  }

  // Tracks the caret/selection via `document`'s own selectionchange event
  // rather than this element's mouseup/keyup: a double- or triple-click's
  // word/paragraph selection is only finalized by the browser slightly
  // *after* its mouseup fires, so reading window.getSelection() inside a
  // mouseup handler can still see the old, collapsed selection from the
  // first click of the pair. selectionchange always fires once the
  // selection is actually settled, regardless of how it was made (click,
  // double/triple-click, drag, keyboard, or programmatic).
  useEffect(() => {
    function onSelectionChange() {
      const el = editableRef.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      setActiveStyle(resolveStyleAtNode(range.startContainer, el));
      if (sel.isCollapsed) return;
      savedRangeRef.current = range.cloneRange();
      // A fresh selection means any further property changes should start a
      // new run, not keep piling onto whatever was being edited before.
      pendingSpanRef.current = null;
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  // The span currently being built up for the active selection — reused
  // across several property changes in a row (e.g. picking a color, then
  // also toggling bold, without reselecting) instead of re-wrapping the
  // range each time. This also makes a single property survive a *stream*
  // of changes for the same selection, like the color field firing onChange
  // on every keystroke/drag: only the first call actually wraps the range;
  // every call after that just updates the same span in place.
  const pendingSpanRef = useRef<HTMLSpanElement | null>(null);

  // If text is highlighted, applies the given overrides to just that range
  // and returns true. Otherwise leaves the DOM untouched and returns false,
  // so the caller can fall back to a block-wide change.
  function applyToSelection(setAttrs: (span: HTMLSpanElement) => void): boolean {
    const pending = pendingSpanRef.current;
    if (pending && editableRef.current?.contains(pending)) {
      setAttrs(pending);
      syncFromDom();
      return true;
    }
    const range = savedRangeRef.current;
    const el = editableRef.current;
    if (!range || !el?.contains(range.commonAncestorContainer) || range.collapsed) return false;
    const span = document.createElement("span");
    setAttrs(span);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    savedRangeRef.current = null;
    pendingSpanRef.current = span;
    syncFromDom();
    return true;
  }

  function handleFontPick(key: string) {
    loadGoogleFont(key);
    const font = getHeadingFont(key);
    const applied = applyToSelection((span) => {
      span.dataset.font = key;
      span.style.fontFamily = font.family;
    });
    if (!applied) onChange({ ...block, textFont: key });
    setActiveStyle((s) => ({ ...s, font: key }));
  }

  function handleColorChange(color: string | undefined) {
    const applied =
      !!color &&
      applyToSelection((span) => {
        span.dataset.color = color;
        span.style.color = color;
      });
    if (!applied) onChange({ ...block, textColor: color });
    if (color) setActiveStyle((s) => ({ ...s, color }));
  }

  function handleSizePick(size: HeadingSize) {
    const applied = applyToSelection((span) => {
      span.dataset.size = size;
      setSpanSizeClass(span, size);
    });
    if (!applied) onChange({ ...block, textSize: size });
    setActiveStyle((s) => ({ ...s, size }));
  }

  function handleBoldToggle() {
    const next = !(activeStyle.bold ?? block.textBold ?? false);
    const applied = applyToSelection((span) => {
      span.dataset.bold = String(next);
      span.style.fontWeight = next ? "700" : "400";
    });
    if (!applied) onChange({ ...block, textBold: next });
    setActiveStyle((s) => ({ ...s, bold: next }));
  }

  function handleItalicToggle() {
    const next = !(activeStyle.italic ?? block.textItalic ?? false);
    const applied = applyToSelection((span) => {
      span.dataset.italic = String(next);
      span.style.fontStyle = next ? "italic" : "normal";
    });
    if (!applied) onChange({ ...block, textItalic: next });
    setActiveStyle((s) => ({ ...s, italic: next }));
  }

  function handleUnderlineToggle() {
    const next = !(activeStyle.underline ?? block.textUnderline ?? false);
    const applied = applyToSelection((span) => {
      span.dataset.underline = String(next);
      span.style.textDecorationLine = next ? "underline" : "none";
    });
    if (!applied) onChange({ ...block, textUnderline: next });
    setActiveStyle((s) => ({ ...s, underline: next }));
  }

  function handleStrikethroughToggle() {
    const next = !(activeStyle.strikethrough ?? block.textStrikethrough ?? false);
    const applied = applyToSelection((span) => {
      span.dataset.strike = String(next);
      span.style.textDecorationLine = next ? "line-through" : "none";
    });
    if (!applied) onChange({ ...block, textStrikethrough: next });
    setActiveStyle((s) => ({ ...s, strikethrough: next }));
  }

  const decorations = [
    block.textUnderline && "underline",
    block.textStrikethrough && "line-through",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <Label className="mb-1.5 block">Text</Label>
      <div className="overflow-hidden rounded-ui border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        {/* One toolbar for every property — font, size, style, align, color —
            sitting directly on top of the text it edits, like a real word
            processor, so it's never ambiguous what the controls apply to. */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
          <HeadingFontPicker
            value={activeStyle.font ?? block.textFont}
            onChange={handleFontPick}
            variant="compact"
          />

          <div className="flex items-center gap-0.5">
            {(Object.keys(HEADING_SIZES) as HeadingSize[]).map((k) => {
              const active = (activeStyle.size ?? block.textSize ?? "md") === k;
              return (
                <button
                  key={k}
                  type="button"
                  title={HEADING_SIZES[k].label}
                  aria-pressed={active}
                  onClick={() => handleSizePick(k)}
                  className={`h-8 cursor-pointer rounded-md px-2 text-xs font-semibold transition-colors duration-150 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {SIZE_ABBR[k]}
                </button>
              );
            })}
          </div>

          <ToolbarDivider />

          <ToolbarIconButton
            active={activeStyle.bold ?? block.textBold ?? false}
            onClick={handleBoldToggle}
            label="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            active={activeStyle.italic ?? block.textItalic ?? false}
            onClick={handleItalicToggle}
            label="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            active={activeStyle.underline ?? block.textUnderline ?? false}
            onClick={handleUnderlineToggle}
            label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            active={activeStyle.strikethrough ?? block.textStrikethrough ?? false}
            onClick={handleStrikethroughToggle}
            label="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarIconButton>

          <ToolbarDivider />

          <ToolbarIconButton
            active={(block.textAlign ?? "left") === "left"}
            onClick={() => onChange({ ...block, textAlign: "left" })}
            label="Align left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            active={block.textAlign === "center"}
            onClick={() => onChange({ ...block, textAlign: "center" })}
            label="Align center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            active={block.textAlign === "right"}
            onClick={() => onChange({ ...block, textAlign: "right" })}
            label="Align right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarIconButton>

          <ToolbarDivider />

          <TextColorToolbarButton
            value={activeStyle.color ?? block.textColor}
            onChange={handleColorChange}
          />
        </div>

        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromDom}
          onPaste={pastePlainText}
          onDrop={(event) => event.preventDefault()}
          role="textbox"
          aria-label="Text block content"
          aria-multiline="true"
          onBeforeInput={(event) => {
            const input = event.nativeEvent as InputEvent;
            if (
              input.inputType?.startsWith("insert") &&
              (editableRef.current?.textContent?.length ?? 0) >= CONTENT_LIMITS.text &&
              !window.getSelection()?.toString()
            )
              event.preventDefault();
          }}
          data-placeholder="Say something..."
          style={{
            fontFamily: getHeadingFont(block.textFont).family,
            color: block.textColor || undefined,
            textDecorationLine: decorations || undefined,
            textAlign: block.textAlign ?? "left",
          }}
          className={`min-h-[4.5rem] w-full px-3.5 py-3 leading-relaxed outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] ${
            HEADING_SIZES[block.textSize ?? "md"]?.className ?? "text-sm"
          } ${block.textBold ? "font-bold" : ""} ${block.textItalic ? "italic" : ""}`}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Highlight part of the text to style just that part — everything above applies to the
        selection first, and to the whole block otherwise.
      </p>
    </div>
  );
}

const SIZE_ABBR: Record<HeadingSize, string> = {
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
  "2xl": "2X",
};

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

function ToolbarIconButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md transition-colors duration-150 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// A circular swatch trigger (a conic-gradient "wheel" when no color has been
// chosen yet, the actual color once one has) that opens the same hex+native
// picker used elsewhere, kept compact enough to sit inline in the toolbar.
function TextColorToolbarButton({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Text color"
          aria-label="Text color"
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md transition-colors duration-150 hover:bg-accent"
        >
          <span
            className="h-4 w-4 rounded-full ring-1 ring-black/10"
            style={
              isHexColor(value)
                ? { backgroundColor: value }
                : {
                    backgroundImage:
                      "conic-gradient(from 0deg, #f97316, #ec4899, #8b5cf6, #0ea5e9, #22c55e, #f97316)",
                  }
            }
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <ColorField value={value} onChange={onChange} fallback="#ffffff" />
      </PopoverContent>
    </Popover>
  );
}

// A compact trigger (current swatch + name) that opens a popover holding
// the full picker — Presets vs Custom, and inside Custom, Solid vs Gradient
// — instead of sprawling every swatch permanently across the panel.
function BannerColorPicker({
  block,
  onChange,
}: {
  block: LinkBlock;
  onChange: (b: LinkBlock) => void;
}) {
  const usesCustom = block.bannerUseCustomColor ?? false;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Banner color
        </Label>
        <div className="flex items-center gap-2">
          {usesCustom && (
            <SegmentedToggle
              value={(block.bannerCustomUseGradient ?? false) ? "gradient" : "solid"}
              options={[
                { value: "solid", label: "Solid" },
                { value: "gradient", label: "Gradient" },
              ]}
              onChange={(mode) =>
                onChange({
                  ...block,
                  bannerCustomUseGradient: mode === "gradient",
                  ...(mode === "gradient"
                    ? {
                        bannerCustomGradientFrom: block.bannerCustomGradientFrom ?? "#f97316",
                        bannerCustomGradientTo: block.bannerCustomGradientTo ?? "#ec4899",
                      }
                    : {}),
                })
              }
            />
          )}
          <SegmentedToggle
            value={usesCustom ? "custom" : "preset"}
            options={[
              { value: "preset", label: "Presets" },
              { value: "custom", label: "Custom" },
            ]}
            onChange={(mode) => onChange({ ...block, bannerUseCustomColor: mode === "custom" })}
          />
        </div>
      </div>
      {usesCustom ? (
        <div key="custom" className="animate-swap-in space-y-3">
          {block.bannerCustomUseGradient ? (
            <div className="space-y-2">
              <ColorField
                label="From"
                value={block.bannerCustomGradientFrom}
                onChange={(v) => onChange({ ...block, bannerCustomGradientFrom: v })}
                fallback="#f97316"
              />
              <ColorField
                label="To"
                value={block.bannerCustomGradientTo}
                onChange={(v) => onChange({ ...block, bannerCustomGradientTo: v })}
                fallback="#ec4899"
              />
            </div>
          ) : (
            <ColorField
              value={block.bannerCustomColor}
              onChange={(v) => onChange({ ...block, bannerCustomColor: v })}
              fallback="#111114"
            />
          )}
        </div>
      ) : (
        <div key="preset" className="animate-swap-in">
          <BannerPresetSwatchPicker block={block} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// Just the preset swatch grid, tucked behind a compact trigger — the
// mode switch itself lives one level up, on BannerColorPicker's own header
// row, so it's visible without opening anything.
function BannerPresetSwatchPicker({
  block,
  onChange,
}: {
  block: LinkBlock;
  onChange: (b: LinkBlock) => void;
}) {
  const preset = BANNER_STYLES[block.bannerStyle ?? "dark"] ?? BANNER_STYLES.dark;
  // Picking a preset is a complete, one-shot choice — close right away, like
  // a native select.
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-ui border border-border bg-background px-3.5 py-2.5 text-left transition-colors hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2.5">
            <span
              className={`h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10 ${preset.gradient}`}
            />
            <span className="text-sm">{preset.label}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 max-h-96 space-y-3 overflow-y-auto p-3">
        <div>
          <Label className="mb-1.5 block text-[11px] text-muted-foreground">
            Solid &amp; moody
          </Label>
          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(BANNER_STYLES) as BannerStyle[])
              .filter((k) => BANNER_STYLES[k].kind === "moody")
              .map((k) => (
                <BannerStyleSwatch
                  key={k}
                  styleKey={k}
                  active={(block.bannerStyle ?? "dark") === k}
                  onSelect={() => {
                    onChange({ ...block, bannerStyle: k });
                    setOpen(false);
                  }}
                />
              ))}
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-[11px] text-muted-foreground">Gradient</Label>
          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(BANNER_STYLES) as BannerStyle[])
              .filter((k) => BANNER_STYLES[k].kind === "gradient")
              .map((k) => (
                <BannerStyleSwatch
                  key={k}
                  styleKey={k}
                  active={(block.bannerStyle ?? "dark") === k}
                  onSelect={() => {
                    onChange({ ...block, bannerStyle: k });
                    setOpen(false);
                  }}
                />
              ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Same compact trigger + popover treatment as BannerColorPicker, for the
// pattern swatch grid.
function BannerPatternPicker({
  block,
  onChange,
}: {
  block: LinkBlock;
  onChange: (b: LinkBlock) => void;
}) {
  const currentPattern = normalizeBannerPattern(block.bannerPattern);
  const current = BANNER_PATTERNS[currentPattern] ?? BANNER_PATTERNS.honeycomb;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-ui border border-border bg-background px-3.5 py-2.5 text-left transition-colors hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2.5">
            <span
              className="h-7 w-11 shrink-0 rounded-md bg-neutral-800 ring-1 ring-black/10"
              style={{
                backgroundImage: bannerPatternUrl(currentPattern, false),
                backgroundPosition: "center",
                backgroundRepeat: "repeat",
                backgroundSize: bannerPatternSize(currentPattern),
              }}
            />
            <span className="text-sm">{current.label}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-h-96 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(BANNER_PATTERNS) as BannerPattern[]).map((k) => {
            const p = BANNER_PATTERNS[k];
            const active = currentPattern === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  onChange({ ...block, bannerPattern: k });
                  setOpen(false);
                }}
                title={p.label}
                aria-label={p.label}
                aria-pressed={active}
                className={`relative h-10 w-full shrink-0 cursor-pointer rounded-md bg-neutral-800 transition-colors duration-150 ${
                  active
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "ring-1 ring-border hover:ring-foreground/50"
                }`}
                style={{
                  backgroundImage: bannerPatternUrl(k, false),
                  backgroundPosition: "center",
                  backgroundRepeat: "repeat",
                  backgroundSize: bannerPatternSize(k),
                }}
              >
                {active && (
                  <span className="animate-check-pop absolute inset-0 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white drop-shadow-sm" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BannerStyleSwatch({
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
      aria-pressed={active}
      className={`relative h-11 w-11 shrink-0 rounded-full cursor-pointer transition-colors duration-150 ${s.gradient} ${
        active
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "ring-1 ring-border hover:ring-foreground/50"
      }`}
    >
      {active && (
        <span className="animate-check-pop absolute inset-0 flex items-center justify-center">
          <Check
            className={`h-4 w-4 drop-shadow-sm ${s.light ? "text-black/70" : "text-white"}`}
            strokeWidth={3}
          />
        </span>
      )}
    </button>
  );
}
