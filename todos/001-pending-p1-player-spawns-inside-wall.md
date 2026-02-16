---
status: pending
priority: p1
issue_id: "001"
tags: [gameplay-bug, phase2]
dependencies: []
---

# Player spawns inside 2x2 wall pillar at (10,10)

## Problem Statement

The player spawns at `{ x: 10, y: 10 }` in `resetGame()`, but `createTestRoom()` places a 2x2 wall pillar at grid cells (9,9), (10,9), (9,10), and (10,10). Since `grid[10][10] = "wall"`, the player starts embedded inside a wall tile every game start and every restart.

This causes:
- Visual overlap of player and wall on the first frame
- Future logic checking the player's current cell (pickup collection, door transitions in Phase 3) would produce bugs
- Sprint movement from inside a wall could produce unexpected results

## Findings

- `src/scenes/DungeonCrawlerScene.ts:215` — player spawn: `pos: { x: 10, y: 10 }`
- `src/scenes/DungeonCrawlerScene.ts:143-146` — pillar walls: `grid[9][9]`, `grid[9][10]`, `grid[10][9]`, `grid[10][10]` are all set to `"wall"`
- `isWalkable()` only checks destination cells, so the player can move out, but they start on an invalid tile

## Proposed Solutions

### Option 1: Move spawn to a known floor cell

**Approach:** Change spawn position from `{ x: 10, y: 10 }` to a nearby floor cell like `{ x: 10, y: 7 }` or `{ x: 7, y: 10 }`.

**Pros:**
- One-line fix
- Keeps spawn near center of room

**Cons:**
- Hardcoded spawn that could break if room layout changes

**Effort:** 5 minutes

**Risk:** Low

### Option 2: Move the pillar instead

**Approach:** Shift the 2x2 pillar to (11,11)-(12,12) so it doesn't overlap center spawn.

**Pros:**
- Preserves the (10,10) center spawn convention

**Cons:**
- Slightly changes room layout aesthetics

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Option 1 — move player spawn to `{ x: 10, y: 7 }`.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:215` — player spawn position

## Acceptance Criteria

- [ ] Player spawns on a floor tile
- [ ] `isWalkable(player.pos.x, player.pos.y)` returns true on first tick
- [ ] Game builds cleanly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Found during cross-referencing spawn position with room layout
- Confirmed grid[10][10] is set to "wall" before spawn occurs
