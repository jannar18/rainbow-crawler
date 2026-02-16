---
title: "Code Review: Dungeon Crawler Phase 3 - 5 P2 Issues Fixed"
date: "2026-02-16"
category: "integration-issues"
tags: ["game-loop", "scene-management", "pixijs", "memory-leak", "ai-logic", "lifecycle"]
component: "Game.ts, DungeonCrawlerScene.ts"
severity: "P2"
status: "resolved"
---

# Phase 3 Review: Lifecycle, Cleanup, and AI Fixes

Five P2 issues discovered during a comprehensive code review of the `julianna` branch (dungeon crawler game). All span the engine-game integration boundary.

## Problem Summary

| # | Issue | File | Impact |
|---|-------|------|--------|
| 011 | `loadScene()` calls `setScene` before `init` | `Game.ts:46-47` | Latent crash on key press during init |
| 012 | Double dungeon generation in `init()` | `DungeonCrawlerScene.ts:567` | Wasted CPU (full generation discarded) |
| 013 | `renderError()` leaks PixiJS objects every frame | `Game.ts:88-122` | GPU resource leak, infinite loop |
| 014 | Boss AI uses constant distance instead of alignment | `DungeonCrawlerScene.ts:940-956` | Directional bias in boss firing |
| 015 | No PixiJS cleanup on scene switch | `Game.ts:38-42` | Static layer objects leak between scenes |

## Solutions

### Fix 1: Game.loadScene() Initialization Ordering

**Root Cause:** `loadScene()` called `this.input.setScene(scene)` before `scene.init(this.context)`. The Input class registers a global keydown listener that dispatches to the scene. Any key press between `setScene()` and `init()` would access `this.player` (undefined via `!` definite assertion), crashing on `this.player.facing`.

**Fix:** Reverse the initialization order:

```typescript
// Before (broken):
this.input.setScene(scene);
scene.init(this.context);

// After (fixed):
scene.init(this.context);
this.input.setScene(scene);
```

### Fix 2: Double Dungeon Generation

**Root Cause:** `init()` called `generateDungeon()` then `resetGame()` which also calls `generateDungeon()`. First dungeon fully generated (rooms, enemies, BFS validation) then immediately discarded.

**Fix:** Remove the redundant call from `init()`:

```typescript
init(_context: GameContext): void {
  this.resetGame(); // resetGame() already generates the dungeon
}
```

### Fix 3: renderError() PixiJS GPU Memory Leak

**Root Cause:** Called every animation frame (60fps) when error occurred. Each frame: `removeChildren()` without `destroy()` (leaking GPU textures) + created 3 new PixiJS objects. Loop never stopped.

**Known Pattern:** Same `removeChildren()` vs `destroy()` issue fixed in `Renderer.clear()` during Phase 1 review (see [pixijs-v8-phase1-review](../patterns/pixijs-v8-phase1-review-20260216.md)).

**Fix:** Destroy removed children and stop the loop:

```typescript
for (const child of this.app.stage.removeChildren()) {
  child.destroy();
}
// ... render error display ...
this.running = false;
```

### Fix 4: Boss AI Direction-Picking Bias

**Root Cause:** Boss `updateBossAI()` compared `dist < bestDist` where `dist` was Manhattan distance — identical for all 4 cardinal directions. The first direction in iteration order with positive alignment always won.

**Fix:** Compare alignment (dot product) directly:

```typescript
// Before (broken — dist is constant across all dirs):
if (alignment > 0 && dist < bestDist) {
  bestDist = dist; bestDir = dir;
}

// After (fixed — alignment varies per direction):
if (alignment > bestAlignment) {
  bestAlignment = alignment; bestDir = dir;
}
```

### Fix 5: Scene destroy() Missing Renderer Cleanup

**Root Cause:** `destroy()` only cleared `heldKeys`. PixiJS objects in Renderer's static/dynamic layers persisted across scene switches. The Scene interface doesn't pass renderer to `destroy()`.

**Fix:** Add renderer cleanup in `Game.loadScene()`:

```typescript
if (this.scene) {
  this.input.setScene(null);
  this.scene.destroy();
  this.renderer.clear();       // Destroy dynamic layer objects
  this.renderer.clearStatic(); // Destroy static layer objects
}
```

## Prevention Strategies

### 1. Initialization Ordering
**Rule:** Initialize scene state (`init()`) before registering external event sources (`setScene()`). Document the initialization sequence in comments.

### 2. Redundant Initialization
**Rule:** `init()` should set up state exactly once. Don't call helper methods that also regenerate state. Keep `init()` and `reset()` concerns separate.

### 3. PixiJS Object Lifecycle
**Rule:** Always call `.destroy()` on PixiJS objects when removing them. Use the pattern: `for (const child of container.removeChildren()) child.destroy()`. Never assume `removeChildren()` frees GPU resources.

### 4. Comparison Metrics
**Rule:** Use dot product for directional alignment, distance for proximity. Add comments explaining what each metric measures. If a comparison variable doesn't change across loop iterations, it's likely the wrong metric.

### 5. Scene Transition Cleanup
**Rule:** Before loading a new scene, clear all renderer layers. The cleanup sequence: (1) unset input, (2) destroy scene, (3) clear renderer layers, (4) init new scene, (5) set input.

## Related Documentation

- [PixiJS v8 Phase 1 Review Patterns](../patterns/pixijs-v8-phase1-review-20260216.md) — `removeChildren()` vs `destroy()` pattern
- [Scene-Based Game Engine Architecture](../best-practices/scene-based-game-engine-architecture-20260215.md) — Scene lifecycle contract
- [Critical Patterns](../patterns/critical-patterns.md) — Scene interface cleanup requirements
- [Player Spawn Wall Collision](../logic-errors/player-spawn-wall-collision-20260216.md) — Initialization validation patterns

## Remaining P3 Issues

| # | Issue | Status |
|---|-------|--------|
| 016 | Dead code: unused variables `d`, `prevCount`, misleading comment | Pending |
| 017 | Enemies BFS-path onto door cells, enabling retreat exploits | Pending |
| 018 | Enemies stack on same cell, hiding count visually | Pending |
| 019 | Boss fails to spawn (null from pickSpawnPos) → instant win | Pending |
