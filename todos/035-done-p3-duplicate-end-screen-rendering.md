---
status: done
priority: p3
issue_id: "035"
tags: [duplication, refactor]
dependencies: []
---

# Deduplicate game over and win screen rendering

## Problem Statement

`renderGameOverScreen` and `renderWinScreen` share ~60% identical code: dark overlay, stats block (rooms, enemies healed, rainbow power, difficulty, modifiers), and "Press SPACE to return" prompt. The only differences are the title text/color and one extra sprite on the win screen.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:1036-1082` — renderGameOverScreen
- `src/scenes/DungeonCrawlerScene.ts:1084-1138` — renderWinScreen
- Shared: dark overlay, cleared count, enemies healed, rainbow power, difficulty, modifiers, "Press SPACE"
- Different: title text/color, win screen shows forest guardian sprite, stat label wording

## Proposed Solutions

### Option 1: Extract shared renderEndStats helper

**Approach:** Extract the common stats block into `renderEndStats(renderer, cx, startY)` and call it from both methods.

**Effort:** 15 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:1036-1138` — Refactor into shared helper + two thin wrappers

## Acceptance Criteria

- [ ] Shared stats rendering logic in one place
- [ ] Both end screens render identically to before
- [ ] Reduced code duplication

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
