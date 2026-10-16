import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

const Tabs = TabsPrimitive.Root;

type Rect = { left: number; width: number; height: number };

// A single floating pill (not a static per-trigger background) that stretches
// like an elastic band across the gap between the outgoing and incoming tab,
// then snaps onto the target with a slight overshoot — measured off the real
// trigger elements (actual FLIP rects), not a guessed direction. The whole
// motion is one keyframe animation driven by --gooey-* custom properties set
// fresh before each replay, since a plain `left`/`width` transition can only
// interpolate between two points and can't produce the mid-flight stretch.
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const indicatorRef = React.useRef<HTMLSpanElement>(null);

  const settle = React.useCallback((): Rect | null => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    const active = list?.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (!list || !indicator || !active) return null;
    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const rect: Rect = {
      left: activeRect.left - listRect.left,
      width: activeRect.width,
      height: activeRect.height,
    };
    indicator.style.left = `${rect.left}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.height = `2px`;
    return { ...rect, height: 2 };
  }, []);

  React.useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    // First paint: snap into place, no stretch-in from the corner.
    indicator.style.transition = "none";
    settle();
    void indicator.offsetWidth;
    indicator.style.transition = "";

    const list = listRef.current;
    if (!list) return;

    const jump = () => {
      const from: Rect = {
        left: parseFloat(indicator.style.left) || 0,
        width: parseFloat(indicator.style.width) || 0,
        height: parseFloat(indicator.style.height) || 0,
      };
      const to = settle();
      if (!to) return;

      const stretchLeft = Math.min(from.left, to.left);
      const stretchRight = Math.max(from.left + from.width, to.left + to.width);

      indicator.style.setProperty("--gooey-from-left", `${from.left}px`);
      indicator.style.setProperty("--gooey-from-width", `${from.width}px`);
      indicator.style.setProperty("--gooey-from-height", `${from.height}px`);
      indicator.style.setProperty("--gooey-stretch-left", `${stretchLeft}px`);
      indicator.style.setProperty("--gooey-stretch-width", `${stretchRight - stretchLeft}px`);
      indicator.style.setProperty("--gooey-to-left", `${to.left}px`);
      indicator.style.setProperty("--gooey-to-width", `${to.width}px`);
      indicator.style.setProperty("--gooey-to-height", `${to.height}px`);

      indicator.classList.remove("animate-tab-gooey");
      void indicator.offsetWidth;
      indicator.classList.add("animate-tab-gooey");
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === "data-state")) jump();
    });
    observer.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] });

    window.addEventListener("resize", settle);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", settle);
    };
  }, [settle]);

  return (
    <TabsPrimitive.List
      ref={mergeRefs(ref, listRef)}
      className={cn(
        "relative flex h-11 w-full items-center justify-start gap-1 overflow-x-auto border-b border-border text-muted-foreground [scrollbar-width:none]",
        className,
      )}
      {...props}
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute bottom-0 rounded-full bg-foreground"
      />
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex h-11 shrink-0 animate-tab-enter items-center justify-center whitespace-nowrap rounded-t-ui px-3.5 text-sm font-medium cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:text-foreground hover:text-foreground",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// Radix's TabsContent always keeps every panel mounted (its Presence wrapper
// is passed a render-prop, which internally forces forceMount to true) and
// merely toggles the `hidden` attribute between tabs — so the CSS entrance
// animation below would otherwise only ever play once, on that panel's very
// first mount. Replaying it by hand on every data-state flip to "active" (the
// same remove/reflow/re-add trick TabsList uses for its gooey indicator) is
// what actually makes it fire on each switch.
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const replay = () => {
      if (node.dataset.state !== "active") return;
      node.classList.remove("animate-fade-in");
      void node.offsetWidth;
      node.classList.add("animate-fade-in");
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === "data-state")) replay();
    });
    observer.observe(node, { attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.Content
      ref={mergeRefs(ref, nodeRef)}
      className={cn("mt-2 animate-fade-in focus-visible:outline-none", className)}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
