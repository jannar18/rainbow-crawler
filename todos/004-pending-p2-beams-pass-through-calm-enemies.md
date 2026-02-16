---
status: pending
priority: p2
issue_id: "004"
tags: [gameplay-logic, phase2]
dependencies: []
---

# Beams pass through calm enemies instead of being absorbed

## Problem Statement

In `movePlayerProjectiles()`, beam-enemy collision only checks `e.state === "active"` (line 386-387). Beams phase through enemies in the "calm" (peaceful blue) and "dissolving" (rainbow) states.

Gameplay impact:
- A calm enemy in front of an active enemy effectively shields the active enemy until the calm one dissolves
- Visually, the calm enemy is still a solid-looking colored block, so beams phasing through it feels wrong
- The player has no way to know beams won't collide with calm enemies

## Findings

- `src/scenes/DungeonCrawlerScene.ts:386-387` — collision filter: `e.state === "active"`
- Calm enemies are rendered at 50-80% opacity (line 656-658) — they look solid
- Dissolving enemies are rendered with rainbow colors and fading alpha (lines 660-668)

## Proposed Solutions

### Option 1: Absorb beams on calm/dissolving enemies (no state change)

**Approach:** Change the collision check to `e.state !== "dissolving"` or include calm enemies. When a beam hits a calm enemy, destroy the beam but don't change the enemy state.

**Pros:**
- Feels physically consistent — visible entities block beams
- Prevents calm enemies from shielding active ones

**Cons:**
- Player might be frustrated that beams are "wasted" on calm enemies

**Effort:** 10 minutes

**Risk:** Low

### Option 2: Leave as-is, document as intentional

**Approach:** Add a comment explaining beams pass through non-active enemies by design.

**Pros:**
- No gameplay change
- Could be thematically justified (healed enemies are intangible)

**Cons:**
- Players may find it confusing without visual feedback

**Effort:** 2 minutes

**Risk:** Low

## Recommended Action

Design decision — needs team/owner input. Option 1 is recommended for gameplay clarity.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:386-387` — collision filter in movePlayerProjectiles

## Acceptance Criteria

- [ ] Design decision made and documented
- [ ] If Option 1: beams are absorbed by calm enemies without changing enemy state
- [ ] Game builds cleanly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Found during game logic review
