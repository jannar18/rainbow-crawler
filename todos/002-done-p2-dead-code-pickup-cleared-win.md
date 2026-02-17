---
status: done
priority: p2
issue_id: "002"
tags: [code-quality, dead-code, phase2]
dependencies: []
---

# Remove dead code: Pickup interface, Room.cleared, unreachable win state

## Problem Statement

Several types and code paths exist in the scene but are never used, creating confusion for readers:

1. **`Pickup` interface** (line 45-49) and `Room.pickups` field — defined, initialized to `[]`, never populated
2. **`Room.cleared`** (line 56) — initialized to `false`, never read by any logic
3. **`"win"` game state** (line 13) — has a full render method (`renderWinScreen`) but no code path ever sets `state = "win"`

## Findings

- `src/scenes/DungeonCrawlerScene.ts:45-49` — `Pickup` interface unused
- `src/scenes/DungeonCrawlerScene.ts:56` — `Room.cleared` unused
- `src/scenes/DungeonCrawlerScene.ts:13` — `"win"` in GameState union, render method at lines 784-802, no setter
- `src/scenes/DungeonCrawlerScene.ts:188` — `pickups: []` in createTestRoom
- `src/scenes/DungeonCrawlerScene.ts:55` — `connections: Map<Direction, number>` also unused but is clear Phase 3 scaffold

## Proposed Solutions

### Option 1: Remove all dead code now

**Approach:** Delete `Pickup` interface, `Room.pickups`, `Room.cleared`, `"win"` state and `renderWinScreen()`. Keep `Room.connections` with a `// Phase 3` comment.

**Pros:**
- Cleaner code, less confusion
- Reduces file size by ~30 lines

**Cons:**
- Must re-add when Phase 3 implements these features

**Effort:** 15 minutes

**Risk:** Low

### Option 2: Add TODO comments, keep the code

**Approach:** Add `// TODO: Phase 3` comments to all unused items.

**Pros:**
- No code deletion, scaffolding ready for Phase 3

**Cons:**
- Readers still have to figure out what's active vs. scaffolded

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Option 2 for a teaching project — add clear TODO comments. Dead scaffolding in a learning project is less harmful than in production code, and removing then re-adding creates churn.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts` — types, createTestRoom, render method

## Acceptance Criteria

- [ ] All unused code paths are annotated with clear Phase 3 TODO comments
- [ ] Game builds cleanly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified via simplicity review and game logic review cross-reference
