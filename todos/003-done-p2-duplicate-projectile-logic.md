---
status: done
priority: p2
issue_id: "003"
tags: [code-quality, duplication, phase2]
dependencies: []
---

# Extract shared projectile movement logic

## Problem Statement

`movePlayerProjectiles()` (lines 358-408) and `moveEnemyProjectiles()` (lines 410-452) are ~90% identical. Both iterate projectiles, advance by direction delta, check wall/boundary collision, check entity collision, apply damage, and remove dead projectiles. The only differences are:
- Which entity to check for collision (enemies vs player)
- Which damage function to call

Fixing a bug in one method but not the other is a real risk.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:358-408` — movePlayerProjectiles
- `src/scenes/DungeonCrawlerScene.ts:410-452` — moveEnemyProjectiles
- Both use identical wall-collision, boundary, and removal logic
- Both use the same `toRemove` index array + reverse splice pattern

## Proposed Solutions

### Option 1: Extract a shared `moveProjectiles()` method

**Approach:** Create a private `moveProjectileGroup(filter, onHit)` method that handles movement, wall collision, and removal. Pass a filter predicate for which projectiles to process and an `onHit` callback for entity collision.

**Pros:**
- ~40 lines removed
- Bug fixes apply to both projectile types automatically

**Cons:**
- Slightly more abstract, one more callback to understand

**Effort:** 20 minutes

**Risk:** Low

## Recommended Action

Option 1 — the duplication is mechanical enough that the abstraction is justified.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts` — two methods merged into one

## Acceptance Criteria

- [ ] Single projectile movement method handles both player and enemy projectiles
- [ ] Player beams still collide with active enemies
- [ ] Enemy shots still collide with player
- [ ] Wall/boundary collision unchanged
- [ ] Game builds cleanly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified via simplicity review
