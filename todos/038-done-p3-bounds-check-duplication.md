---
status: done
priority: p3
issue_id: "038"
tags: [duplication, readability]
dependencies: []
---

# Extract shared inBounds helper for grid coordinate checks

## Problem Statement

The pattern `x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE` is repeated 6 times across DungeonCrawlerScene.ts. A shared helper would improve readability.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:320` — isWalkable
- `src/scenes/DungeonCrawlerScene.ts:360-362` — moveProjectiles
- `src/scenes/DungeonCrawlerScene.ts:490` — updateBossAI
- `src/scenes/DungeonCrawlerScene.ts:525` — getRangerFireDirection
- `src/scenes/DungeonCrawlerScene.ts:578` — bfsNextStep
- `src/scenes/DungeonCrawlerScene.ts:744` — beam rendering

## Proposed Solutions

### Option 1: Add inBounds helper

**Approach:** Add a module-level or class method:
```typescript
function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}
```

**Effort:** 15 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts` — Add helper and replace 6 call sites

## Acceptance Criteria

- [ ] Single inBounds function used everywhere
- [ ] No behavioral change

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
