import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Link as LinkIcon,
  Heading1,
  Share2,
  Contact,
  Image as ImageIcon,
  Eye,
  Copy,
  Rocket,
  LayoutPanelTop,
  LayoutTemplate,
  Upload,
  HelpCircle,
  Music2,
  Type,
} from "lucide-react";
import {
  THEMES,
  MUSIC_GENRES,
  defaultProfile,
  loadProfile,
  saveProfile,
  uid,
  encodeProfile,
  imageFieldDisplay,
  type CoverType,
  type LinkBlock,
  type MusicGenre,
  type MusicSettings,
  type Profile,
  type ThemeName,
} from "@/lib/link-store";
import { TEMPLATES, instantiateTemplate, type Template } from "@/lib/templates";
import { fileToResizedDataUrl } from "@/lib/image";
import { fileToBase64 } from "@/lib/audio";
import { LinkPreview } from "@/components/LinkPreview";
import { BlockEditor } from "@/components/BlockEditor";
import { ColorPicker } from "@/components/ColorPicker";
import { publishProfile, uploadMusicTrack } from "@/lib/publish";
import { GuideTour, type TourStep } from "@/components/GuideTour";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

const TOUR_SEEN_KEY = "linqo_tour_seen_v1";

const MAX_MUSIC_FILE_BYTES = 6_000_000;
const ACCEPTED_MUSIC_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
];

export const Route = createFileRoute("/build")({
  head: () => ({
    meta: [
      { title: "Linqo — the multi-link builder" },
      {
        name: "description",
        content: "Build your all-links page in a minute. Beautiful themes, socials, live preview.",
      },
      { property: "og:title", content: "Linqo — the multi-link builder" },
      {
        property: "og:description",
        content: "Build your all-links page in a minute.",
      },
    ],
  }),
  component: BuilderPage,
});

function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API can be unavailable or blocked (older/in-app webviews,
    // insecure context, missing permission) — fall back to the classic
    // textarea+execCommand trick instead of failing silently.
    return copyViaExecCommand(text);
  }
}

function BuilderPage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [ready, setReady] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [musicUploading, setMusicUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [tourActive, setTourActive] = useState(false);
  const blockNodeRefs = useRef(new Map<string, HTMLDivElement>());
  const blockRectsRef = useRef(new Map<string, DOMRect>());

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
    if (!localStorage.getItem(TOUR_SEEN_KEY)) setTourActive(true);
  }, []);

  const closeTour = () => {
    setTourActive(false);
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  };

  const tourSteps: TourStep[] = [
    {
      target: '[data-tour="brand"]',
      title: "Welcome to Linqo",
      body: "A quick tour of the builder, start to finish.",
    },
    {
      target: '[data-tour="theme-toggle"]',
      title: "Light or dark",
      body: "Switch the builder's own interface between light and dark. Your page's look is set separately, in the Design tab.",
    },
    {
      target: '[data-tour="tab-templates"]',
      title: "Start from a template",
      body: "Pick a ready-made layout and theme — or keep Standard, a blank canvas — then tweak it in Content and Design.",
      onBeforeShow: () => setActiveTab("templates"),
    },
    {
      target: '[data-tour="add-blocks"]',
      title: "Add content blocks",
      body: "Links, banners, headings, socials, contact info, and images — add as many as you like and reorder them.",
      onBeforeShow: () => setActiveTab("content"),
    },
    {
      target: '[data-tour="tab-design"]',
      title: "Pick a look",
      body: "Themes, banner colors and patterns, and an optional background image all live here.",
      onBeforeShow: () => setActiveTab("design"),
    },
    {
      target: '[data-tour="tab-music"]',
      title: "Add a soundtrack",
      body: "Turn on background music, pick a vibe, or upload your own track — it plays automatically for visitors.",
      onBeforeShow: () => setActiveTab("music"),
    },
    {
      target: '[data-tour="tab-profile"]',
      title: "Your details",
      body: "Set your username, name, bio, and avatar. The cover can be a photo or a solid/gradient color from the picker.",
      onBeforeShow: () => setActiveTab("profile"),
    },
    {
      target: '[data-tour="preview"]',
      title: "Live preview",
      body: "Every change shows up here instantly, exactly as visitors will see it.",
    },
    {
      target: '[data-tour="share-buttons"]',
      title: "Share your page",
      body: "Copy publishes your latest changes and copies your link — share it anywhere.",
    },
  ];

  useEffect(() => {
    if (ready) saveProfile(profile);
  }, [profile, ready]);

  // FLIP-animate block reordering (move up/down, delete, add): measure each
  // block's position before vs. after the list changes, then play the
  // difference back as a transform so blocks visibly slide into their new
  // slot instead of instantly snapping — only fires on actual order/count
  // changes, not on every keystroke inside a block's own fields.
  const blockOrderKey = profile.blocks.map((b) => b.id).join("|");
  useLayoutEffect(() => {
    const nodes = blockNodeRefs.current;
    const prevRects = blockRectsRef.current;
    const nextRects = new Map<string, DOMRect>();
    nodes.forEach((el, id) => nextRects.set(id, el.getBoundingClientRect()));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const moved: { el: HTMLDivElement; dy: number }[] = [];
    if (!reducedMotion) {
      nextRects.forEach((rect, id) => {
        const prev = prevRects.get(id);
        const el = nodes.get(id);
        if (!prev || !el) return;
        const dy = prev.top - rect.top;
        if (Math.abs(dy) >= 1) moved.push({ el, dy });
      });
    }

    if (moved.length > 0) {
      for (const { el, dy } of moved) {
        el.style.transition = "none";
        el.style.transform = `translateY(${dy}px)`;
      }
      // Force the browser to register that "from" position before the
      // transition comes back — changing transition-property and the value
      // it animates in the same tick can collapse straight to the end state
      // with no visible motion, so the re-enable happens next frame instead.
      void moved[0].el.offsetHeight;
      requestAnimationFrame(() => {
        for (const { el } of moved) {
          el.style.transition = "";
          el.style.transform = "";
        }
      });
    }

    blockRectsRef.current = nextRects;
  }, [blockOrderKey]);

  const update = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));

  const updateMusic = (patch: Partial<MusicSettings>) =>
    setProfile((p) => ({ ...p, music: { enabled: false, ...p.music, ...patch } }));

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 192, 0.8, 25_000);
      update({ avatar: dataUrl, avatarName: file.name });
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 640, 0.78, 50_000);
      update({ cover: dataUrl, coverName: file.name });
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const handleBgImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 1280, 0.72, 140_000);
      update({ bgImage: dataUrl, bgImageName: file.name });
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const handleMusicFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MUSIC_FILE_BYTES) {
      toast.error("That track is too big — keep it under 6MB (a short loop works best)");
      return;
    }
    if (!ACCEPTED_MUSIC_TYPES.includes(file.type)) {
      toast.error("Unsupported format — try MP3, WAV, OGG, or M4A");
      return;
    }
    setMusicUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadMusicTrack({
        data: { slug: profile.slug, base64, mimeType: file.type },
      });
      updateMusic({ url });
    } catch {
      toast.error("Couldn't upload that track");
    } finally {
      setMusicUploading(false);
    }
  };

  const addBlock = (type: LinkBlock["type"]) => {
    const nb: LinkBlock =
      type === "social"
        ? { id: uid(), type, socials: [{ kind: "instagram", url: "" }] }
        : type === "contact"
          ? { id: uid(), type, email: "", phone: "" }
          : type === "header"
            ? { id: uid(), type, title: "New heading" }
            : type === "image"
              ? { id: uid(), type, image: "", url: "" }
              : type === "text"
                ? { id: uid(), type, title: "" }
                : type === "banner"
                  ? {
                      id: uid(),
                      type: "banner",
                      title: "New banner",
                      subtitle: "",
                      url: "https://",
                      image: "",
                      bannerStyle: "ember",
                    }
                  : { id: uid(), type: "link", title: "New link", url: "https://" };
    setProfile((p) => ({ ...p, blocks: [...p.blocks, nb] }));
  };

  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);

  const doApplyTemplate = (t: Template) => {
    setProfile((p) => ({ ...p, theme: t.theme, blocks: instantiateTemplate(t), templateId: t.id }));
    toast.success(`Applied "${t.name}" template`);
  };

  const requestApplyTemplate = (t: Template) => {
    if (profile.blocks.length > 0) {
      setPendingTemplate(t);
    } else {
      doApplyTemplate(t);
    }
  };

  const updateBlock = (b: LinkBlock) =>
    setProfile((p) => ({ ...p, blocks: p.blocks.map((x) => (x.id === b.id ? b : x)) }));
  const removeBlock = (id: string) =>
    setProfile((p) => ({ ...p, blocks: p.blocks.filter((x) => x.id !== id) }));
  const moveBlock = (id: string, dir: -1 | 1) =>
    setProfile((p) => {
      const i = p.blocks.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.blocks.length) return p;
      const next = [...p.blocks];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, blocks: next };
    });

  // Encoding the profile (which can carry several megabytes of embedded
  // image data) is too heavy to redo synchronously on every keystroke —
  // deferring it keeps typing responsive and lets the share link catch up
  // a moment later.
  const deferredProfile = useDeferredValue(profile);

  // Relative path: resolvable during SSR and immediately after hydration, with
  // no dependency on `window` or client mount timing — the Open/Preview links
  // below must never risk pointing at an empty or stale href.
  const sharePath = useMemo(() => {
    return `/p/${deferredProfile.slug}#${encodeProfile(deferredProfile)}`;
  }, [deferredProfile]);

  // The short link (no embedded data) only resolves for anyone else once
  // the profile is actually saved server-side — publish right before
  // copying so the link is guaranteed live the moment it's shared.
  const shortUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${profile.slug}`
      : `/p/${profile.slug}`;
  const [publishing, setPublishing] = useState(false);

  const copyShortLink = async () => {
    setPublishing(true);
    try {
      await publishProfile({ data: { slug: profile.slug, json: JSON.stringify(profile) } });
    } catch {
      setPublishing(false);
      toast.error("Couldn't publish — try again in a moment");
      return;
    }
    setPublishing(false);
    if (await copyToClipboard(shortUrl)) {
      toast.success("Short link copied");
    } else {
      toast.error("Published, but couldn't copy — select and copy the link manually");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" data-tour="brand" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Rocket className="h-4 w-4" />
            </div>
            <AnimatedWordmark
              id="header-wordmark-target"
              text="Linqo."
              delay={120}
              className="text-lg font-semibold tracking-tight"
            />
            <span className="ml-2 hidden text-sm text-muted-foreground sm:inline">
              the multi-link builder
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span data-tour="theme-toggle">
              <ThemeToggle />
            </span>
            <Button
              variant="ghost"
              size="icon"
              title="Take the tour"
              onClick={() => setTourActive(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <div data-tour="share-buttons" className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyShortLink} disabled={publishing}>
                <Copy className="mr-2 h-4 w-4" /> {publishing ? "Publishing…" : "Copy"}
              </Button>
              <a href={sharePath} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <Eye className="mr-2 h-4 w-4" /> Open
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_380px]">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="templates" data-tour="tab-templates">
                Templates
              </TabsTrigger>
              <TabsTrigger value="content" data-tour="tab-content">
                Content
              </TabsTrigger>
              <TabsTrigger value="design" data-tour="tab-design">
                Design
              </TabsTrigger>
              <TabsTrigger value="music" data-tour="tab-music">
                Music
              </TabsTrigger>
              <TabsTrigger value="profile" data-tour="tab-profile">
                Profile
              </TabsTrigger>
              <TabsTrigger value="share" data-tour="tab-publish">
                Publish
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Start from a layout and theme, then customize it in Content and Design.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {TEMPLATES.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    active={(profile.templateId ?? "standard") === t.id}
                    onUse={() => requestApplyTemplate(t)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-6 space-y-4">
              <div data-tour="add-blocks" className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="animate-block-type-enter"
                  onClick={() => addBlock("link")}
                >
                  <LinkIcon className="mr-2 h-4 w-4" /> Link
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="animate-block-type-enter"
                  onClick={() => addBlock("banner")}
                >
                  <LayoutPanelTop className="mr-2 h-4 w-4" /> Banner
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="animate-block-type-enter"
                  onClick={() => addBlock("header")}
                >
                  <Heading1 className="mr-2 h-4 w-4" /> Heading
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="animate-block-type-enter"
                  onClick={() => addBlock("social")}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Socials
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="animate-block-type-enter"
                  onClick={() => addBlock("contact")}
                >
                  <Contact className="mr-2 h-4 w-4" /> Contact
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="animate-block-type-enter"
                  onClick={() => addBlock("image")}
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Image
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="animate-block-type-enter"
                  onClick={() => addBlock("text")}
                >
                  <Type className="mr-2 h-4 w-4" /> Text
                </Button>
              </div>

              <div className="space-y-3">
                {profile.blocks.map((b, i) => (
                  <div
                    key={b.id}
                    ref={(el) => {
                      if (el) blockNodeRefs.current.set(b.id, el);
                      else blockNodeRefs.current.delete(b.id);
                    }}
                    className="reorder-item"
                  >
                    <BlockEditor
                      block={b}
                      onChange={updateBlock}
                      onDelete={() => removeBlock(b.id)}
                      onMove={(d) => moveBlock(b.id, d)}
                      canUp={i > 0}
                      canDown={i < profile.blocks.length - 1}
                    />
                  </div>
                ))}
                {profile.blocks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Add your first block using the button above
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="design" className="mt-6 space-y-6">
              <div>
                <Label className="mb-3 block">Solid colors</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(Object.keys(THEMES) as ThemeName[])
                    .filter((name) => THEMES[name].kind === "solid")
                    .map((name) => (
                      <ThemeSwatch
                        key={name}
                        name={name}
                        active={profile.theme === name}
                        onSelect={() => update({ theme: name })}
                      />
                    ))}
                </div>
              </div>
              <div>
                <Label className="mb-3 block">Gradients</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(Object.keys(THEMES) as ThemeName[])
                    .filter((name) => THEMES[name].kind === "gradient")
                    .map((name) => (
                      <ThemeSwatch
                        key={name}
                        name={name}
                        active={profile.theme === name}
                        onSelect={() => update({ theme: name })}
                      />
                    ))}
                </div>
              </div>
              <div>
                <Label className="mb-3 block">Background image</Label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {profile.bgImage && (
                      <img
                        src={profile.bgImage}
                        alt="Background"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <Input
                    value={imageFieldDisplay(profile.bgImage ?? "", profile.bgImageName)}
                    onChange={(e) => update({ bgImage: e.target.value, bgImageName: undefined })}
                    placeholder="https://..."
                  />
                  <input
                    ref={bgImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBgImageFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => bgImageInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload
                  </Button>
                  {profile.bgImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => update({ bgImage: undefined, bgImageName: undefined })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Shown behind your theme's colors, with a dark overlay so text stays readable.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="music" className="mt-6 space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-4">
                <div>
                  <Label className="text-sm font-medium">Background music</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A floating "now playing" button visitors can tap to play a track — never
                    autoplays with sound.
                  </p>
                </div>
                <Switch
                  checked={profile.music?.enabled ?? false}
                  onCheckedChange={(checked) => updateMusic({ enabled: checked })}
                />
              </div>

              {profile.music?.enabled && (
                <>
                  <div>
                    <Label className="mb-3 block">Pick a vibe</Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(Object.keys(MUSIC_GENRES) as MusicGenre[]).map((g) => (
                        <MusicGenreCard
                          key={g}
                          genreKey={g}
                          active={(profile.music?.genre ?? "lofi") === g}
                          onSelect={() => updateMusic({ genre: g })}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Track</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        value={profile.music?.url ?? ""}
                        onChange={(e) => updateMusic({ url: e.target.value })}
                        placeholder="https://your-host.com/track.mp3"
                      />
                      <input
                        ref={musicInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleMusicFile}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={musicUploading}
                        onClick={() => musicInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {musicUploading ? "Uploading…" : "Upload"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Upload a file (MP3, WAV, OGG, or M4A — up to 6MB, a short loop works best) or
                      link to one you already host.
                    </p>
                    {profile.music?.url && (
                      <audio className="mt-3 w-full" controls src={profile.music.url} />
                    )}
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id="music-loop"
                        checked={profile.music?.loop ?? true}
                        onCheckedChange={(checked) => updateMusic({ loop: checked === true })}
                      />
                      <Label
                        htmlFor="music-loop"
                        className="cursor-pointer select-none text-sm font-normal"
                      >
                        Loop
                      </Label>
                    </div>
                    <div>
                      <Label className="mb-2.5 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Volume
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {profile.music?.volume ?? 70}%
                        </span>
                      </Label>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[profile.music?.volume ?? 70]}
                        onValueChange={([v]) => updateMusic({ volume: v })}
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-6 space-y-4">
              <div>
                <Label>Username (@slug)</Label>
                <Input
                  value={profile.slug}
                  onChange={(e) =>
                    update({ slug: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() })
                  }
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={profile.name} onChange={(e) => update({ name: e.target.value })} />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => update({ bio: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2.5 block">Cover</Label>
                <div className="mb-3 flex gap-2">
                  {(["image", "color"] as CoverType[]).map((k) => {
                    const active = (profile.coverType ?? "image") === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => update({ coverType: k })}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                          active
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {k === "image" ? "Photo" : "Color"}
                      </button>
                    );
                  })}
                </div>

                {(profile.coverType ?? "image") === "image" ? (
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {profile.cover && (
                        <img
                          src={profile.cover}
                          alt="Cover"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <Input
                      value={imageFieldDisplay(profile.cover, profile.coverName)}
                      onChange={(e) => update({ cover: e.target.value, coverName: undefined })}
                      placeholder="https://..."
                    />
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                  </div>
                ) : (
                  <ColorPicker
                    value={profile.coverStyle ?? "dark"}
                    onChange={(k) => update({ coverStyle: k })}
                  />
                )}
              </div>
              <div>
                <Label>Avatar</Label>
                <div className="flex items-center gap-3">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Avatar"
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {profile.name.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <Input
                    value={imageFieldDisplay(profile.avatar, profile.avatarName)}
                    onChange={(e) => update({ avatar: e.target.value, avatarName: undefined })}
                    placeholder="https://..."
                  />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="share" className="mt-6 space-y-4">
              <div>
                <Label>Short link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={shortUrl} />
                  <Button onClick={copyShortLink} disabled={publishing}>
                    <Copy className="mr-2 h-4 w-4" /> {publishing ? "Publishing…" : "Copy"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Saved to the server under your username — works for anyone, on any device. Copying
                  re-publishes your latest changes first.
                </p>
              </div>
              <a href={sharePath} target="_blank" rel="noreferrer" className="inline-block">
                <Button variant="secondary">
                  <Eye className="mr-2 h-4 w-4" /> Preview in new tab
                </Button>
              </a>
            </TabsContent>
          </Tabs>
        </div>

        <aside data-tour="preview" className="hidden lg:block">
          <LinkPreview profile={profile} framed />
        </aside>
      </div>

      <div className="fixed bottom-6 right-6 lg:hidden">
        <Button size="lg" onClick={() => addBlock("link")}>
          <Plus className="mr-2 h-4 w-4" /> Block
        </Button>
      </div>

      <AlertDialog
        open={pendingTemplate !== null}
        onOpenChange={(o) => !o && setPendingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your current blocks?</AlertDialogTitle>
            <AlertDialogDescription>
              Applying the "{pendingTemplate?.name}" template replaces all your blocks and theme.
              Your name, bio, and images stay untouched. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTemplate) doApplyTemplate(pendingTemplate);
                setPendingTemplate(null);
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GuideTour steps={tourSteps} active={tourActive} onFinish={closeTour} />
    </div>
  );
}

function TemplateCard({
  template,
  active,
  onUse,
}: {
  template: Template;
  active: boolean;
  onUse: () => void;
}) {
  const previewProfile: Profile = {
    slug: "you",
    name: "Your name",
    bio: "",
    avatar: "",
    cover: "",
    theme: template.theme,
    blocks: instantiateTemplate(template),
  };
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
      <div className="relative h-56 overflow-hidden bg-muted">
        <div className="absolute left-1/2 top-0 w-[320px] origin-top -translate-x-1/2 scale-[0.6]">
          <LinkPreview profile={previewProfile} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-1.5 font-medium">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            {template.name}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
        </div>
        <Button
          size="sm"
          variant={active ? "outline" : "default"}
          className="shrink-0"
          onClick={onUse}
          disabled={active}
        >
          {active ? "In use" : "Use"}
        </Button>
      </div>
    </div>
  );
}

function ThemeSwatch({
  name,
  active,
  onSelect,
}: {
  name: ThemeName;
  active: boolean;
  onSelect: () => void;
}) {
  const t = THEMES[name];
  return (
    <button
      onClick={onSelect}
      className={`overflow-hidden rounded-xl border-2 text-left transition ${
        active ? "border-primary" : "border-transparent"
      }`}
    >
      <div className={`${t.bg} p-4`}>
        <div className="mb-2 h-2 w-8 rounded bg-white/50" />
        <div className={`h-6 rounded ${t.card}`} />
        <div className={`mt-2 h-6 rounded ${t.card}`} />
      </div>
      <div className="bg-card px-3 py-2 text-sm font-medium">{t.label}</div>
    </button>
  );
}

function MusicGenreCard({
  genreKey,
  active,
  onSelect,
}: {
  genreKey: MusicGenre;
  active: boolean;
  onSelect: () => void;
}) {
  const g = MUSIC_GENRES[genreKey];
  const fg = g.light ? "text-neutral-900" : "text-white";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        active
          ? "ring-2 ring-primary ring-offset-2 shadow-md"
          : "ring-1 ring-border hover:ring-muted-foreground/30"
      }`}
    >
      {g.image ? (
        <img src={g.image} alt={`${g.label} — ${g.blurb}`} className="h-16 w-full object-cover" />
      ) : (
        <div className={`flex items-center gap-2.5 px-3 py-3 ${g.gradient}`}>
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${g.light ? "bg-black/10" : "bg-white/20"}`}
          >
            <Music2 className={`h-4 w-4 ${fg}`} />
          </span>
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${fg}`}>{g.label}</div>
            <div
              className={`truncate text-[11px] ${g.light ? "text-neutral-700" : "text-white/70"}`}
            >
              {g.blurb}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
