---
status: done
priority: p2
issue_id: "020"
tags: [unused-asset, performance]
dependencies: []
---

# Remove unused loaded textures (~20 textures wasting memory)

## Problem Statement

Many textures are loaded at startup via `Assets.load()` but never referenced by game code. They consume memory and increase initial load time for no benefit.

## Findings

### Tile textures loaded but never used in rendering

`src/main.ts:87-96` loads these tile textures, but only `jungleWalls` and `doorClosed` are ever rendered:

- `wall_left.png`, `wall_right.png`, `wall_top_mid.png`, `wall_top_left.png`, `wall_top_right.png` — loaded but not in `GameTextures`
- `doors_leaf_open.png` — loaded but not in `GameTextures`
- `column.png` — loaded but not in `GameTextures`
- `wall_mid.png` — in `GameTextures.tiles.wallMid` but `renderRoom()` uses only `jungleWalls`

### Floor textures loaded but floors drawn as colored rects

`src/main.ts:97-99` loads 8 `floor_*.png` textures into `tiles.floors`, but `renderRoom()` (line 1160-1170) draws floors via `drawRectStatic()` with color values, never as sprites.

### UI textures loaded but unused

- `flask_big_red.png` — loaded (`src/main.ts:109`) but not in `GameTextures`
- `ui_heart_half.png` — in `GameTextures.ui.heartHalf` but HUD only uses `heartFull`/`heartEmpty` (integer health, no half-hearts)

### Animation frame sets loaded but never rendered

- `bossHealed.walk` (4 frames) — `getEnemyHealedTexture()` only uses `bossHealed.idle`
- `ranger.run` (4 frames) — `getEnemyActiveTexture()` only uses `ranger.idle`

## Proposed Solutions

### Option 1: Remove all unused texture loading

**Approach:** Remove unused paths from the `paths` array in `main.ts`, remove unused fields from `GameTextures` interface, and stop loading the textures entirely.

**Pros:**
- Reduces asset loading from ~130 to ~110 textures
- Faster startup, less memory

**Cons:**
- If any of these textures are planned for future use, they'd need to be re-added

**Effort:** Small (30 min)

**Risk:** Low

## Recommended Action

Remove all unused texture loading and clean up `GameTextures` interface.

## Technical Details

**Affected files:**
- `src/main.ts:87-110` — remove unused paths from `paths` array and `textures` object
- `src/scenes/DungeonCrawlerScene.ts:7-32` — remove unused fields from `GameTextures` interface

## Acceptance Criteria

- [ ] No unused textures loaded in `main.ts`
- [ ] `GameTextures` interface matches actually-used textures
- [ ] Build passes (`npm run build`)
- [ ] Game still renders correctly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified ~20 textures loaded but never used
- Categorized into tile, floor, UI, and animation frame groups
