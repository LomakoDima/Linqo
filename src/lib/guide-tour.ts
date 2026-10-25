export interface TourStep {
  id: string;
  target: string | readonly string[];
  title: string;
  body: string;
  onBeforeShow?: () => void;
}

export type TourRect = { left: number; top: number; width: number; height: number };
export type TourViewport = TourRect;
const MARGIN = 12;
const GAP = 14;

export function tourSpotlight(rect: TourRect | null, viewport: TourViewport): TourRect | null {
  if (!rect) return null;
  const left = Math.max(viewport.left + 4, rect.left - 6);
  const top = Math.max(viewport.top + 4, rect.top - 6);
  const right = Math.min(viewport.left + viewport.width - 4, rect.left + rect.width + 6);
  const bottom = Math.min(viewport.top + viewport.height - 4, rect.top + rect.height + 6);
  return right > left && bottom > top
    ? { left, top, width: right - left, height: bottom - top }
    : null;
}

export function placeTourCard(target: TourRect | null, viewport: TourViewport, height: number) {
  const width = Math.max(1, Math.min(352, viewport.width - MARGIN * 2));
  const maxHeight = Math.max(1, viewport.height - MARGIN * 2);
  const cardHeight = Math.min(height, maxHeight);
  const minX = viewport.left + MARGIN;
  const minY = viewport.top + MARGIN;
  const maxX = Math.max(minX, viewport.left + viewport.width - width - MARGIN);
  const maxY = Math.max(minY, viewport.top + viewport.height - cardHeight - MARGIN);
  const candidates = target
    ? [
        { left: target.left + target.width / 2 - width / 2, top: target.top + target.height + GAP },
        { left: target.left + target.width / 2 - width / 2, top: target.top - cardHeight - GAP },
        {
          left: target.left + target.width + GAP,
          top: target.top + target.height / 2 - cardHeight / 2,
        },
        { left: target.left - width - GAP, top: target.top + target.height / 2 - cardHeight / 2 },
      ]
    : [
        {
          left: viewport.left + (viewport.width - width) / 2,
          top: viewport.top + (viewport.height - cardHeight) / 2,
        },
      ];
  const ranked = candidates.map((candidate, index) => {
    const left = Math.max(minX, Math.min(maxX, candidate.left));
    const top = Math.max(minY, Math.min(maxY, candidate.top));
    const overlap = target
      ? Math.max(
          0,
          Math.min(left + width, target.left + target.width) - Math.max(left, target.left),
        ) *
        Math.max(
          0,
          Math.min(top + cardHeight, target.top + target.height) - Math.max(top, target.top),
        )
      : 0;
    return {
      left,
      top,
      score:
        overlap * 10 + Math.abs(left - candidate.left) + Math.abs(top - candidate.top) + index * 2,
    };
  });
  ranked.sort((a, b) => a.score - b.score);
  return { left: ranked[0].left, top: ranked[0].top, width, maxHeight };
}
