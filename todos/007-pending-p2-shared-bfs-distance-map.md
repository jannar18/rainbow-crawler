---
status: pending
priority: p2
issue_id: "007"
tags: [performance, phase2]
dependencies: []
---

# BFS pathfinding runs per-chaser per-tick; could share a distance map

## Problem Statement

Each chaser enemy runs a full BFS from its position to the player every time it moves. All chasers pathfind to the same target (the player). On a 20x20 grid this is fast, but it allocates new arrays per BFS call and scales as O(N * 400) per tick where N is the number of chasers.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:528-573` — bfsNextStep runs per chaser
- Each call allocates `visited` (400 bools) and `parent` (400 ints) arrays
- With 2 chasers at ~6.67 ticks/sec, that's ~13 BFS traversals/sec (trivial now)
- Will matter more in Phase 3 with more enemies and possibly larger rooms

## Proposed Solutions

### Option 1: Compute a single reverse-BFS distance map from player

**Approach:** At the start of enemy processing each tick, run a single BFS from the player position outward, storing the distance-to-player for each cell. Each chaser then picks the adjacent cell with the lowest distance value. One BFS per tick instead of N.

**Pros:**
- O(400) per tick regardless of enemy count
- Simpler per-enemy logic (just look up neighbors)

**Cons:**
- Need to cache and invalidate on room change
- Slight refactor (~15 lines)

**Effort:** 20 minutes

**Risk:** Low

### Option 2: Do nothing, add a comment

**Approach:** Add a comment noting the O(N * 400) cost for future optimization.

**Effort:** 2 minutes

**Risk:** Low

## Recommended Action

Option 2 for now — the current grid size makes this a non-issue. Upgrade to Option 1 when Phase 3 introduces more enemies or larger rooms.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:456-466` — updateChaser calls bfsNextStep
- `src/scenes/DungeonCrawlerScene.ts:528-573` — bfsNextStep implementation

## Acceptance Criteria

- [ ] If Option 1: single BFS per tick, chasers still pathfind correctly
- [ ] If Option 2: comment added noting optimization opportunity
- [ ] Game builds cleanly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Found during simplicity review
