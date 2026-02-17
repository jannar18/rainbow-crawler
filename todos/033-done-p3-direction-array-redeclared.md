---
status: done
priority: p3
issue_id: "033"
tags: [duplication, cleanup]
dependencies: []
---

# Export shared DIRECTIONS constant instead of re-declaring direction arrays

## Problem Statement

The array `["up", "down", "left", "right"]` is declared as a fresh local variable in 3 separate locations. A shared constant in dungeon-types.ts would eliminate the duplication.

## Findings

- `src/scenes/dungeon-gen.ts:24` — `const dirs: Direction[] = ["up", "down", "left", "right"]`
- `src/scenes/DungeonCrawlerScene.ts:470` — `const dirs: Direction[] = ["up", "down", "left", "right"]`
- `src/scenes/DungeonCrawlerScene.ts:511` — `const dirs: Direction[] = ["up", "down", "left", "right"]`

## Proposed Solutions

### Option 1: Add DIRECTIONS constant to dungeon-types.ts

**Approach:** Export `const DIRECTIONS: Direction[] = ["up", "down", "left", "right"]` from dungeon-types.ts and import it in all three locations.

**Effort:** <10 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/dungeon-types.ts` — Add `DIRECTIONS` export
- `src/scenes/dungeon-gen.ts:24` — Replace with import
- `src/scenes/DungeonCrawlerScene.ts:470,511` — Replace with import

## Acceptance Criteria

- [ ] Single DIRECTIONS constant used everywhere
- [ ] TypeScript compilation succeeds

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
