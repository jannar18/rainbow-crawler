---
status: done
priority: p3
issue_id: "023"
tags: [safety, logic-error]
dependencies: []
---

# `findPlayerSpawn` fallback returns center even if it's a wall

## Problem Statement

`findPlayerSpawn()` searches outward from the room center for a floor cell, but its fallback (when no floor is found) returns `{ x: cx, y: cy }` — the center cell, which could be a wall. In practice the dungeon generator always creates rooms with floor cells, so this fallback never triggers, but it's a latent safety issue.

## Findings

- `findPlayerSpawn()`: `src/scenes/DungeonCrawlerScene.ts:553-570`
- Line 569: `return { x: cx, y: cy }` — unconditional fallback, no walkability check
- Called on line 302 for every room after generation
- `resetGame()` (line 602) uses the spawn position without validation

Related: `generateFallbackRoom()` (line 500) also sets `playerSpawn: { x: 10, y: 10 }` which is dead code (overwritten by `findPlayerSpawn` on line 302). This echoes the original player-spawn-wall-collision issue documented in `docs/solutions/logic-errors/player-spawn-wall-collision-20260216.md`.

## Proposed Solutions

### Option 1: Add a runtime assertion

**Approach:** After `findPlayerSpawn()` returns, assert that the position is walkable. If not, throw an error or pick a random floor cell.

**Effort:** Small (15 min)

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:553-570` — add guard
- `src/scenes/DungeonCrawlerScene.ts:500` — remove dead `playerSpawn` in fallback room

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Cross-referenced with existing solution doc on player-spawn-wall-collision
- Confirmed fallback never triggers in practice but is a latent risk
