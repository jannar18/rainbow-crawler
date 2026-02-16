---
status: pending
priority: p3
issue_id: "009"
tags: [gameplay-feel, phase2]
dependencies: []
---

# Enemies have delayed first action due to max cooldown initialization

## Problem Statement

Chasers start with `moveCooldown: CHASER_MOVE_INTERVAL (2)` and rangers start with `shootCooldown: RANGER_FIRE_INTERVAL (5)`. This means chasers wait 2 ticks (300ms) and rangers wait 5 ticks (750ms) before their first action. This may make enemies feel sluggish on first encounter.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:164` — chaser moveCooldown: CHASER_MOVE_INTERVAL
- `src/scenes/DungeonCrawlerScene.ts:184` — ranger shootCooldown: RANGER_FIRE_INTERVAL
- Could be intentional as a grace period for the player

## Proposed Solutions

### Option 1: Initialize cooldowns to 1

**Approach:** Set initial cooldown to 1 so enemies act on their second tick (one tick of "awareness" delay, then immediate action).

**Effort:** 5 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts` — enemy initialization in createTestRoom

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
