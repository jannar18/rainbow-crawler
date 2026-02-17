---
status: done
priority: p2
issue_id: "040"
tags: [rendering, hud, consistency]
dependencies: []
---

# Player hearts should use `drawSpritePixel` instead of grid-coord workaround

## Problem Statement

The player health hearts in `renderHUD()` compute pixel positions and then divide by `CELL_SIZE` to convert them into fractional grid coordinates for `drawSprite()`, which internally multiplies by `CELL_SIZE` again. This pixel→grid→pixel round-trip is unnecessary and confusing, especially since `drawSpritePixel()` was added in the same set of commits specifically for pixel-positioned sprites (used for boss hearts).

## Findings

- `DungeonCrawlerScene.ts:829-831` — Player hearts use `drawSprite()` with fractional grid coordinates:
  ```typescript
  const heartGridX = (startX + i * heartSpacing) / CELL_SIZE;
  const heartGridY = startY / CELL_SIZE;
  renderer.drawSprite(heartGridX, heartGridY, heartTex);
  ```
- `DungeonCrawlerScene.ts:895-899` — Boss hearts correctly use `drawSpritePixel()`
- **Known pattern (Todo #021):** Dead renderer methods were previously cleaned up; the Renderer API should be used consistently.

## Proposed Solutions

### Option 1: Replace `drawSprite` with `drawSpritePixel` for player hearts

**Approach:** Replace the three lines with a single `drawSpritePixel` call using the pixel coordinates directly.

```typescript
renderer.drawSpritePixel(startX + i * heartSpacing, startY, heartTex, CELL_SIZE);
```

**Pros:**
- Eliminates confusing pixel→grid→pixel round-trip
- Consistent with boss heart rendering
- Simpler code

**Cons:**
- None

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:827-831` - renderHUD player hearts section

**Related components:**
- Renderer API (drawSprite vs drawSpritePixel)

## Resources

- **Related todo:** #021 (dead renderer methods cleanup)

## Acceptance Criteria

- [ ] Player hearts rendered with `drawSpritePixel`
- [ ] Visual appearance unchanged
- [ ] Build passes

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code

**Actions:**
- Identified pixel→grid→pixel round-trip in player heart rendering
- Noted that drawSpritePixel was added in the same commit set

**Learnings:**
- When adding a new API method, also update existing call sites that would benefit from it
