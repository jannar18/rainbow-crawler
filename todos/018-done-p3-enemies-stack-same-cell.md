---
status: done
priority: p3
issue_id: "018"
tags: [gameplay, ai, visual]
dependencies: []
---

# Enemies can stack on the same cell, hiding their count visually

## Problem Statement

Chasers and the boss use BFS pathfinding that doesn't account for other enemies' positions. Multiple enemies can converge on the same cell, appearing as a single entity. This creates visual deception — players can't tell how many enemies occupy a cell. Each enemy independently deals contact damage, so stacked enemies effectively create damage traps that look like a single enemy.

## Findings

- `DungeonCrawlerScene.ts:890-933`: `updateChaser`/`updateBoss` move to BFS next step without checking for other enemies
- Stacked enemies render on top of each other (single visible rectangle)
- HUD shows correct total active count, but per-cell count is unknown
- With 2-4 enemies per room, stacking is common in narrow corridors

## Proposed Solutions

### Option 1: Add enemy-occupied cell check to BFS movement

**Approach:** Before moving an enemy to the BFS next step, check if another active enemy already occupies that cell. If so, skip the move.

**Pros:**
- Enemies spread out naturally
- Visual representation matches actual threat

**Cons:**
- Slightly more complex movement logic
- Enemies might get "stuck" behind each other in narrow passages

**Effort:** 30 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:890-933` - add occupied-cell check

## Acceptance Criteria

- [ ] No two active enemies occupy the same cell
- [ ] Visual enemy count matches actual count

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
