---
status: done
priority: p2
issue_id: "026"
tags: [input, ux]
dependencies: []
---

# Add Tab key to GAME_KEYS so preventDefault is called

## Problem Statement

The `Tab` key is used in the start menu for switching focus between hero and difficulty rows (DungeonCrawlerScene.ts:1145), but it is not included in the `GAME_KEYS` set in Input.ts. This means pressing Tab triggers the browser's default behavior (focus cycling through page elements), which can steal focus from the game canvas.

## Findings

- `src/engine/Input.ts:3-15` — `GAME_KEYS` set does not include `"Tab"`
- `src/scenes/DungeonCrawlerScene.ts:1145` — Tab is handled as a menu navigation key
- When Tab is pressed, `preventDefault()` is NOT called, so the browser will cycle focus away from the game

## Proposed Solutions

### Option 1: Add Tab to GAME_KEYS

**Approach:** Add `"Tab"` to the `GAME_KEYS` set in Input.ts.

**Pros:**
- One-line fix
- Prevents focus loss during gameplay

**Cons:**
- None

**Effort:** <5 minutes

**Risk:** Low

## Recommended Action

Add `"Tab"` to GAME_KEYS.

## Technical Details

**Affected files:**
- `src/engine/Input.ts:3-15` — Add `"Tab"` to the GAME_KEYS set

## Acceptance Criteria

- [ ] Tab key is in GAME_KEYS
- [ ] Pressing Tab on start screen does not shift browser focus

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified that Tab is used in game but not in GAME_KEYS
