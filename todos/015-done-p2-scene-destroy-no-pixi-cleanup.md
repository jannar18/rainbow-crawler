---
status: done
priority: p2
issue_id: "015"
tags: [resource-leak, scene, pixijs]
dependencies: []
---

# Scene destroy() should clean up PixiJS renderer objects

## Problem Statement

`DungeonCrawlerScene.destroy()` only clears `heldKeys`. It does not clean up PixiJS objects in the Renderer's static or dynamic layers. The Scene interface's `destroy()` method does not receive a Renderer reference, so scenes have no way to clean up renderer-managed objects. If `Game.loadScene()` switches scenes, the old scene's static layer objects leak until the new scene happens to call `clearStatic()`.

## Findings

- `DungeonCrawlerScene.ts:1377-1379`: `destroy()` only calls `this.heldKeys.clear()`
- `Game.ts:39-42`: `loadScene()` calls old `scene.destroy()` but doesn't clear renderer
- `types.ts:68-75`: `Scene.destroy()` takes no parameters — no renderer access
- The static layer (400 Graphics objects) persists until the new scene sets `staticDirty = true`

## Proposed Solutions

### Option 1: Have Game.loadScene() clear renderer layers

**Approach:** In `Game.loadScene()`, call `this.renderer.clear()` and `this.renderer.clearStatic()` before destroying the old scene.

**Pros:**
- No Scene interface change needed
- Centralizes cleanup in the engine

**Cons:**
- Cleanup happens in Game, not Scene — slightly less encapsulated

**Effort:** 10 minutes

**Risk:** Low

### Option 2: Pass renderer to destroy()

**Approach:** Change `Scene.destroy()` to `destroy(renderer: Renderer)`.

**Pros:**
- Scene can clean up its own resources

**Cons:**
- Breaking interface change

**Effort:** 20 minutes

**Risk:** Low

## Recommended Action

Option 1 — simpler and doesn't change the Scene interface.

## Technical Details

**Affected files:**
- `src/engine/Game.ts:38-53` - add renderer cleanup in loadScene

## Acceptance Criteria

- [ ] Old scene's PixiJS objects are destroyed on scene switch
- [ ] No GPU resource leaks across scene transitions

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified missing cleanup in destroy flow
