---
status: done
priority: p2
issue_id: "012"
tags: [correctness, waste, scene]
dependencies: []
---

# Remove redundant dungeon generation in init()

## Problem Statement

`DungeonCrawlerScene.init()` calls `generateDungeon()` on line 567, then immediately calls `resetGame()` on line 568, which calls `generateDungeon()` again on line 576. The first dungeon is generated, fully populated (rooms, enemies, pickups, BFS validation), and then immediately thrown away.

## Findings

- `DungeonCrawlerScene.ts:567`: `this.dungeon = generateDungeon()` — result discarded
- `DungeonCrawlerScene.ts:576`: `resetGame()` calls `this.dungeon = generateDungeon()` — overwrites
- Dungeon generation includes RNG calls, room carving, BFS validation, enemy/pickup placement
- Wasted CPU work on every `init()` call

## Proposed Solutions

### Option 1: Remove the generateDungeon() call from init()

**Approach:** Delete line 567. `resetGame()` already handles dungeon generation.

**Pros:**
- Simple deletion
- `resetGame()` remains self-contained for restart flow

**Cons:**
- None

**Effort:** 2 minutes

**Risk:** Low

## Recommended Action

Delete `this.dungeon = generateDungeon();` from `init()`.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:567` - remove line

## Acceptance Criteria

- [ ] `init()` only calls `resetGame()`, not `generateDungeon()` directly
- [ ] Game starts and restarts correctly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified wasted dungeon generation
