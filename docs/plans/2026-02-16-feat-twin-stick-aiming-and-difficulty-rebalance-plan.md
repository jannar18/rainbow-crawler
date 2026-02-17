---
title: Twin-Stick Aiming, Shooting Fixes & Difficulty Rebalance
type: feat
status: completed
date: 2026-02-16
---

# Twin-Stick Aiming, Shooting Fixes & Difficulty Rebalance

## Overview

Three changes in one pass:

1. **Decouple aim from movement** — WASD currently sets `aimDirection` as a side effect. Remove that so arrow keys are the *only* way to aim. Proper twin-stick layout: WASD move, arrows aim.
2. **Fix shooting bugs** — Two issues: (a) aiming at a wall silently eats the shot AND consumes the cooldown, and (b) the 3-tick (450ms) cooldown between shots feels sluggish. Fix the wall-aim bug and reduce cooldown to 2 ticks (300ms).
3. **Ease the difficulty curve** — Hard mode's chaser speed drops from interval 1 → 2. All other stats stay the same.

## Problem Statement

**Aiming:** WASD keys silently override `aimDirection`. You aim left with arrows, tap W to dodge, and your aim flips to "up". This makes shooting backwards while running away nearly impossible without fighting the controls.

**Shooting feels unresponsive:** Two compounding issues:
- **Wall-aim bug** (`DungeonCrawlerScene.ts:194-197`): When aiming at a wall, `spawnBeam()` silently returns without spawning a beam (line 341), but the shoot cooldown is **always set to 3 ticks** regardless. Result: you press SPACE, nothing happens, AND you can't try again for 450ms.
- **Slow fire rate**: `SHOOT_COOLDOWN = 3` ticks = 450ms between shots. Combined with the 150ms tick-based input processing, shooting feels delayed.

**Difficulty cliff:** Hard mode's `chaserMoveInterval: 1` matches Nightmare. Players jumping from Normal (interval 2) hit a wall instead of a ramp.

## Proposed Solution

### Part A — Twin-Stick Aiming

Remove the aim-setting side effect from WASD movement keys in `onKeyDown()`.

**Current behavior (`DungeonCrawlerScene.ts:1161-1166`):**
```ts
if (MOVE_KEY_DIRECTION[key]) {
  this.player.aimDirection = MOVE_KEY_DIRECTION[key];  // ← remove this
}
if (AIM_KEY_DIRECTION[key]) {
  this.player.aimDirection = AIM_KEY_DIRECTION[key];
}
```

**New behavior:**
```ts
if (AIM_KEY_DIRECTION[key]) {
  this.player.aimDirection = AIM_KEY_DIRECTION[key];
}
```

Delete 3 lines. Arrow keys already work; we're removing WASD interference.

**Default aim direction:** Player starts facing "right" (existing default in `resetGame()`). If you never touch the arrows, you shoot right. First arrow press takes over.

**HUD text** (`DungeonCrawlerScene.ts:1032`): Already reads `"WASD: Move  |  Arrows: Aim  |  SPACE: Shoot  |  SHIFT: Sprint"` — accurate after change, no update needed.

### Part B — Shooting Bug Fix + Faster Fire Rate

**B1. Wall-aim cooldown bug** — Make `spawnBeam()` return a boolean, only consume cooldown on success:

```ts
// DungeonCrawlerScene.ts — spawnBeam
private spawnBeam(): boolean {
  const delta = DELTA[this.player.aimDirection];
  const startX = this.player.pos.x + delta.x;
  const startY = this.player.pos.y + delta.y;
  if (!this.isWalkable(startX, startY)) return false;

  this.projectiles.push({
    pos: { x: startX, y: startY },
    direction: this.player.aimDirection,
    speed: BEAM_SPEED,
    isPlayerBeam: true,
  });
  return true;
}
```

```ts
// DungeonCrawlerScene.ts — shooting input (line 194-197)
if (this.heldKeys.has("Space") && this.player.shootCooldown <= 0) {
  if (this.spawnBeam()) {
    this.player.shootCooldown = SHOOT_COOLDOWN;
  }
}
```

**B2. Reduce shoot cooldown** — Change `SHOOT_COOLDOWN` from 3 to 2 ticks (300ms):

```ts
// dungeon-types.ts:194
export const SHOOT_COOLDOWN = 2;  // was 3
```

### Part C — Difficulty Rebalance

Single value change in `DIFFICULTY_PRESETS`:

| Preset | `chaserMoveInterval` (before) | `chaserMoveInterval` (after) |
|--------|-------------------------------|------------------------------|
| Easy | 4 | 4 (unchanged) |
| Normal | 2 | 2 (unchanged) |
| **Hard** | **1** | **2** |
| Nightmare | 1 | 1 (unchanged) |

No other stats change. Hard's difficulty over Normal comes from enemy HP (2 vs 1), more enemies, fewer pickups, and tougher boss — not chaser speed.

## Acceptance Criteria

- [x] WASD keys move the player but do **not** change `aimDirection`
- [x] Arrow keys are the only way to change `aimDirection`
- [x] Player can hold W (move up) while shooting down with ArrowDown — beam goes down, player moves up
- [x] Aiming at a wall and pressing SPACE does **not** consume the shoot cooldown
- [x] `SHOOT_COOLDOWN` is 2 (was 3), making fire rate ~300ms between shots
- [x] Hard mode `chaserMoveInterval` is 2 (was 1)
- [x] All other difficulty stats unchanged
- [x] Game compiles cleanly (`npm run build`)

## Files to Change

### `src/scenes/DungeonCrawlerScene.ts`

1. **Line 1161-1163** — Delete the `MOVE_KEY_DIRECTION` aim-setting block in `onKeyDown()`:
   ```ts
   // DELETE these 3 lines:
   if (MOVE_KEY_DIRECTION[key]) {
     this.player.aimDirection = MOVE_KEY_DIRECTION[key];
   }
   ```

2. **Line 337-349** — Change `spawnBeam()` return type from `void` to `boolean`:
   - Return `false` on walkability check failure (line 341)
   - Return `true` after pushing projectile (after line 348)

3. **Line 194-197** — Wrap cooldown assignment in `if (this.spawnBeam())`:
   ```ts
   if (this.heldKeys.has("Space") && this.player.shootCooldown <= 0) {
     if (this.spawnBeam()) {
       this.player.shootCooldown = SHOOT_COOLDOWN;
     }
   }
   ```

### `src/scenes/dungeon-types.ts`

1. **Line 169** — Change Hard preset's `chaserMoveInterval` from `1` to `2`
2. **Line 194** — Change `SHOOT_COOLDOWN` from `3` to `2`

## Risk Analysis

**Low risk.** All changes are small and isolated:
- Twin-stick: removes 3 lines, no new code paths
- Wall-aim fix: changes return type and adds one `if` wrapper — no new state
- Cooldown reduction: single constant change
- Chaser speed: single constant change
- None of these affect rendering, dungeon generation, or game state structure

**Edge case:** On game reset, `aimDirection` initializes to "right" — already handled by `resetGame()`.

## References

- Difficulty levels brainstorm: `docs/brainstorms/2026-02-16-difficulty-levels-brainstorm.md`
- Key mappings: `src/scenes/dungeon-types.ts:231-246`
- Aim setting in onKeyDown: `src/scenes/DungeonCrawlerScene.ts:1161-1166`
- Shooting input: `src/scenes/DungeonCrawlerScene.ts:190-197`
- spawnBeam: `src/scenes/DungeonCrawlerScene.ts:337-349`
- Shoot cooldown constant: `src/scenes/dungeon-types.ts:194`
- Difficulty presets: `src/scenes/dungeon-types.ts:138-187`
