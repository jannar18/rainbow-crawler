---
status: done
priority: p3
issue_id: "042"
tags: [naming, readability]
dependencies: []
---

# `heartSpacing` variable shadows outer scope in renderHUD

## Problem Statement

In `renderHUD()`, `heartSpacing` is declared at line 824 for player hearts (`CELL_SIZE + 2 = 34`) and again at line 888 for boss hearts (`heartSize + 2 = 22`). While this is valid JavaScript block scoping, having two variables with the same name and different values in the same method is confusing.

## Findings

- `DungeonCrawlerScene.ts:824` — `const heartSpacing = CELL_SIZE + 2;` (player hearts, value 34)
- `DungeonCrawlerScene.ts:888` — `const heartSpacing = heartSize + 2;` (boss hearts, value 22)

## Proposed Solutions

### Option 1: Rename boss version to `bossHeartSpacing`

**Approach:** Rename the inner variable to avoid shadowing.

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:888-889,892-893` - rename inner heartSpacing

## Acceptance Criteria

- [ ] No variable shadowing in renderHUD
- [ ] Build passes

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code
