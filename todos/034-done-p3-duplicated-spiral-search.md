---
status: done
priority: p3
issue_id: "034"
tags: [duplication, refactor]
dependencies: []
---

# Extract shared spiral-search-from-center helper in dungeon-gen

## Problem Statement

Two locations in dungeon-gen.ts implement the same spiral search outward from grid center to find the nearest floor cell. The `generateRoom` function (lines 166-184) uses it for flood fill seed, and `findPlayerSpawn` (lines 350-365) uses it for spawn placement. They are nearly identical triple-nested loops.

## Findings

- `src/scenes/dungeon-gen.ts:166-184` — Spiral search for seedCell in generateRoom
- `src/scenes/dungeon-gen.ts:350-365` — Spiral search for player spawn in findPlayerSpawn
- Both search outward from `(GRID_SIZE/2, GRID_SIZE/2)` for the nearest floor/door cell

## Proposed Solutions

### Option 1: Extract findNearestFloorToCenter helper

**Approach:** Create a `findNearestFloorToCenter(grid: CellType[][]): Point | null` function and call it from both locations.

**Effort:** 15 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/dungeon-gen.ts:166-184, 350-365` — Replace with shared helper

## Acceptance Criteria

- [ ] Single helper function for center spiral search
- [ ] Both call sites use the shared helper
- [ ] No behavioral change

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
