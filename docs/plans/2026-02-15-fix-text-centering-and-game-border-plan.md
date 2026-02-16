---
title: "fix: Center title screen text and add visible game border"
type: fix
status: completed
date: 2026-02-15
---

# fix: Center title screen text and add visible game border

Two visual polish issues on the Snake game:

1. The "Arrow keys or WASD to move" text (and other title screen text) is not horizontally centered on the canvas
2. There is no visible border around the game area, making it impossible to see where the playfield ends

## Problem Analysis

### Text Centering

All text in `renderStartScreen()` and `renderGameOverOverlay()` uses hardcoded pixel X positions (`SnakeScene.ts:167-177`). These are rough guesses and don't account for actual rendered text width:

```ts
// SnakeScene.ts:168-176 — hardcoded pixel positions
renderer.drawText("Snake", 210, 200, { fontSize: 64, color: 0x44cc44 });
renderer.drawText("Press SPACE to start", 160, 320, { fontSize: 24, color: 0xaaaaaa });
renderer.drawText("Arrow keys or WASD to move", 130, 360, { fontSize: 18, color: 0x666666 });
```

The `Renderer.drawText()` method (`Renderer.ts:37-52`) creates a PixiJS `Text` object and sets `t.x = pixelX` — always left-aligned from that position. There's no way to center text without guessing.

### Missing Game Border

The canvas background is `0x1a1a2e` (set in `main.ts:11`), which blends with the page background. During gameplay (`renderGameField()` at `SnakeScene.ts:146-165`), only the snake, food, and score are drawn — no border or boundary indicator. Players can't tell where the edges are until the snake dies.

## Proposed Solution

### 1. Add text anchor support to Renderer

Add an optional `anchor` parameter to `drawText()` in `Renderer.ts` that sets the PixiJS text anchor point. When `anchor: 0.5` (centered), the `pixelX` coordinate becomes the center point rather than the left edge.

```ts
// Renderer.ts — drawText with anchor support
drawText(
  text: string,
  pixelX: number,
  pixelY: number,
  options?: { fontSize?: number; color?: number; anchor?: number }
): void {
  // ... existing style creation ...
  const t = new Text({ text, style });
  t.anchor.set(options?.anchor ?? 0, 0);  // horizontal anchor, vertical stays top
  t.x = pixelX;
  t.y = pixelY;
  this.drawContainer.addChild(t);
}
```

Also update the `Renderer` interface in `types.ts` to include the `anchor` option.

Then update `SnakeScene.ts` to pass `anchor: 0.5` and use `CANVAS_WIDTH / 2` (300) as the X position for all centered text:

```ts
// SnakeScene.ts — renderStartScreen with centered text
renderer.drawText("Snake", 300, 200, { fontSize: 64, color: 0x44cc44, anchor: 0.5 });
renderer.drawText("Press SPACE to start", 300, 320, { fontSize: 24, color: 0xaaaaaa, anchor: 0.5 });
renderer.drawText("Arrow keys or WASD to move", 300, 360, { fontSize: 18, color: 0x666666, anchor: 0.5 });
```

Same treatment for `renderGameOverOverlay()`.

### 2. Draw a border around the game area

Add a border outline in `renderGameField()` using an unfilled rectangle or 4 thin rectangles around the grid perimeter. A subtle color (e.g., `0x333355`) distinguishes the play area without being distracting.

The simplest approach: draw 4 single-pixel-wide lines along the grid edges using PixiJS Graphics directly, or draw a 1-cell-wide border using `drawRect` calls along each edge.

A cleaner option is to add a `drawBorder()` method to SnakeScene that draws a stroked rectangle using the `renderer.stage` for direct PixiJS access:

```ts
// SnakeScene.ts — in renderGameField(), before drawing food/snake
const g = new Graphics();
g.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
g.stroke({ color: 0x333355, width: 2 });
renderer.stage.addChild(g);  // or use drawContainer
```

Alternatively, since the Renderer already has `drawRect`, draw 4 thin rectangles along each edge. But a stroked rect is cleaner and avoids 4 draw calls.

## Files to Modify

| File | Change |
|------|--------|
| `src/engine/types.ts` | Add `anchor?: number` to drawText options type |
| `src/engine/Renderer.ts` | Implement anchor support in `drawText()` |
| `src/scenes/SnakeScene.ts` | Center all text with `anchor: 0.5`, add border drawing to `renderGameField()` |

## Acceptance Criteria

- [x] All title screen text ("Snake", "Press SPACE to start", "Arrow keys or WASD to move") is visually centered horizontally
- [x] All game over screen text ("Game Over", score, "Press SPACE to restart") is visually centered horizontally
- [x] A visible border is drawn around the game area during gameplay
- [x] Border is subtle enough to not distract from gameplay (muted color, thin line)
- [x] Border is also visible on the start screen and game over screen
- [x] No changes break the existing Scene interface contract (anchor option is optional)
- [x] `npm run build` passes with no TypeScript errors

## Context

- Canvas is 600x600 pixels (`CANVAS_WIDTH` / `CANVAS_HEIGHT` in `types.ts`)
- Grid is 20x20 cells, each 30px (`GRID_SIZE` / `CELL_SIZE`)
- Background color is `0x1a1a2e` (dark navy, set in `main.ts`)
- The Renderer is part of the **engine layer** — changes to it should remain backward-compatible
- PixiJS v8 `Text` objects support `.anchor.set(x, y)` for positioning relative to the text bounds
