---
status: done
priority: p2
issue_id: "022"
tags: [dead-code]
dependencies: []
---

# Remove dead `Player.facing` field

## Problem Statement

`Player.facing` is set at initialization and updated on key press, but no code ever reads it. All directional behavior (aiming, shooting, sprite rendering) uses `Player.aimDirection` instead. This dead state is misleading — it suggests the game tracks movement direction separately from aim direction, but nothing uses it.

## Findings

- `Player.facing` defined: `src/scenes/DungeonCrawlerScene.ts:53`
- Set at init: `src/scenes/DungeonCrawlerScene.ts:603` — `facing: "right"`
- Updated on key press: `src/scenes/DungeonCrawlerScene.ts:1512` — `this.player.facing = MOVE_KEY_DIRECTION[key]`
- Never read anywhere in the codebase

Related: existing todo #006 notes that facing direction is key-order dependent. Since `facing` is never read, #006 is effectively moot — the bug is in dead code.

## Proposed Solutions

### Option 1: Remove `facing` entirely

**Approach:** Remove `facing` from the `Player` interface, initialization, and the assignment in `onKeyDown`.

**Pros:**
- Eliminates dead state and related confusion
- Resolves #006 by removing the dead code it describes

**Cons:**
- If sprite flipping by movement direction is planned, it would need to be re-added

**Effort:** Small (10 min)

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:53` — remove `facing` from Player interface
- `src/scenes/DungeonCrawlerScene.ts:603` — remove from initialization
- `src/scenes/DungeonCrawlerScene.ts:1512` — remove assignment

**Related todos:**
- #006 can be closed as "resolved by removal" if this is implemented

## Acceptance Criteria

- [ ] `facing` removed from Player interface and all usages
- [ ] Build passes
- [ ] Game behavior unchanged (since nothing read the field)

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Confirmed zero reads of `player.facing` via grep
- Noted relationship to existing todo #006
