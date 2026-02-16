---
status: done
priority: p2
issue_id: "014"
tags: [correctness, ai, boss]
dependencies: []
---

# Fix boss AI direction-picking to use alignment instead of constant distance

## Problem Statement

In `updateBossAI`, the boss picks a firing direction by comparing Manhattan distances across cardinal directions. However, the Manhattan distance (`Math.abs(dx) + Math.abs(dy)`) is the same for all directions since it doesn't depend on which direction is being tested. The "best distance" comparison is meaningless — the first direction in iteration order (`["up", "down", "left", "right"]`) with positive alignment always wins. The boss has an unintentional directional bias favoring "up" over other directions.

## Findings

- `DungeonCrawlerScene.ts:948`: `const dist = Math.abs(dx) + Math.abs(dy)` — same value for all 4 dirs
- `DungeonCrawlerScene.ts:949`: `if (alignment > 0 && dist < bestDist)` — `dist` never varies
- The code appears to intend picking the MOST aligned direction, not just the first one
- When player is diagonal (e.g., up-left), boss always picks "up" instead of the closer axis
- Same issue in `getRangerFireDirection` (lines 984-1022) but harmless there since at most one cardinal direction has line-of-sight to the player

## Proposed Solutions

### Option 1: Compare alignment values instead of distance

**Approach:** Replace `dist < bestDist` with `alignment > bestAlignment`.

```typescript
let bestDir: Direction = "down";
let bestAlignment = 0;
for (const dir of dirs) {
  const d = DELTA[dir];
  const dx = this.player.pos.x - enemy.pos.x;
  const dy = this.player.pos.y - enemy.pos.y;
  const alignment = dx * d.x + dy * d.y;
  if (alignment > bestAlignment) {
    bestAlignment = alignment;
    bestDir = dir;
  }
}
```

**Pros:**
- Correctly picks the direction most aligned with the player
- If player is at (-5, -3) relative to boss, picks "left" (alignment 5) over "up" (alignment 3)

**Cons:**
- None

**Effort:** 10 minutes

**Risk:** Low — changes boss firing direction to be more accurate

## Recommended Action

Option 1. Also simplify `getRangerFireDirection` to remove its dead `bestDist` tracking.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:935-972` - fix boss direction logic
- `src/scenes/DungeonCrawlerScene.ts:984-1022` - simplify ranger direction logic (optional)

## Acceptance Criteria

- [ ] Boss fires toward the most-aligned cardinal direction
- [ ] Ranger fire direction unchanged (still picks the one with line-of-sight)

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified constant-distance comparison across all 3 review agents
