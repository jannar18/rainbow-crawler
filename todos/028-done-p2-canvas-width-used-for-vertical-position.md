---
status: done
priority: p2
issue_id: "028"
tags: [correctness, naming]
dependencies: []
---

# Use CANVAS_HEIGHT for vertical positioning instead of CANVAS_WIDTH

## Problem Statement

At DungeonCrawlerScene.ts:871, `CANVAS_WIDTH` is used for a vertical position calculation: `const barY = CANVAS_WIDTH - 28`. Since the canvas is square (640x640), this produces the correct value, but it is semantically wrong and misleading. If the canvas dimensions ever change to non-square, this would break.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:3` — Only `CANVAS_WIDTH` is imported, not `CANVAS_HEIGHT`
- `src/scenes/DungeonCrawlerScene.ts:871` — `CANVAS_WIDTH` used for boss HP bar Y position
- Both constants are 640 currently, but using the wrong one obscures intent

## Proposed Solutions

### Option 1: Import and use CANVAS_HEIGHT

**Approach:** Import `CANVAS_HEIGHT` from `types.ts` and replace `CANVAS_WIDTH` with `CANVAS_HEIGHT` on line 871.

**Pros:**
- Semantically correct
- Future-proof if canvas becomes non-square

**Cons:**
- None

**Effort:** <5 minutes

**Risk:** Low

## Recommended Action

Import `CANVAS_HEIGHT` and use it for vertical positioning.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:3` — Add `CANVAS_HEIGHT` to imports
- `src/scenes/DungeonCrawlerScene.ts:871` — Change `CANVAS_WIDTH` to `CANVAS_HEIGHT`

## Acceptance Criteria

- [ ] Boss HP bar Y position uses CANVAS_HEIGHT
- [ ] No visual change (both are 640)

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified semantic mismatch in constant usage
