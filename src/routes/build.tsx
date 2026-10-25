import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Eye, Copy, HelpCircle, Music2, Loader2, Smartphone } from "lucide-react";
import {
  THEMES,
  MUSIC_GENRES,
  defaultProfile,
  loadProfile,
  saveProfile,
  imageFieldDisplay,
  type AmbientSettings,
  type ParticleSettings,
  type LinkBlock,
  type LinkBlockType,
  type MusicGenre,
  type MusicSettings,
  type Profile,
  type ThemeName,
} from "@/lib/link-store";
import { BLOCK_REGISTRY } from "@/lib/block-registry/registry";
import { createBlockFromEntry, duplicateBlock } from "@/lib/block-registry/block-factory";
import { useBlockDragDrop } from "@/lib/block-dnd/useBlockDragDrop";
import { instantiateTemplate, type Template } from "@/lib/templates";
import { TemplatesHub } from "@/components/templates-hub/TemplatesHub";
import { fileToResizedDataUrl } from "@/lib/image";
import { copyToClipboard } from "@/lib/clipboard";
import { LinkPreview } from "@/components/LinkPreview";
import { SegmentedToggle } from "@/components/BlockEditor";
import { BlockRenderer } from "@/components/block-editor/BlockRenderer";
import { InsertGap } from "@/components/block-editor/InsertGap";
import { ContentEmptyState } from "@/components/block-editor/ContentEmptyState";
import { BlockLibrary } from "@/components/block-library/BlockLibrary";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { blockEntryVariants } from "@/lib/block-motion/variants";
import { MediaLinkPicker } from "@/components/MediaLinkPicker";
import { AudioPreviewPlayer } from "@/components/AudioPreviewPlayer";
import { GenrePlaylistModal } from "@/components/GenrePlaylistModal";
import { SectionCard } from "@/components/ui/section-card";
import { VisualizerModule } from "@/components/atmosphere-tab/VisualizerModule";
import { AmbientSoundsModule } from "@/components/atmosphere-tab/AmbientSoundsModule";
import { ParticlesModule } from "@/components/atmosphere-tab/ParticlesModule";
import { SettingSlider } from "@/components/atmosphere-tab/AtmosphereControls";
import { FutureEffectsPlaceholderCard } from "@/components/atmosphere-tab/FutureEffectsPlaceholderCard";
import { PublishHub } from "@/components/publish-hub/PublishHub";
import { ProfileHub } from "@/components/profile-hub/ProfileHub";
import { AppearanceHub } from "@/components/appearance-hub/AppearanceHub";
import { publishProfile, uploadMusicTrack, getMyProfile } from "@/lib/publish";
import { GuideTour } from "@/components/GuideTour";
import { BUILDER_TOUR_SEEN_KEY, createBuilderTour } from "@/lib/builder-tour";
import { BrandMark } from "@/components/brand/BrandMark";
import { BuilderSectionHeader } from "@/components/BuilderSectionHeader";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "@/components/UserMenu";

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
      { title: "Linqo — Build your personal page, without code" },
      {
        name: "description",
        content: "Build your personal page in a minute. Beautiful themes, socials, live preview.",
      },
      { property: "og:title", content: "Linqo — Build your personal page, without code" },
      {
        property: "og:description",
        content: "Build your personal page in a minute.",
      },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [ready, setReady] = useState(false);
  const [ownedProfileChecked, setOwnedProfileChecked] = useState(false);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
  const [myOwnedSlug, setMyOwnedSlug] = useState<string | null>(null);
  const [musicUploading, setMusicUploading] = useState(false);
  const [openGenre, setOpenGenre] = useState<MusicGenre | null>(null);
  const [activeTab, setActiveTab] = useState("content");
  const [tourActive, setTourActive] = useState(false);
  const tourReturnTab = useRef("content");
  const blockNodeRefs = useRef(new Map<string, HTMLDivElement>());
  const blockRectsRef = useRef(new Map<string, DOMRect>());

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { redirect: "/build" } });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
    try {
      if (!localStorage.getItem(BUILDER_TOUR_SEEN_KEY)) setTourActive(true);
    } catch {
      // Storage may be unavailable; the tour still works for this visit.
      setTourActive(true);
    }
  }, []);

  // Once signed in, the account's own saved page (if any) replaces whatever
  // local draft/default was just loaded above — the server copy is the real
  // one now, the local draft was only ever a same-browser convenience.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyProfile().then((mine) => {
      if (cancelled) return;
      if (mine) {
        setProfile(mine.profile);
        setLastPublishedAt(mine.updatedAt);
        setMyOwnedSlug(mine.slug);
      } else {
        // Onboarding's "pick a vibe" question, consumed once — only when
        // there's no real saved page yet to override, and cleared right
        // away so it can never reapply on a later visit.
        const suggestedTheme = sessionStorage.getItem("linqo_suggested_theme");
        if (suggestedTheme) {
          sessionStorage.removeItem("linqo_suggested_theme");
          setProfile((p) => ({ ...p, theme: suggestedTheme as ThemeName }));
        }
      }
      setOwnedProfileChecked(true);
    });
    return () => {
      cancelled = true;
    };
    // Keyed on the id, not the whole `user` object — react-query hands back
    // a new object on every background refetch even when nothing actually
    // changed, which would otherwise re-fetch and stomp on in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const closeTour = () => {
    setTourActive(false);
    setActiveTab(tourReturnTab.current);
    try {
      localStorage.setItem(BUILDER_TOUR_SEEN_KEY, "1");
    } catch {
      /* Session-only in restricted browsers. */
    }
  };
  const startTour = () => {
    tourReturnTab.current = activeTab;
    setTourActive(true);
  };
  const tourSteps = useMemo(() => createBuilderTour(setActiveTab), []);

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

  const updateAmbient = (patch: Partial<AmbientSettings>) =>
    setProfile((p) => ({ ...p, ambient: { enabled: false, ...p.ambient, ...patch } }));

  const updateParticles = (patch: Partial<ParticleSettings>) =>
    setProfile((p) => ({ ...p, particles: { enabled: false, ...p.particles, ...patch } }));

  const handleAvatarFile = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 192, 0.8, 25_000);
      update({ avatar: dataUrl, avatarName: file.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that image");
    }
  };

  const handleCoverFile = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 640, 0.78, 50_000);
      update({ cover: dataUrl, coverName: file.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that image");
    }
  };

  const handleBgImageFile = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 1280, 0.72, 140_000);
      update({ bgImage: dataUrl, bgImageName: file.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that image");
    }
  };

  const handleMusicFile = async (file: File) => {
    if (!ACCEPTED_MUSIC_TYPES.includes(file.type)) {
      toast.error("Unsupported format — try MP3, WAV, OGG, or M4A");
      return;
    }
    setMusicUploading(true);
    try {
      const { url } = await uploadMusicTrack(profile.slug, file);
      updateMusic({ url });
    } catch (err) {
      console.error("Music upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't upload that track");
    } finally {
      setMusicUploading(false);
    }
  };

  // BlockFactory-backed — every block-creation path (this toolbar today,
  // the Block Library and Command Palette once they land) mints blocks the
  // same way. `atIndex` defaults to the end, matching today's append-only
  // behavior; Phase 3 passes a real gap index for inline insertion.
  const insertBlock = (type: LinkBlockType, atIndex?: number) => {
    const nb = createBlockFromEntry(BLOCK_REGISTRY[type]);
    setProfile((p) => {
      const index = atIndex ?? p.blocks.length;
      const blocks = [...p.blocks];
      blocks.splice(index, 0, nb);
      return { ...p, blocks };
    });
  };

  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  // Set while a template or theme tile is hovered/focused, or the template
  // preview modal is open — swaps what the phone shows without touching the
  // real `profile` state, so browsing is "try before you use", not a
  // committed change. Shared by Templates and Appearance.
  const [previewOverride, setPreviewOverride] = useState<Profile | null>(null);

  const doApplyTemplate = (t: Template) => {
    setProfile((p) => ({ ...p, theme: t.theme, blocks: instantiateTemplate(t), templateId: t.id }));
    setPreviewOverride(null);
    toast.success(`Applied "${t.name}" template`);
  };

  const requestApplyTemplate = (t: Template) => {
    if (profile.blocks.length > 0) {
      setPendingTemplate(t);
    } else {
      doApplyTemplate(t);
    }
  };

  // Leaving the Templates tab always drops any hover/preview override — the
  // phone should only ever diverge from `profile` while the visitor is
  // actually browsing templates.
  useEffect(() => {
    if (activeTab !== "templates" && activeTab !== "design") setPreviewOverride(null);
  }, [activeTab]);

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
  const duplicateBlockById = (id: string) =>
    setProfile((p) => {
      const i = p.blocks.findIndex((x) => x.id === id);
      if (i < 0) return p;
      const next = [...p.blocks];
      next.splice(i + 1, 0, duplicateBlock(p.blocks[i]));
      return { ...p, blocks: next };
    });

  // Reads/writes the exact same blockNodeRefs the FLIP effect below already
  // measures — a drag-commit reorder plays the identical settle animation
  // as a Move Up/Down click, just arriving at a different new order.
  const { draggingId, insertionIndex, getDragHandleProps } = useBlockDragDrop({
    blocks: profile.blocks,
    nodeRefs: blockNodeRefs,
    onReorder: (next) => setProfile((p) => ({ ...p, blocks: next })),
  });

  // Ephemeral — doesn't need to survive a reload. Absence from the set
  // means expanded; a newly-inserted block is never added to it, so it
  // starts expanded and ready to fill in.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const toggleCollapsed = (id: string) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The Block Library's open/target state — every entry point (the bottom
  // button, every InsertGap, the empty state, the `/` shortcut) calls
  // openLibrary with where it should insert. `null` means "append at
  // whatever the end turns out to be" and is resolved inside insertBlock's
  // own setProfile updater, not here — so this never needs profile.blocks
  // in its own closure and can't go stale.
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const openLibrary = (atIndex?: number) => {
    setInsertIndex(atIndex ?? null);
    setActiveTab("content");
    setLibraryOpen(true);
  };

  // Ctrl/Cmd+K opens the global Command Palette from anywhere, any tab,
  // even mid-typing (it's a modifier chord, not a character, so there's
  // nothing to hijack). `/` opens the Block Library specifically — jumping
  // to the Content tab first if that's not where the user already was, the
  // same way Notion's slash command isn't scoped to a particular pane — but
  // is skipped while typing in any editable field so it doesn't swallow a
  // literal "/" character.
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
        return;
      }
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
      if (isEditable) return;
      e.preventDefault();
      setInsertIndex(null);
      setActiveTab("content");
      setLibraryOpen(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Keep the live preview responsive while editing.
  const deferredProfile = useDeferredValue(profile);

  // Relative path: resolvable during SSR and immediately after hydration, with
  // no dependency on `window` or client mount timing — the Open/Preview links
  // below must never risk pointing at an empty or stale href.
  const sharePath = "/preview";

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
      const res = await publishProfile(profile.slug, JSON.stringify(profile));
      setLastPublishedAt(res.updatedAt);
      if (res.warnings?.length) toast.warning(res.warnings[0].message, { duration: 10_000 });
    } catch (err) {
      setPublishing(false);
      toast.error(err instanceof Error ? err.message : "Couldn't publish — try again in a moment");
      return;
    }
    setPublishing(false);
    if (await copyToClipboard(shortUrl)) {
      toast.success("Short link copied");
    } else {
      toast.error("Published, but couldn't copy — select and copy the link manually");
    }
  };

  // Nothing below this point should render for a signed-out visitor, even
  // for a frame — the redirect effect above fires, but effects run after
  // paint, so without this guard the full builder would flash empty/default
  // content first.
  if (authLoading || !user || !ownedProfileChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
            <div data-tour="brand" className="flex items-center gap-3">
              <BrandMark id="header-wordmark-target" />
              <span className="eyebrow hidden border-l border-border pl-3 lg:inline">Builder</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span data-tour="theme-toggle">
                <ThemeToggle />
              </span>
              <Button
                variant="ghost"
                size="icon"
                title="Take the tour"
                aria-label="Take the tour"
                data-tour="tour-launcher"
                onClick={startTour}
                className="hidden sm:inline-flex"
              >
                <HelpCircle />
              </Button>
              <UserMenu
                user={user}
                onStartTour={startTour}
                onSignOut={() => {
                  // No explicit redirect here — clearing the user drops
                  // `user` to null, and the auth-gate effect above already
                  // sends a signed-out visitor on this route to /login. A
                  // second navigate() here would just race that one.
                  void signOut();
                }}
              />
              <div data-tour="share-buttons" className="ml-1 flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyShortLink}
                  disabled={publishing}
                  aria-label="Publish and copy link"
                >
                  <Copy />{" "}
                  <span className="hidden sm:inline">
                    {publishing ? "Publishing…" : "Copy link"}
                  </span>
                </Button>
                <Button asChild size="sm">
                  <a href={sharePath} target="_blank" rel="noreferrer" aria-label="Open your page">
                    <Eye /> <span className="hidden sm:inline">Open</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[1fr_380px] lg:pb-10">
          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="templates" data-tour="tab-templates">
                  Templates
                </TabsTrigger>
                <TabsTrigger value="content" data-tour="tab-content">
                  Content
                </TabsTrigger>
                <TabsTrigger value="design" data-tour="tab-design">
                  Appearance
                </TabsTrigger>
                <TabsTrigger value="music" data-tour="tab-music">
                  Atmosphere
                </TabsTrigger>
                <TabsTrigger value="profile" data-tour="tab-profile">
                  Identity
                </TabsTrigger>
                <TabsTrigger value="share" data-tour="tab-publish">
                  Publish
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="mt-6">
                <TemplatesHub
                  profile={profile}
                  activeTemplateId={profile.templateId}
                  onUseTemplate={requestApplyTemplate}
                  onPreviewTemplate={setPreviewOverride}
                />
              </TabsContent>

              <TabsContent value="content" className="mt-6 space-y-10">
                <BuilderSectionHeader label="Content" title="Build your page, block by block.">
                  Add links, images and more. Arrange your blocks in the order you want visitors to
                  see them.
                </BuilderSectionHeader>
                <div className="space-y-4">
                  {profile.blocks.length === 0 ? (
                    <div data-tour="add-blocks">
                      <ContentEmptyState onAddBlock={() => openLibrary()} />
                    </div>
                  ) : (
                    <>
                      <InsertGap
                        onInsert={() => openLibrary(0)}
                        dropActive={draggingId !== null && insertionIndex === 0}
                      />
                      <AnimatePresence initial={false}>
                        {profile.blocks.map((b, i) => (
                          <motion.div
                            key={b.id}
                            variants={blockEntryVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <div
                              ref={(el) => {
                                if (el) blockNodeRefs.current.set(b.id, el);
                                else blockNodeRefs.current.delete(b.id);
                              }}
                              className={`reorder-item transition-opacity duration-150 ${
                                draggingId === b.id ? "opacity-40" : ""
                              }`}
                            >
                              <BlockRenderer
                                block={b}
                                onChange={updateBlock}
                                onDelete={() => removeBlock(b.id)}
                                onDuplicate={() => duplicateBlockById(b.id)}
                                onMove={(d) => moveBlock(b.id, d)}
                                canUp={i > 0}
                                canDown={i < profile.blocks.length - 1}
                                collapsed={collapsedIds.has(b.id)}
                                onToggleCollapse={() => toggleCollapsed(b.id)}
                                dragHandleProps={getDragHandleProps(b.id)}
                              />
                            </div>
                            <InsertGap
                              onInsert={() => openLibrary(i + 1)}
                              dropActive={draggingId !== null && insertionIndex === i + 1}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div data-tour="add-blocks" className="flex justify-center pt-1">
                        <Button
                          variant="outline"
                          className="w-full border-dashed"
                          onClick={() => openLibrary()}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Block
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="design" className="mt-6">
                <AppearanceHub
                  profile={profile}
                  update={update}
                  onUploadBgImage={handleBgImageFile}
                  setActiveTab={setActiveTab}
                  onPreviewProfile={setPreviewOverride}
                />
              </TabsContent>

              <TabsContent value="music" className="mt-6 space-y-10">
                <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                  Atmosphere
                </h2>
                <div className="space-y-4">
                  <SectionCard
                    icon={Music2}
                    title="Background Music"
                    layout="studio"
                    description="A track visitors can tap to play — never autoplays with sound."
                    headerAccessory={
                      <Switch
                        aria-label="Enable background music"
                        checked={profile.music?.enabled ?? false}
                        onCheckedChange={(checked) => updateMusic({ enabled: checked })}
                      />
                    }
                  >
                    {profile.music?.enabled ? (
                      <>
                        <div>
                          <Label className="mb-3 block">Pick a vibe</Label>
                          <div className="grid grid-cols-1 gap-3 @min-[360px]:grid-cols-2 @min-[600px]:grid-cols-3">
                            {(Object.keys(MUSIC_GENRES) as MusicGenre[]).map((g) => (
                              <MusicGenreCard
                                key={g}
                                genreKey={g}
                                active={(profile.music?.genre ?? "lofi") === g}
                                onSelect={() => setOpenGenre(g)}
                              />
                            ))}
                          </div>
                        </div>

                        <GenrePlaylistModal
                          genreKey={openGenre}
                          open={openGenre !== null}
                          onOpenChange={(o) => {
                            if (!o) setOpenGenre(null);
                          }}
                          onUseTrack={(g, url) => {
                            updateMusic({ genre: g, url });
                            setOpenGenre(null);
                          }}
                          onUseGenre={(g) => {
                            updateMusic({ genre: g });
                            setOpenGenre(null);
                          }}
                        />

                        <div>
                          <Label className="mb-3 block">Track</Label>
                          <MediaLinkPicker
                            value={profile.music?.url ?? ""}
                            displayLabel={
                              libraryTrackLabel(profile.music?.url) ?? profile.music?.url ?? ""
                            }
                            onUrlChange={(url) => updateMusic({ url })}
                            onUpload={handleMusicFile}
                            onClear={() => updateMusic({ url: undefined })}
                            accept="audio/*"
                            kind="audio"
                            uploading={musicUploading}
                            placeholder="Paste a link to an mp3 you host…"
                          />
                          <p className="mt-2 text-xs text-muted-foreground">
                            Upload a file (MP3, WAV, OGG, or M4A — a short loop works best) or link
                            to one you already host.
                          </p>
                          {profile.music?.url && <AudioPreviewPlayer src={profile.music.url} />}
                        </div>

                        <div className="grid items-center gap-6 border-t border-border pt-6 @min-[420px]:grid-cols-2">
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
                          <SettingSlider
                            label="Volume"
                            min={0}
                            max={100}
                            value={profile.music?.volume ?? 70}
                            display={`${profile.music?.volume ?? 70}%`}
                            onChange={(volume) => updateMusic({ volume })}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Turn on Background Music to pick a vibe and track.
                      </p>
                    )}
                  </SectionCard>

                  <VisualizerModule music={profile.music} updateMusic={updateMusic} />

                  <AmbientSoundsModule
                    ambient={profile.ambient}
                    updateAmbient={updateAmbient}
                    slug={profile.slug}
                    uploadTrack={uploadMusicTrack}
                  />

                  <ParticlesModule
                    particles={profile.particles}
                    updateParticles={updateParticles}
                  />

                  <FutureEffectsPlaceholderCard />
                </div>
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <ProfileHub
                  profile={profile}
                  update={update}
                  myOwnedSlug={myOwnedSlug}
                  onAvatarUpload={handleAvatarFile}
                  onCoverUpload={handleCoverFile}
                />
              </TabsContent>

              <TabsContent value="share" className="mt-6">
                <PublishHub
                  profile={profile}
                  update={update}
                  lastPublishedAt={lastPublishedAt}
                  onPublishSuccess={setLastPublishedAt}
                  shortUrl={shortUrl}
                  sharePath={sharePath}
                />
              </TabsContent>
            </Tabs>
          </div>

          <aside data-tour="preview" className="hidden lg:block">
            <LinkPreview profile={previewOverride ?? profile} framed />
          </aside>
        </div>

        {/* Below lg the phone column is hidden, so the preview lives behind
            this bar. It also surfaces the one quick-add the old floating
            button offered, but only where it makes sense (Content). */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/95 p-3 lg:hidden">
          {activeTab === "content" && (
            <Button variant="outline" className="flex-1" onClick={() => insertBlock("link")}>
              <Plus /> Add link
            </Button>
          )}
          <Button
            data-tour="mobile-preview"
            className="flex-1"
            onClick={() => setMobilePreviewOpen(true)}
          >
            <Smartphone /> Preview page
          </Button>
        </div>

        <Dialog open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
          <DialogContent className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-sm overflow-y-auto p-3 sm:max-w-sm">
            <DialogTitle className="sr-only">Page preview</DialogTitle>
            <DialogDescription className="sr-only">
              How your page looks right now, updating as you edit.
            </DialogDescription>
            <LinkPreview profile={previewOverride ?? profile} framed />
          </DialogContent>
        </Dialog>

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

        <BlockLibrary
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          onSelectBlock={(type) => insertBlock(type, insertIndex ?? undefined)}
          profile={profile}
          setActiveTab={setActiveTab}
        />

        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onSelectBlock={(type) => insertBlock(type)}
          setActiveTab={setActiveTab}
          onOpenLibrary={() => openLibrary()}
        />
      </div>
    </MotionConfig>
  );
}

// "Rainy Window · Lo-fi" for a bundled track instead of its raw file path.
function libraryTrackLabel(url: string | undefined): string | undefined {
  if (!url) return undefined;
  for (const g of Object.values(MUSIC_GENRES)) {
    const track = g.tracks?.find((t) => t.url === url);
    if (track) return `${track.label} · ${g.label}`;
  }
  return undefined;
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
      aria-pressed={active}
      className={`group min-w-0 cursor-pointer overflow-hidden rounded-lg text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "ring-1 ring-border hover:ring-muted-foreground/30"
      }`}
    >
      {g.image ? (
        <div className={`relative h-20 w-full overflow-hidden ${g.gradient}`}>
          <img
            src={g.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-3 bottom-2 text-white">
            <div className="text-sm font-semibold leading-tight">{g.label}</div>
            <div className="truncate text-[11px] text-white/75">{g.blurb}</div>
          </div>
        </div>
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
