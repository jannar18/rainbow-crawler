---
status: done
priority: p2
issue_id: "011"
tags: [correctness, engine, latent-crash]
dependencies: []
---

# Fix Game.loadScene() ordering: setScene before init

## Problem Statement

In `Game.ts`, `loadScene()` calls `this.input.setScene(scene)` (line 46) before `scene.init(this.context)` (line 47). This means the Input system can dispatch key events to the scene before `init()` has run, causing `this.player` to be undefined. While JavaScript's synchronous execution model makes actual interleaving impossible during normal operation, this is still an incorrect ordering that could surface if the engine is ever modified.

## Findings

- `Game.ts:44-47`: scene is assigned to Input before `init()` is called
- `DungeonCrawlerScene.ts:557`: `player` uses `!` definite assignment assertion
- `DungeonCrawlerScene.ts:1358`: `onKeyDown` accesses `this.player.facing` unconditionally
- The error boundary in `Game.ts` catches errors during `update()` and `render()` but NOT during key handlers, which run as independent events

## Proposed Solutions

### Option 1: Swap init and setScene order

**Approach:** Call `scene.init(this.context)` before `this.input.setScene(scene)`.

**Pros:**
- Simple one-line swap
- Correct by construction

**Cons:**
- None

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Swap lines 46-47 in `Game.ts`.

## Technical Details

**Affected files:**
- `src/engine/Game.ts:46-47` - swap ordering

## Acceptance Criteria

- [ ] `scene.init()` is called before `input.setScene(scene)`
- [ ] TypeScript compiles
- [ ] Game starts and plays normally

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified ordering issue during code review
- Confirmed race window is theoretical but fix is trivial
