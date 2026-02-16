---
status: pending
priority: p3
issue_id: "008"
tags: [code-fragility, phase2]
dependencies: []
---

# Ranger shot spawn relies on implicit coupling with LOS check

## Problem Statement

In `updateRanger()`, the projectile spawns at `enemy.pos + delta` without an explicit `isWalkable` guard. This is currently safe because `getRangerFireDirection()` walks from the adjacent cell outward, so it implicitly rejects directions where the adjacent cell is a wall. However, this coupling is fragile — modifying the LOS range or spawn offset independently could introduce wall-spawn bugs silently.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:477` — spawn at `enemy.pos.x + delta.x, enemy.pos.y + delta.y`
- `src/scenes/DungeonCrawlerScene.ts:496-498` — LOS walk starts from `from.x + delta.x` (same cell as spawn)
- Compare to `spawnBeam()` at line 348 which has an explicit `isWalkable` guard

## Proposed Solutions

### Option 1: Add explicit isWalkable guard

**Approach:** Add `if (!this.isWalkable(spawnX, spawnY)) return;` before creating the projectile.

**Effort:** 5 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:468-483` — updateRanger

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
