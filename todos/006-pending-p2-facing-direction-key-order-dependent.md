---
status: pending
priority: p2
issue_id: "006"
tags: [gameplay-feel, phase2]
dependencies: []
---

# Facing direction depends on key-press order, not movement direction

## Problem Statement

The player's facing direction (which controls beam aim) is set in `onKeyDown()` based on the last direction key pressed, not derived from the actual movement direction. When moving diagonally (e.g., W+D), facing depends on which key was pressed last, which the player cannot easily predict or control.

Example: Press W (face up), then press D while holding W (face right). Player moves up-right but beam fires right. Reversing the key order reverses the facing.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:808-809` — `this.player.facing = KEY_DIRECTION[key]` in onKeyDown
- Beams only fire in 4 cardinal directions (no diagonal beams)
- Facing is set per keyDown event, not recalculated each tick from movement state

## Proposed Solutions

### Option 1: Derive facing from movement delta in update()

**Approach:** In update(), after computing `dx`/`dy`, update facing based on the actual movement vector. For diagonal movement, prefer the axis with the most recent key press (keep a timestamp or sequence counter per axis).

**Pros:**
- Facing always matches movement direction
- Deterministic and predictable for the player

**Cons:**
- More complex logic
- May feel different from the current behavior (which some players might prefer)

**Effort:** 20 minutes

**Risk:** Low

### Option 2: Keep current behavior, add visual feedback

**Approach:** Keep the last-key-pressed behavior but make the facing indicator more prominent so the player always knows which way they'll shoot.

**Pros:**
- Simpler, no logic change
- Some players prefer explicit aim control

**Cons:**
- Still unintuitive for diagonal movement

**Effort:** 10 minutes

**Risk:** Low

## Recommended Action

Design decision — either approach is valid. Option 1 is more standard for a dungeon crawler; Option 2 works better if the game evolves toward twin-stick controls.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:808-809` — facing set in onKeyDown
- `src/scenes/DungeonCrawlerScene.ts:321-333` — getMoveDelta (potential location for facing update)

## Acceptance Criteria

- [ ] Design decision made
- [ ] Facing direction is predictable for the player
- [ ] Game builds cleanly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Found during game logic review
