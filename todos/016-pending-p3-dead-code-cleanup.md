---
status: pending
priority: p3
issue_id: "016"
tags: [dead-code, cleanup]
dependencies: []
---

# Remove dead code: unused variables and misleading comment

## Problem Statement

Several small dead code issues were found across the branch that should be cleaned up for code clarity.

## Findings

- `DungeonCrawlerScene.ts:166`: `const d = DELTA[dir]` in `entryPos()` — assigned, never read
- `DungeonCrawlerScene.ts:693`: `const prevCount = this.room.enemies.length` — assigned, never read
- `DungeonCrawlerScene.ts:179`: Comment says "linear chain with 1-2 branches" but code only builds a linear chain — misleading

## Proposed Solutions

### Option 1: Delete dead code and fix comment

**Approach:**
1. Remove line 166 (`const d = DELTA[dir]`)
2. Remove line 693 (`const prevCount = ...`)
3. Change line 179 comment to "Build room graph as a linear chain with random direction connections"

**Effort:** 5 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:166` - remove dead variable
- `src/scenes/DungeonCrawlerScene.ts:693` - remove dead variable
- `src/scenes/DungeonCrawlerScene.ts:179` - fix misleading comment

## Acceptance Criteria

- [ ] No unused variables
- [ ] Comments accurately describe code behavior
- [ ] TypeScript compiles

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
