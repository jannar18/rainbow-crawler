---
status: pending
priority: p2
issue_id: "005"
tags: [gameplay-feel, phase2]
dependencies: []
---

# No wall-sliding fallback for diagonal movement

## Problem Statement

When a player moves diagonally and the diagonal target or one of the cardinal intermediates is blocked (corner-cutting check), the move is denied entirely. The player gets "stuck" on wall corners even though they could move along one axis. Most action games implement wall-sliding — when diagonal is blocked, try each axis independently as a fallback.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:243-261` — movement loop with diagonal corner-cutting check
- When `isDiagonal` and `canMove` is false, the loop breaks immediately
- No attempt to try dx-only or dy-only movement as fallback

## Proposed Solutions

### Option 1: Add wall-sliding fallback

**Approach:** When diagonal movement fails, try moving along the horizontal axis only (`dx, 0`), then the vertical axis only (`(0, dy)`) as fallbacks. Take the first that succeeds.

**Pros:**
- Standard action game feel — player "slides" along walls
- Movement feels much more responsive near obstacles

**Cons:**
- ~8 lines of additional logic
- Changes gameplay feel (some may prefer strict diagonal blocking)

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

Option 1 — wall-sliding is the standard expectation for grid-based action games.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:243-261` — movement block in update()

## Acceptance Criteria

- [ ] Diagonal movement near walls slides along the unblocked axis
- [ ] Corner-cutting prevention still works (no diagonal through wall corners)
- [ ] Sprint + wall-sliding works correctly
- [ ] Game builds cleanly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Found during game logic review
