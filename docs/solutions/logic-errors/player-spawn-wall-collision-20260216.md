---
title: Player spawns inside wall pillar in dungeon crawler
date: 2026-02-16
category: logic-errors
component: DungeonCrawlerScene
tags:
  - spawn-validation
  - room-layout
  - game-initialization
  - grid-collision
severity: P1
status: resolved
---

# Player spawns inside wall pillar in dungeon crawler

## Problem Statement

The player character spawned at grid position (10, 10) in the test room, which coincided with a 2x2 wall pillar. This caused the player to begin every game (and every restart) embedded inside a solid wall tile.

**Impact:**
- Player visually overlaps a wall on the first frame
- Any future logic checking the player's current cell (pickup collection, door transitions) would produce bugs
- Sprint movement from inside a wall could produce unexpected results

## Root Cause

The player spawn position and room layout were defined independently with no validation that the spawn coordinate was on a walkable tile. `createTestRoom()` placed a 2x2 wall pillar at cells (9,9), (10,9), (9,10), and (10,10), while `resetGame()` hardcoded the player spawn to `{ x: 10, y: 10 }`. Since `grid[10][10]` is indexed as `grid[y][x]`, the cell at coordinates x=10, y=10 was set to `"wall"`, directly overlapping the spawn point.

The `isWalkable()` check in the movement system only validates destination cells, so the player could move out of the wall — but they started in an invalid state every time.

## Solution

Changed the spawn position from `{ x: 10, y: 10 }` to `{ x: 10, y: 7 }` — a floor cell above the pillar, still near the room center.

**Before** (`src/scenes/DungeonCrawlerScene.ts:215`):
```typescript
pos: { x: 10, y: 10 },
```

**After:**
```typescript
pos: { x: 10, y: 7 },
```

Position (10, 7) is confirmed walkable: all interior cells are initialized as `"floor"` before wall segments are placed, and no wall segment covers `grid[7][10]`.

## Investigation Steps

1. **Cross-reference spawn with room layout** — During code review, located the hardcoded spawn in `resetGame()` at line 215 and the 2x2 pillar definition at lines 143-146.
2. **Confirm grid indexing** — Verified that `grid[10][10]` corresponds to x=10, y=10 (grid is `grid[y][x]`).
3. **Validate replacement** — Confirmed (10, 7) is a floor cell by tracing `createTestRoom()`: interior cells default to `"floor"`, and no wall segment covers that position.

## Prevention Strategies

1. **Runtime assertion at spawn time** — Before placing the player, assert `isWalkable(spawnX, spawnY)`. Throw a descriptive error if false. This is a cheap safety net:
   ```typescript
   if (!this.isWalkable(this.player.pos.x, this.player.pos.y)) {
     throw new Error(`Spawn position (${this.player.pos.x}, ${this.player.pos.y}) is not walkable`);
   }
   ```

2. **Bind spawn to room definition** — Have `createTestRoom()` return the spawn position alongside the grid, keeping layout and spawn synchronized. This prevents them from drifting apart as the room evolves.

3. **Dynamic spawn selection** — Instead of hardcoding coordinates, find the nearest walkable cell to the room center at initialization time.

## Key Takeaway

Hardcoded values and generated layouts must be validated together at initialization time, not assumed to be compatible — decouple the data sources but couple the validation.

## Related Documentation

- [PixiJS v8 Phase 1 Review](../patterns/pixijs-v8-phase1-review-20260216.md) — Prior DungeonCrawlerScene review findings (memory leaks, input bleeding)
- [Critical Patterns](../patterns/critical-patterns.md) — Scene interface contract, fixed timestep, input handling
- [Scene-Based Game Engine Architecture](../best-practices/scene-based-game-engine-architecture-20260215.md) — Engine layer design

## Work Log

### 2026-02-16 - Discovery and Fix

**By:** Claude Code

**Actions:**
- Found during `/workflows:review` of `julianna` branch (Phase 2 code review)
- Cross-referenced spawn position with `createTestRoom()` wall placements
- Changed spawn from (10, 10) to (10, 7)
- Build verified clean
