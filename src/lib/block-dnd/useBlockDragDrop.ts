import { useEffect, useRef, useState } from "react";
import type { LinkBlock } from "@/lib/link-store";

const AUTO_SCROLL_MARGIN_PX = 90;
const AUTO_SCROLL_SPEED_PX = 14;

export interface UseBlockDragDropOptions {
  blocks: LinkBlock[];
  // The SAME ref build.tsx already measures for the existing FLIP
  // reorder-animation effect (blockNodeRefs) — drag-and-drop reads
  // positions from it rather than introducing a second measuring pass, and
  // the FLIP effect plays the settle animation for a drag-commit exactly
  // the same way it already does for the Move Up/Down buttons.
  nodeRefs: React.RefObject<Map<string, HTMLDivElement>>;
  onReorder: (next: LinkBlock[]) => void;
}

export interface UseBlockDragDropResult {
  draggingId: string | null;
  // Index (0..blocks.length) the block would land at if dropped right now —
  // null while not dragging.
  insertionIndex: number | null;
  getDragHandleProps: (id: string) => React.HTMLAttributes<HTMLSpanElement>;
}

// Hand-rolled Pointer Events drag, deliberately not a library — this is a
// single vertical list, not a multi-container board, and the app already
// owns the one piece of infrastructure (position measuring) real DnD needs;
// see the architecture plan for the full rationale. Keyboard reordering
// (Move Up/Down in BlockToolbar) is the accessible path and isn't touched
// by any of this — drag is a progressive-enhancement layer on top of it.
export function useBlockDragDrop({
  blocks,
  nodeRefs,
  onReorder,
}: UseBlockDragDropOptions): UseBlockDragDropResult {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  // Refs, not state, for anything the pointer handlers need mid-drag — they
  // stay function-stable across renders (registered once per drag) while
  // still reading the latest blocks/onReorder without going stale.
  const blocksRef = useRef(blocks);
  const onReorderRef = useRef(onReorder);
  const draggingIdRef = useRef<string | null>(null);
  const insertionIndexRef = useRef<number | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const pointerYRef = useRef(0);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  const computeInsertionIndex = (clientY: number): number => {
    const nodes = nodeRefs.current;
    const list = blocksRef.current;
    if (!nodes) return list.length;
    for (let i = 0; i < list.length; i++) {
      const el = nodes.get(list[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return list.length;
  };

  const runAutoScroll = () => {
    const y = pointerYRef.current;
    if (y < AUTO_SCROLL_MARGIN_PX) {
      window.scrollBy(0, -AUTO_SCROLL_SPEED_PX);
    } else if (y > window.innerHeight - AUTO_SCROLL_MARGIN_PX) {
      window.scrollBy(0, AUTO_SCROLL_SPEED_PX);
    }
    autoScrollRafRef.current = requestAnimationFrame(runAutoScroll);
  };

  const cleanup = () => {
    draggingIdRef.current = null;
    insertionIndexRef.current = null;
    setDraggingId(null);
    setInsertionIndex(null);
    if (autoScrollRafRef.current !== null) cancelAnimationFrame(autoScrollRafRef.current);
    autoScrollRafRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
    window.removeEventListener("keydown", handleKeyDown);
  };

  const commitAndCleanup = () => {
    const id = draggingIdRef.current;
    const toIndex = insertionIndexRef.current;
    if (id !== null && toIndex !== null) {
      const list = blocksRef.current;
      const fromIndex = list.findIndex((b) => b.id === id);
      if (fromIndex !== -1 && toIndex !== fromIndex && toIndex !== fromIndex + 1) {
        const next = [...list];
        const [moved] = next.splice(fromIndex, 1);
        const settledIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
        next.splice(settledIndex, 0, moved);
        onReorderRef.current(next);
      }
    }
    cleanup();
  };

  function handlePointerMove(e: PointerEvent) {
    pointerYRef.current = e.clientY;
    const next = computeInsertionIndex(e.clientY);
    if (next !== insertionIndexRef.current) {
      insertionIndexRef.current = next;
      setInsertionIndex(next);
    }
  }

  function handlePointerUp() {
    commitAndCleanup();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") cleanup();
  }

  const getDragHandleProps = (id: string): React.HTMLAttributes<HTMLSpanElement> => ({
    onPointerDown: (e) => {
      // Only the primary button/touch/pen starts a drag — a right-click on
      // the handle shouldn't hijack the context menu.
      if (e.button !== 0) return;
      e.preventDefault();
      draggingIdRef.current = id;
      const startIndex = blocksRef.current.findIndex((b) => b.id === id);
      insertionIndexRef.current = startIndex;
      pointerYRef.current = e.clientY;
      setDraggingId(id);
      setInsertionIndex(startIndex);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      window.addEventListener("keydown", handleKeyDown);
      autoScrollRafRef.current = requestAnimationFrame(runAutoScroll);
    },
  });

  // Belt-and-suspenders: if the component unmounts mid-drag (route change,
  // fast navigation), don't leave window-level listeners registered. Safe to
  // run only on unmount despite `cleanup` being a fresh closure each render —
  // it only ever touches refs and stable useState setters, never a stale
  // value that could matter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => cleanup, []);

  return { draggingId, insertionIndex, getDragHandleProps };
}
