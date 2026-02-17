---
status: done
priority: p2
issue_id: "027"
tags: [logic, state-management]
dependencies: []
---

# Guard aim direction updates to playing state only

## Problem Statement

In `onKeyDown()`, after the `state === "start"` early return, the aim direction code at lines 1181-1186 runs unconditionally for all states including `"gameOver"` and `"win"`. This means pressing WASD or arrow keys during end screens mutates `this.player.aimDirection`. While currently harmless (player is not rendered during those screens), it is a state leak that would become a bug if end screens ever showed the player or if aim direction persisted into the next game differently.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:1181-1186` — aim direction set unconditionally after start screen check
- The `resetGame()` method (line 82) sets `aimDirection: "right"`, so the leak doesn't persist across games currently
- However, this is fragile — any future change to end-screen rendering could expose the bug

## Proposed Solutions

### Option 1: Add state guard before aim direction block

**Approach:** Add `if (this.state !== "playing") return;` before the aim direction updates.

**Pros:**
- Clean separation of state handling
- Prevents any future regressions

**Cons:**
- None

**Effort:** <5 minutes

**Risk:** Low

## Recommended Action

Add a guard to only update aim direction during `"playing"` state.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:1180` — Add state guard before aim direction block

## Acceptance Criteria

- [ ] Pressing WASD/arrows during gameOver/win screens does not mutate player state
- [ ] Aim direction still works correctly during gameplay

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified state leak in onKeyDown aim direction handling
