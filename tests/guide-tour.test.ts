import assert from "node:assert/strict";
import test from "node:test";
import { placeTourCard, tourSpotlight, type TourRect } from "../src/lib/guide-tour";

const viewport = { left: 0, top: 0, width: 1280, height: 800 };
const overlap = (a: TourRect, b: TourRect) =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));

test("cards fit narrow, landscape and offset visual viewports with measured content heights", () => {
  for (const width of [320, 375, 414, 768, 1280])
    for (const height of [210, 568, 900])
      for (const contentHeight of [180, 280, 600]) {
        const view = { left: 20, top: 80, width, height };
        for (const target of [
          null,
          { left: 20, top: 80, width: 200, height: 44 },
          { left: width - 100, top: height, width: 120, height: 64 },
        ]) {
          const result = placeTourCard(target, view, contentHeight);
          assert.ok(result.left >= view.left + 12);
          assert.ok(result.top >= view.top + 12);
          assert.ok(result.left + result.width <= view.left + view.width - 12);
          assert.ok(
            result.top + Math.min(contentHeight, result.maxHeight) <= view.top + view.height - 12,
          );
        }
      }
});

test("bottom controls get a card above, without covering the target", () => {
  const target = { left: 1050, top: 720, width: 180, height: 48 };
  const card = placeTourCard(target, viewport, 260);
  assert.ok(card.top + 260 < target.top);
  assert.equal(overlap({ ...card, height: 260 }, target), 0);
});

test("a tall preview uses free space alongside it", () => {
  const target = { left: 860, top: 80, width: 380, height: 660 };
  const card = placeTourCard(target, viewport, 260);
  assert.ok(card.left + card.width < target.left);
  assert.equal(overlap({ ...card, height: 260 }, target), 0);
});

test("spotlights clip oversized and offscreen elements instead of highlighting empty space", () => {
  assert.deepEqual(tourSpotlight({ left: -200, top: -100, width: 2000, height: 1200 }, viewport), {
    left: 4,
    top: 4,
    width: 1272,
    height: 792,
  });
  assert.equal(tourSpotlight({ left: 1500, top: 100, width: 200, height: 80 }, viewport), null);
  assert.equal(tourSpotlight(null, viewport), null);
});

test("a missing anchor keeps the explanation centered and navigable", () => {
  const card = placeTourCard(null, viewport, 260);
  assert.equal(card.left, (1280 - card.width) / 2);
  assert.equal(card.top, (800 - 260) / 2);
});
