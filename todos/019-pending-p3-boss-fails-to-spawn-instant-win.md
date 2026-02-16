---
status: pending
priority: p3
issue_id: "019"
tags: [correctness, generation, edge-case]
dependencies: []
---

# Boss room with no boss causes instant win

## Problem Statement

If `pickSpawnPos` returns `null` for the boss (no valid floor cell found), no boss is created but `totalEnemies` is not incremented. The boss room starts with 0 enemies, so `room.cleared` becomes `true` on the first tick the player enters (line 706-708). Combined with the win condition on line 715, the player wins instantly upon entering the boss room without a boss fight.

## Findings

- `DungeonCrawlerScene.ts:224-237`: Boss creation is wrapped in `if (bossPos)` — silently skipped if null
- `DungeonCrawlerScene.ts:706-708`: Room cleared when `enemies.length === 0`
- `DungeonCrawlerScene.ts:715`: Win when in boss room and room is cleared
- `pickSpawnPos` returns null when no candidates exist (floor cells far enough from doors and not occupied)
- This is very unlikely with the current generation (large open areas) but possible with degenerate rooms

## Proposed Solutions

### Option 1: Guarantee boss spawn with fallback position

**Approach:** If `pickSpawnPos` returns null, place the boss at the room's `playerSpawn` or any floor cell.

**Pros:**
- Boss always spawns
- Simple fallback

**Cons:**
- Boss might spawn near a door (minor)

**Effort:** 10 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:224-237` - add boss spawn fallback

## Acceptance Criteria

- [ ] Boss always spawns in boss room
- [ ] No instant-win scenario possible

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
