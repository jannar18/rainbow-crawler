---
title: "Phase 4: Visual Polish — Sprites, Effects, UI, Balance"
type: feat
status: active
date: 2026-02-16
parent: docs/plans/2026-02-16-feat-grid-based-dungeon-crawler-plan.md
brainstorms:
  - docs/brainstorms/2026-02-16-rainbow-crawler-art-direction-brainstorm.md
  - docs/brainstorms/2026-02-16-asset-sourcing-brainstorm.md
---

# Phase 4: Visual Polish — Sprites, Effects, UI, Balance

## Overview

Replace all colored rectangles with sprite art, add visual effects for healing/combat, polish UI screens, and balance gameplay. The game is fully playable after Phase 3 — this phase makes it look and feel good.

**Sprite packs (both FREE, CC-0):**
- **0x72's DungeonTileset II** — dungeon tiles, props, UI hearts, weapons
- **SuperDark's Enchanted Forest Characters** — fairy player, wolf, gnolls, troll, mushrooms

Both are 16x16 PNG frames. Rendered at 2x scale to fill 32x32 cells (chunky retro look).

## Sprite-to-Entity Mapping

Each enemy has a **corrupted** (active) and **healed** (calm/dissolve) form — completely different sprites to sell the transformation.

| Game Entity | Corrupted Sprite | Healed Sprite | Notes |
|---|---|---|---|
| **Player** | — | Fairy or Wizard (player choice at start screen) | Enchanted Forest pack. 4 frames each |
| **Chaser** | Gnoll (Enchanted Forest) | Elf M or F (random per enemy) | GnollBrute for idle/walk. Healed = friendly elf |
| **Ranger** | Chort (0x72) | Large Mushroom (Enchanted Forest) | Chort = little demon. Healed = peaceful mushroom |
| **Boss** | Golem (Enchanted Forest) | Forest Guardian (Enchanted Forest) | Golem has 6 frames. Guardian = golden armor protector |
| **Walls** | 0x72 DungeonTileset | — | `wall_mid.png`, edge variants |
| **Floor** | 0x72 DungeonTileset | — | `floor_1.png` through `floor_8.png` (random variation) |
| **Doors** | 0x72 DungeonTileset | — | `doors_leaf_closed.png` / `doors_leaf_open.png` |
| **Health pickup** | 0x72 DungeonTileset | — | `ui_heart_full.png` |
| **Rainbow beam** | Procedural | — | Colored rectangles cycling soft rainbow palette |
| **Enemy shot** | Procedural | — | Small dark rectangle |

### Sprite Files Needed

**Player options (Enchanted Forest):**
- `Fairy_Idle + Walk_1-4.png` (4 frames)
- `Wizard_Idle + Walk_1-4.png` (4 frames)

**Chaser — corrupted (Enchanted Forest):**
- `GnollBrute_Idle_1-4.png`, `GnollBrute_Walk_1-4.png`

**Chaser — healed (Enchanted Forest):**
- `Elf_F_Idle_1-4.png`, `Elf_M_Idle_1-4.png`

**Ranger — corrupted (0x72):**
- `chort_idle_anim_f0-3.png`, `chort_run_anim_f0-3.png`

**Ranger — healed (Enchanted Forest):**
- `LargeMushroom_Idle_1-4.png`

**Boss — corrupted (Enchanted Forest):**
- `Golem_Idle_1-6.png`, `Golem_Walk_1-6.png` (6 frames!)

**Boss — healed (Enchanted Forest):**
- `ForestGuardian_Idle_1-4.png`, `ForestGuardian_walk_1-4.png`

**Tiles (0x72):**
- Walls: `wall_mid.png`, `wall_left.png`, `wall_right.png`, `wall_top_mid.png`, `wall_top_left.png`, `wall_top_right.png`
- Floors: `floor_1.png` through `floor_8.png`
- Doors: `doors_leaf_closed.png`, `doors_leaf_open.png`, `doors_frame_left.png`, `doors_frame_right.png`, `doors_frame_top.png`
- UI: `ui_heart_full.png`, `ui_heart_empty.png`, `ui_heart_half.png`
- Props: `flask_big_red.png` (alt health pickup)

## Technical Approach

### 4.1 — Asset Pipeline & Loading

**Copy sprites into project:**
```
public/sprites/
├── player/          # Fairy frames
├── chaser/          # Wolf frames
├── ranger/          # GnollShaman frames
├── boss/            # Troll frames
├── tiles/           # 0x72 wall, floor, door tiles
├── ui/              # ui_heart_full, ui_heart_empty, ui_heart_half
└── props/           # flask_red (health pickup), etc.
```

**Load via PixiJS Assets in `main.ts`:**
```typescript
import { Assets } from "pixi.js";

// Define a manifest or load individual files
await Assets.load([
  "sprites/player/Fairy_Idle + Walk_1.png",
  // ... etc
]);
```

Or use a **spritesheet approach**: combine frames into a single atlas PNG + JSON manifest for fewer HTTP requests. PixiJS `Assets` natively supports spritesheets.

**Pass textures to scene:** Via constructor (keeps engine generic):
```typescript
const scene = new DungeonCrawlerScene(textures);
game.loadScene(scene);
```

### 4.2 — Renderer Changes

**Update `drawSprite` to handle 16x16→32x32 scaling:**

Current `drawSprite` creates a Sprite at native size. For 16x16 assets in 32x32 cells, the sprite needs `width = CELL_SIZE` and `height = CELL_SIZE`:

```typescript
// src/engine/Renderer.ts
drawSprite(gridX: number, gridY: number, texture: Texture): void {
  const s = new Sprite(texture);
  s.x = gridX * CELL_SIZE;
  s.y = gridY * CELL_SIZE;
  s.width = CELL_SIZE;   // ← scale 16x16 to 32x32
  s.height = CELL_SIZE;  // ← scale 16x16 to 32x32
  this.drawContainer.addChild(s);
}
```

**Add `drawSpriteStatic` for wall/floor tiles** (same as above but on `staticContainer`).

**Add `drawSpriteAlpha` for calm/dissolving enemies:**
```typescript
drawSpriteAlpha(gridX: number, gridY: number, texture: Texture, alpha: number): void
```

**Add `drawSpriteTinted` for dissolve rainbow cycling:**
```typescript
drawSpriteTinted(gridX: number, gridY: number, texture: Texture, tint: number, alpha: number): void
```

### 4.3 — Animation System

Simple frame-based animation driven by the existing tick counter. No new engine system needed.

```typescript
// In DungeonCrawlerScene — helper to pick animation frame
function animFrame(tickCounter: number, frameCount: number, ticksPerFrame: number): number {
  return Math.floor(tickCounter / ticksPerFrame) % frameCount;
}
```

- **Player idle:** Cycle Fairy frames at 4 ticks/frame (≈600ms per cycle)
- **Enemy idle:** Same rate
- **Enemy walk:** Faster cycle at 2 ticks/frame when moving
- **Calm phase:** Slow down to 6 ticks/frame (dreamy pace)

### 4.4 — Rendering Replacements

**Room rendering (`renderRoom`):**
- Replace `drawRectStatic(x, y, 1, 1, COLOR_WALL)` → `drawSpriteStatic(x, y, wallTexture)`
- Replace `drawRectStatic(x, y, 1, 1, COLOR_FLOOR)` → `drawSpriteStatic(x, y, floorTextures[random])`
- Replace `drawRectStatic(x, y, 1, 1, COLOR_DOOR)` → `drawSpriteStatic(x, y, doorTexture)`
- Use wall edge/corner variants based on neighbor analysis (wall_left, wall_right, wall_top_mid, etc.)

**Entity rendering (`renderEntities`):**
- Player: `drawSprite(x, y, fairyFrames[animFrame(...)])`
- Active enemies: `drawSprite(x, y, enemyFrames[type][animFrame(...)])`
- Calm enemies: `drawSpriteAlpha(x, y, enemyFrames[type][0], pulsing alpha)`
- Dissolving enemies: `drawSpriteTinted(x, y, enemyFrames[type][0], RAINBOW_COLORS[idx], fading alpha)`
- Pickups: `drawSprite(x, y, heartTexture)`
- Beams: Keep `drawRect` with rainbow colors (procedural particle look)
- Enemy shots: Keep `drawRect` with dark color

**Facing indicator:**
- Remove the thin colored rectangle
- Instead, draw a small magic staff/wand sprite or glowing orb offset in the facing direction

**HUD rendering (`renderHUD`):**
- Replace health bar with heart sprites: `ui_heart_full`, `ui_heart_half`, `ui_heart_empty`
- Keep rainbow power bar as a `drawBar` with cycling color (looks good already)
- Update text colors to warm cream (`0xffeedd`) per art direction

### 4.5 — Visual Effects

**Hit flash (player damaged):**
- Current: player color alternates between green and red during iFrames
- New: alternate between normal sprite and a white-tinted version (or skip rendering every other frame for classic blink)

**Calm phase:**
- Sprite slows its animation cycle
- Alpha pulses between 0.5 and 0.8
- Optional: apply a white/pastel tint to desaturate

**Dissolve phase:**
- Sprite tint cycles through `RAINBOW_COLORS` array (one color per tick)
- Alpha fades from 0.8 → 0.0 over 4 ticks
- Optional: spawn 2-3 small colored rectangles drifting upward (ascending sparkles)

**Rainbow beam:**
- Keep current behavior (colored rectangles) but cycle color per-cell in the beam
- Each cell in the beam gets the next rainbow color → the stream shows the full spectrum
- Use the soft rainbow palette from art direction: `0xff6b6b`, `0xffa06b`, `0xffd93d`, `0x6bcf7f`, `0x6bb5ff`, `0x9b7dff`, `0xd97dff`

### 4.6 — UI Screen Polish

**Start screen:**
- Dark overlay stays
- Title "Rainbow Crawler" in larger font with warm cream color
- Fairy idle animation playing centered below title
- Controls list below: "WASD: Move | Shift: Sprint | Space: Shoot"
- Subtitle: "Heal the darkness" in soft violet (`0x9b7dff`)

**Game Over screen:**
- Dark overlay
- "Game Over" in soft red (`0xff6b6b`)
- Show stats: rooms explored, enemies healed, rainbow power reached
- "Press Space to retry"

**Win screen:**
- Dark overlay
- "Darkness Healed!" in rainbow gradient (draw each word/letter in a different rainbow color)
- Stats: rooms cleared, total enemies healed, time survived
- "Press Space to play again"

### 4.7 — Balance Pass

| Parameter | Current | Adjust? | Notes |
|---|---|---|---|
| Enemies per room | 2-4 | Test with sprites — visual readability may change difficulty feel | |
| Chaser speed | 1 cell/2 ticks | Probably fine | Wolf sprite will make it feel faster |
| Ranger fire rate | 1 shot/5 ticks | Probably fine | |
| Boss health | 5 (reduced by rainbow bar) | Test full loop | |
| Health pickups | 1-2 per room | May need more if rooms are harder with visual distractions | |
| Player health | 5 HP | Probably fine | |
| iFrames | 4 ticks | Probably fine | |

### 4.8 — Edge Case Testing

- [ ] Empty rooms (no enemies) — should render cleanly with just tiles
- [ ] Full rainbow bar before reaching boss — boss should take minimum 2 hits
- [ ] Backtracking through cleared rooms — no enemies, tiles still rendered
- [ ] Dying in boss room — game over screen, restart works
- [ ] Rapid room transitions — static layer redraws correctly each time
- [ ] All 8 floor tile variants render without visual glitches
- [ ] Wall edge detection picks correct tile variant at all boundary cases

## Acceptance Criteria

- [ ] Player rendered as Fairy sprite with idle animation
- [ ] Chaser enemies rendered as Wolf sprites with idle/walk animation
- [ ] Ranger enemies rendered as GnollShaman sprites with idle animation
- [ ] Boss rendered as Troll sprite with idle/walk animation
- [ ] Walls rendered with 0x72 wall tiles (edge-aware variants)
- [ ] Floors rendered with random 0x72 floor tile variants
- [ ] Doors rendered with 0x72 door sprites
- [ ] Health pickups rendered as heart sprites
- [ ] Calm enemies show desaturated/alpha-pulsing sprite
- [ ] Dissolving enemies show rainbow-tinted fading sprite
- [ ] Player blinks/flashes when hit (iFrames visual)
- [ ] Rainbow beam uses soft rainbow color palette
- [ ] HUD uses heart sprites for health
- [ ] Start screen shows title, fairy animation, controls, subtitle
- [ ] Game Over screen shows stats
- [ ] Win screen shows congratulations + stats
- [ ] `npm run build` passes with no TypeScript errors
- [ ] Game playable start-to-win and start-to-game-over
- [ ] No PixiJS memory leaks (destroy sprites on clear)

## Implementation Order

Suggested order to minimize risk and see progress early:

1. **Asset pipeline** — Extract zips, copy frames to `public/sprites/`, set up loading in `main.ts`
2. **Renderer updates** — Add `drawSpriteStatic`, `drawSpriteAlpha`, `drawSpriteTinted`, fix `drawSprite` scaling
3. **Room tiles** — Replace wall/floor/door rects with sprites (biggest visual payoff, static layer)
4. **Player sprite** — Replace player rect with Fairy animation
5. **Enemy sprites** — Replace enemy rects with Wolf/GnollShaman/Troll animations
6. **Pickup sprite** — Replace health pickup rect with heart
7. **Heal effects** — Calm desaturation + dissolve rainbow tint
8. **Hit flash** — Player blink during iFrames
9. **Rainbow beam colors** — Update beam to use soft rainbow palette
10. **HUD polish** — Heart sprites for health, warm cream text colors
11. **Screen polish** — Start/GameOver/Win screens with text and sprite flourishes
12. **Balance pass** — Playtest and tune
13. **Edge case testing** — Full sweep

## Dependencies

- Sprite packs downloaded (both in `~/Documents/` — ready to extract)
- No new npm dependencies needed
- PixiJS `Assets` API already available (imported but unused in current code)

## Risks

| Risk | Mitigation |
|---|---|
| 16x16 sprites look blurry at 2x | Use `texture.source.scaleMode = 'nearest'` for crisp pixel scaling |
| Wall tile selection gets complex (many edge cases) | Start simple: one wall tile for all walls. Add edge variants incrementally |
| Too many textures cause loading delay | Bundle into spritesheets if needed; 16x16 PNGs are tiny though |
| Sprite filenames with spaces/special chars (`Fairy_Idle + Walk_1.png`) | Rename on copy to remove spaces: `fairy_idle_walk_1.png` |
| Animation timing feels off at 150ms tick rate | Decouple animation from game ticks — use a separate frame counter or sub-tick interpolation |

## References

- Art direction: `docs/brainstorms/2026-02-16-rainbow-crawler-art-direction-brainstorm.md`
- Asset sourcing: `docs/brainstorms/2026-02-16-asset-sourcing-brainstorm.md`
- Phase 1-3 review fixes: `docs/solutions/patterns/pixijs-v8-phase1-review-20260216.md`
- PixiJS memory pattern: Always `destroy()` after `removeChildren()` — `docs/solutions/patterns/critical-patterns.md`
- Scene lifecycle ordering: Init before setScene — `docs/solutions/integration-issues/phase3-review-findings-lifecycle-and-cleanup-20260216.md`
- Current scene code: `src/scenes/DungeonCrawlerScene.ts` (1378 lines)
- Renderer: `src/engine/Renderer.ts`
