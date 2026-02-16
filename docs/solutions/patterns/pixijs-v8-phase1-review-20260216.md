---
title: "Phase 1 Dungeon Crawler Code Review — PixiJS v8 Patterns & Pitfalls"
date: 2026-02-16
category: patterns
tags:
  - pixijs-v8
  - memory-management
  - input-handling
  - state-management
  - code-review
severity: "P2 (5 important), P3 (7 nice-to-have)"
component:
  - DungeonCrawlerScene.ts
  - Renderer.ts
  - CLAUDE.md
technology:
  - PixiJS v8
  - TypeScript
  - Vite
status: resolved
---

# Phase 1 Dungeon Crawler Code Review — PixiJS v8 Patterns & Pitfalls

## Problem Summary

A code review of the Phase 1 dungeon crawler (branch `julianna`) found 12 issues across engine and scene code. The most impactful were a PixiJS memory leak pattern, input state bleeding across game states, and stale documentation. All 11 applicable fixes were committed in `bca4d80`.

## Root Cause Analysis

### 1. PixiJS `removeChildren()` Does NOT Destroy Objects

`Renderer.clear()` called `this.drawContainer.removeChildren()`, which detaches children from the scene graph but does **not** call `.destroy()` on them. GPU resources, texture caches, and internal state remain allocated until GC sweeps the orphaned objects.

At 60fps with ~5-10 draw objects per frame, this creates ~300-600 orphaned Graphics/Text objects per second. Fine for a simple Phase 1, but compounds quickly with enemies and projectiles.

### 2. Input Key Bleeds Across Game States

Pressing Space to start the game adds `"Space"` to the `heldKeys` Set. The state transitions to `"playing"`, but `"Space"` remains in the set. On the next `update()` tick, `heldKeys.has("Space")` is true and `shootCooldown` is 0, so a beam fires automatically on every game start.

The held-key system cannot distinguish "Space pressed to change state" from "Space pressed to shoot."

### 3. No-op Ternary Branches

The facing indicator used identical branches: `facingDelta.x !== 0 ? indicatorSize : indicatorSize`. Both paths returned the same value, making the conditional dead code. The indicator rendered as a square instead of a directional bar.

## Working Solutions

### Fix: PixiJS Cleanup — Always Destroy After Remove

```typescript
// Before — objects orphaned, not freed
clear(): void {
  this.drawContainer.removeChildren();
}

// After — GPU resources freed immediately
clear(): void {
  for (const child of this.drawContainer.removeChildren()) {
    child.destroy();
  }
}
```

**Pattern:** In PixiJS v8, `removeChildren()` returns the removed children. Iterate and `.destroy()` each one. Apply to both dynamic (`clear()`) and static (`clearStatic()`) layers.

### Fix: Consume Keys at State Boundaries

```typescript
onKeyDown(key: string): void {
  this.heldKeys.add(key);

  if (key === "Space") {
    if (this.state === "start") {
      this.state = "playing";
      this.heldKeys.delete("Space");  // consume — don't fire on first tick
    } else if (this.state === "gameOver" || this.state === "win") {
      this.resetGame();
      this.state = "playing";         // single press restarts
      this.heldKeys.delete("Space");
    }
  }
}
```

**Pattern:** Delete keys from `heldKeys` immediately after processing state transitions. This prevents the key press from leaking into the new state's gameplay input handling.

### Fix: Directional Indicator with Distinct Dimensions

```typescript
const barThick = 0.2;
const barLong = 0.5;
const isHorizontal = facingDelta.x !== 0;
renderer.drawRect(
  px, py,
  isHorizontal ? barThick : barLong,   // width
  isHorizontal ? barLong : barThick,    // height
  COLOR_FACING_INDICATOR
);
```

**Pattern:** When ternary branches should produce different values, use a boolean flag and swap two named constants. This is self-documenting and impossible to get both branches identical.

## All Fixes Applied

| # | Severity | Fix | File |
|---|----------|-----|------|
| 1 | P2 | Destroy PixiJS objects in `clear()`/`clearStatic()` | `Renderer.ts` |
| 2 | P2 | Consume Space from heldKeys after state transitions | `DungeonCrawlerScene.ts` |
| 3 | P2 | Single-press restart (skip start screen on game-over/win) | `DungeonCrawlerScene.ts` |
| 4 | P2 | Update CLAUDE.md constants (32px/640px) and Renderer API table | `CLAUDE.md` |
| 5 | P2 | SnakeScene stage leak — skipped (SnakeScene is reference only) | — |
| 6 | P3 | Fix facing indicator no-op ternaries → thin directional bar | `DungeonCrawlerScene.ts` |
| 7 | P3 | Import `GRID_SIZE` from types.ts, remove local duplicate | `DungeonCrawlerScene.ts` |
| 8 | P3 | Remove unused `CANVAS_HEIGHT` and `CELL_SIZE` imports | `DungeonCrawlerScene.ts` |
| 9 | P3 | Annotate `I_FRAME_DURATION` as Phase 2 scaffolding | `DungeonCrawlerScene.ts` |
| 10 | P3 | Fix misleading "last pressed wins" comment | `DungeonCrawlerScene.ts` |
| 11 | P3 | Add Phase 2 step placeholder comments in update loop | `DungeonCrawlerScene.ts` |
| 12 | P3 | Add dark overlay to start screen | `DungeonCrawlerScene.ts` |

## Prevention Strategies

### PixiJS Object Lifecycle

- **Rule:** Never use `removeChildren()` alone for cleanup. Always follow with `.destroy()` on each child.
- **Detection:** Search for bare `removeChildren()` calls without a destroy loop. Consider an ESLint custom rule.
- **Reference:** PixiJS v8 `Container.removeChildren()` returns removed children but does not free GPU resources.

### Input State at Boundaries

- **Rule:** When a key press triggers a state transition, delete that key from `heldKeys` to prevent it from triggering gameplay actions in the new state.
- **Detection:** Test state transitions with keys held — verify no unintended actions fire on the first tick.

### Constant Single Source of Truth

- **Rule:** Import constants from `types.ts`. Never redeclare locally with the same value.
- **Detection:** ESLint `no-shadow` rule catches local variables shadowing imports.

### Documentation Sync

- **Rule:** When changing constants in `types.ts`, update `CLAUDE.md` in the same commit.
- **Detection:** Code review checklist item for PRs that touch `types.ts`.

## Related Documentation

- [Critical Patterns](critical-patterns.md) — Scene interface contract, fixed timestep, input handling
- [Scene-Based Game Engine Architecture](../best-practices/scene-based-game-engine-architecture-20260215.md) — Renderer extension patterns, memory cleanup, accumulator clamping
