---
title: "Grid-Based Dungeon Crawler with Rainbow Healing Mechanic"
type: feat
status: active
date: 2026-02-16
brainstorm: docs/brainstorms/2026-02-16-dungeon-crawler-brainstorm.md
---

# Grid-Based Dungeon Crawler with Rainbow Healing Mechanic

## Overview

A medium-scope grid-based dungeon crawler built on the existing Snake game scaffold. The player explores procedurally generated rooms on a 20x20 grid (32px native sprites, 640x640 canvas) using keyboard-only controls (WASD + spacebar + Shift to sprint), heals corrupted enemies with rainbow beams, and progresses through rooms to reach and heal a final boss. Each room is a full 20x20 screen (Zelda NES-style transitions).

**Core experience:** WASD movement (Shift to sprint) + spacebar to shoot rainbow beams in facing direction, healing corrupted enemies through a two-stage death (calm then rainbow dissolve), filling a rainbow power bar to weaken and ultimately heal the boss. Sprite-based visuals using 32px PNG assets loaded via PixiJS.

## Motivation

Extends all three layers of the scaffold architecture:

1. **New Scene logic** — player, enemies, projectiles, rooms, collision, AI, win/lose states
2. **Engine Input extension** — add Shift keys to GAME_KEYS whitelist (sprint modifier)
3. **Engine Renderer extension** — add sprite drawing, progress bars, and alpha-blended rectangles

## Proposed Solution

### Architecture Overview

```
DungeonCrawlerScene (implements Scene)
├── GameState machine (start → playing → gameOver / win)
├── Dungeon (room graph + room data)
│   ├── Room[] (walls, floors, doors, enemy spawns, pickup spawns)
│   └── currentRoomIndex
├── Player (position, facing, health, rainbow power)
├── Entity lists (per room)
│   ├── enemies: Enemy[] (Chaser | Ranger | Boss)
│   ├── projectiles: Projectile[] (player beams + ranger shots)
│   └── pickups: Pickup[] (health)
├── HUD (health bar, rainbow power bar, room indicator)
└── Effects (calm timer, dissolve animation, hit flash)
```

The scene manages all state internally. Room transitions swap which room's data is active — no engine changes needed for scene management.

### Key Decisions (Resolved)

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Controls | Keyboard-only (WASD + spacebar + Shift sprint) | More accessible, no engine mouse extension needed |
| Enemy types | Chaser + Ranger | Chaser moves toward player; Ranger is static, shoots at player |
| Dungeon layout | Room-per-screen | Each room is the full 20x20 grid. Doors at edges transition to next room |
| Ammo | Unlimited | No softlock risk, focus on combat skill not resource management |
| Room generation | Simple procedural | Random room layouts with guaranteed connectivity |
| Projectile movement | Grid-snap (1 cell/tick) | Consistent with grid, simpler collision, retro feel |
| Visuals | 32px native PNG sprites | Crisp 1:1 pixel rendering, detailed art, no scaling blur |
| Grid/canvas | 20x20 at 32px = 640x640 | Same grid density as scaffold, larger cells for sprite detail |
| Boss size | 1x1 | Same collision as other enemies; distinct via unique sprite and behavior |
| Combat | Rainbow healing beams | Thematic twist: "heal" enemies instead of damage |
| Boss mechanic | Rainbow power weakens boss | Each healed enemy fills bar, reducing boss health threshold |

## Technical Approach

### Engine Extensions

#### `Input.ts` — Add Shift keys (sprint modifier)

Add `"ShiftLeft"` and `"ShiftRight"` to the `GAME_KEYS` set so `preventDefault()` fires for the sprint modifier. The scene already receives all key codes, but Shift should be in the whitelist for completeness.

```typescript
// src/engine/Input.ts — add to GAME_KEYS
const GAME_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "KeyW", "KeyA", "KeyS", "KeyD",
  "Space", "ShiftLeft", "ShiftRight",  // ← add Shift for sprint
]);
```

#### `Renderer.ts` — Add sprite and effect helpers

Extend with methods for:

1. **`drawSprite(gridX, gridY, texture)`** — Draw a sprite from a preloaded `Texture` at a grid cell. Uses PixiJS `Sprite` class for crisp 1:1 rendering of 32px PNG assets.
2. **`drawBar(pixelX, pixelY, width, height, fillRatio, fgColor, bgColor)`** — Draw a progress bar (for health and rainbow power).
3. **`drawRectAlpha(gridX, gridY, w, h, color, alpha)`** — Draw a translucent rectangle (for calm enemy fade, overlays).

```typescript
// src/engine/Renderer.ts — new methods

drawSprite(gridX: number, gridY: number, texture: Texture): void {
  // Create PixiJS Sprite, position at gridX * CELL_SIZE, gridY * CELL_SIZE
  // Add to drawContainer (or staticContainer for walls/floors)
}

drawBar(px: number, py: number, w: number, h: number, ratio: number, fg: number, bg: number): void {
  // Background rect + foreground rect scaled by ratio
}

drawRectAlpha(gridX: number, gridY: number, wCells: number, hCells: number, color: number, alpha: number): void {
  // Same as drawRect but with alpha channel
}
```

#### `Renderer` interface in `types.ts` — Add new method signatures

The `Renderer` interface must be updated to include the new methods so the Scene has type-safe access:

```typescript
// src/engine/types.ts — extend Renderer interface
interface Renderer {
  drawRect(gridX: number, gridY: number, w: number, h: number, color: number): void;
  drawText(text: string, px: number, py: number, options?: TextOptions): void;
  drawSprite(gridX: number, gridY: number, texture: Texture): void;
  drawBar(px: number, py: number, w: number, h: number, ratio: number, fg: number, bg: number): void;
  drawRectAlpha(gridX: number, gridY: number, w: number, h: number, color: number, alpha: number): void;
  clear(): void;
  clearStatic(): void;
  readonly stage: Container;
}
```

#### Asset Loading

Sprites are preloaded in `main.ts` before scene creation using PixiJS `Assets`:

```typescript
// src/main.ts — preload sprites before scene init
import { Assets } from "pixi.js";

const textures = await Assets.load([
  "sprites/player.png",
  "sprites/chaser.png",
  "sprites/ranger.png",
  "sprites/boss.png",
  "sprites/wall.png",
  "sprites/floor.png",
  "sprites/door.png",
  "sprites/beam.png",
  "sprites/enemy-shot.png",
  "sprites/health-pickup.png",
  // calm/dissolve variants as needed
]);

const game = new Game(app);
game.loadScene(new DungeonCrawlerScene(textures));
```

The scene receives textures via constructor (not through `GameContext`, keeping the engine generic). Sprites are 32px PNG files stored in `public/sprites/`.

#### `types.ts` — Constants update

Update grid and canvas constants for 32px sprites:

```typescript
export const GRID_SIZE = 20;
export const CELL_SIZE = 32;        // was 30
export const CANVAS_WIDTH = 640;    // was 600
export const CANVAS_HEIGHT = 640;   // was 600
export const TICK_RATE_MS = 150;    // keep — grid-snappy rhythm works for dungeon crawler
export const TICK_RATE_S = 0.15;
```

The 150ms tick rate (~6.67 ticks/sec) gives a grid-snappy retro feel. Enemy speeds are tuned around it (Chasers move every 2 ticks, Rangers fire every 5 ticks) so the rhythm works without changing the tick rate.

#### Renderer Performance Strategy

The current `clear()` + redraw approach creates new PixiJS objects every frame. With 400 wall/floor tiles this will cause GC pressure.

**Strategy: Two-layer rendering.**

```
app.stage
├── staticContainer  ← walls, floors, doors (only redrawn on room transition)
└── drawContainer    ← entities, projectiles, HUD, effects (cleared each frame)
```

The `clear()` method only clears `drawContainer`. A new `clearStatic()` method clears `staticContainer` (called on room transitions). This keeps per-frame object creation manageable (~20-30 objects instead of 400+).

### DungeonCrawlerScene — Game States

```
start → (press Space) → playing → gameOver (health = 0)
                              → win (boss healed)
gameOver → (press Space) → start
win → (press Space) → start
```

### Player

| Property | Value | Notes |
|----------|-------|-------|
| Health | 5 HP | Start value; max 5 |
| Speed | 1 cell/tick | Moves on every tick when key held |
| Facing | 4 directions (up/down/left/right) | Set by last movement direction; starts facing right |
| Shoot | Spacebar | Fires rainbow beam in facing direction |
| Sprint | Hold Shift | Moves 2 cells/tick instead of 1 (double speed) |
| Fire rate | 1 beam per 3 ticks (~450ms cooldown) | Prevents beam spam |
| Invincibility frames | 4 ticks (~600ms) after taking damage | Prevents multi-hit stunlock |

**Movement model:** Hold WASD to move. Each tick, if a movement key is held, move 1 cell in that direction (if not blocked by wall). Hold Shift to sprint at 2 cells/tick — check both intermediate cells for wall collision (same approach as beam collision). This requires tracking held keys via `onKeyDown`/`onKeyUp` flags (including Shift state), checked in `update()`.

### Projectiles

| Property | Player Beam | Ranger Shot |
|----------|------------|-------------|
| Speed | 2 cells/tick | 1 cell/tick |
| Direction | Player's facing direction | Toward player's position at fire time (cardinal only) |
| Visual | Rainbow-colored cell | Dark/evil colored cell |
| Collision | Heals enemies, stopped by walls | Damages player, stopped by walls |
| Lifetime | Until wall hit or grid edge | Until wall hit or grid edge |

**Collision check:** Since beams move 2 cells/tick, check **both intermediate cells** each tick to prevent phasing through enemies. Ranger shots at 1 cell/tick only need single-cell checks.

### Enemies

#### Chaser

| Property | Value |
|----------|-------|
| Health | 2 hits to heal |
| Speed | 1 cell per 2 ticks (half player speed) |
| AI | BFS shortest path toward player through walkable cells |
| Damage | 1 HP on contact with player (per-tick while overlapping) |
| Visual | Corrupted sprite (32px) |

#### Ranger

| Property | Value |
|----------|-------|
| Health | 2 hits to heal |
| Position | Static (does not move) |
| Fire rate | 1 shot per 5 ticks (~750ms) |
| Range | Line of sight only — must have unobstructed cardinal line to player |
| Targeting | Picks the cardinal direction (up/down/left/right) closest to player; only fires if that line is clear of walls |
| Damage | 1 HP per projectile hit |
| Visual | Distinct corrupted sprite (32px, different from Chaser) |

#### Boss

| Property | Value |
|----------|-------|
| Size | 1x1 (same grid cell size as other enemies; distinct via unique sprite and behavior) |
| Health | 5 hits baseline; reduced by rainbow power (min 2 hits at full power) |
| AI | Phase 1: stationary, fires 3-directional spreads. Phase 2 (below 50%): adds Chaser-like movement at half speed |
| Damage | 1 HP on contact; 1 HP per projectile |
| Visual | Unique boss sprite (32px, visually distinct from Chaser/Ranger) |

### Healing Mechanic

When an enemy takes enough rainbow beam hits:

1. **Calm phase** (6 ticks / ~900ms): Enemy stops moving/shooting, sprite swaps to calm variant, alpha fades slightly. Does **not** block movement or projectiles — player can walk through calm enemies.
2. **Dissolve phase** (4 ticks / ~600ms): Enemy fades out with rainbow-colored alpha decrease. Visual: `drawRectAlpha` overlay cycling through rainbow colors with decreasing alpha.
3. **Removed:** Entity removed from room. Rainbow power bar increases.

### Rainbow Power Bar

- Fills incrementally as enemies are healed across all rooms
- Total enemies in dungeon determines fill rate (e.g., 10 enemies = 10% per heal)
- **Effect on boss:** Boss max health = `5 - floor(barFill * 3)`. At 0% bar, boss takes 5 hits. At 100% bar, boss takes 2 hits.
- **UI:** Horizontal bar at top of screen, fills left-to-right with rainbow gradient

### Dungeon Generation

#### Room Structure

Each room is a 20x20 grid of cells. Cell types:

```typescript
type Cell = "wall" | "floor" | "door";
```

Doors are placed at edge midpoints and connect to adjacent rooms.

#### Generation Algorithm

1. **Create room graph:** 5-7 rooms in a linear chain with 1-2 branches. Boss room is always the terminal node furthest from start.
2. **For each room, generate layout:**
   - Fill with walls
   - Carve a rectangular open area (randomized size: 10x10 to 16x16, centered)
   - Add 2-4 interior wall segments (L-shapes, pillars) for cover
   - Place doors at edges matching connected rooms
3. **Populate rooms:**
   - Room 1 (start): No enemies, 1 health pickup. Tutorial feel.
   - Rooms 2-5: 2-4 enemies (mix of Chasers and Rangers), 1-2 health pickups
   - Boss room: Boss only, no pickups (rainbow bar is the preparation)
4. **Validate:** Ensure all floor cells are reachable from the door via flood fill. Regenerate room if not.

#### Room Transitions

When player walks onto a door cell:

1. Record which door they used (determines entry point in next room)
2. Swap `currentRoomIndex`
3. Clear static render layer, redraw new room's walls/floors
4. Position player at the corresponding entry door in the new room
5. Spawn room's enemies and pickups (if not already cleared)

Cleared rooms remain cleared if the player backtracks.

### Tick Resolution Order

Each `update(dt)` call processes in this order:

```
1. Process input flags → update player position (1 or 2 cells if sprinting, checking each) + spawn beam if shooting
2. Move player projectiles (2 cells, checking each)
3. Move enemy projectiles (1 cell)
4. Move enemies (Chasers pathfind, Rangers stay put)
5. Enemy AI decisions (Rangers check line of sight, fire if clear)
6. Collision resolution:
   a. Player beams vs enemies → apply healing
   b. Enemy projectiles vs player → apply damage
   c. Enemy bodies vs player → apply contact damage
7. Update effect timers (calm countdown, dissolve countdown, invincibility frames)
8. Remove dissolved enemies, despawned projectiles
9. Check win/lose conditions
10. Update rainbow power bar
```

This explicit ordering prevents ambiguous simultaneous-event bugs.

### Data Model

```typescript
// src/scenes/DungeonCrawlerScene.ts

interface Point { x: number; y: number; }

type Direction = "up" | "down" | "left" | "right";
type CellType = "wall" | "floor" | "door";
type GameState = "start" | "playing" | "gameOver" | "win";
type EnemyType = "chaser" | "ranger" | "boss";
type EnemyState = "active" | "calm" | "dissolving";

interface Player {
  pos: Point;
  facing: Direction;
  health: number;
  maxHealth: number;
  iFrames: number;        // invincibility ticks remaining
  shootCooldown: number;  // ticks until can fire again
  sprinting: boolean;     // true when Shift held — moves 2 cells/tick
}

interface Enemy {
  pos: Point;
  type: EnemyType;
  state: EnemyState;
  health: number;         // hits remaining to heal
  stateTimer: number;     // ticks remaining in calm/dissolve
  moveCooldown: number;   // ticks until next move (for speed control)
  shootCooldown: number;  // ticks until next shot (rangers/boss only)
}

interface Projectile {
  pos: Point;
  direction: Direction;
  speed: number;          // cells per tick
  isPlayerBeam: boolean;  // true = heals enemies, false = damages player
}

interface Pickup {
  pos: Point;
  type: "health";
  collected: boolean;
}

interface Room {
  grid: CellType[][];     // 20x20
  enemies: Enemy[];
  pickups: Pickup[];
  cleared: boolean;
  connections: Map<Direction, number>;  // direction → room index
}

interface Dungeon {
  rooms: Room[];
  currentRoom: number;
  bossRoom: number;
}
```

### File Structure

```
src/
├── engine/
│   ├── types.ts        # Update constants (32px/640px), extend Renderer interface
│   ├── Game.ts         # No changes needed
│   ├── Renderer.ts     # Add drawSprite, drawBar, drawRectAlpha, static/dynamic layers
│   └── Input.ts        # Add "ShiftLeft"/"ShiftRight" to GAME_KEYS
├── scenes/
│   ├── SnakeScene.ts   # Unchanged (keep as reference)
│   └── DungeonCrawlerScene.ts  # New: all dungeon crawler logic
├── main.ts             # Preload sprite assets, load DungeonCrawlerScene
public/
└── sprites/            # 32px PNG sprite assets
    ├── player.png
    ├── chaser.png
    ├── chaser-calm.png
    ├── ranger.png
    ├── ranger-calm.png
    ├── boss.png
    ├── boss-calm.png
    ├── wall.png
    ├── floor.png
    ├── door.png
    ├── beam.png
    ├── enemy-shot.png
    └── health-pickup.png
```

All game logic lives in `DungeonCrawlerScene.ts`. Utility types/interfaces defined at the top of the same file. Sprite assets in `public/sprites/` are served statically by Vite.

## Implementation Phases

### Phase 1: Foundation

**Goal:** Player moving on a grid with walls, shooting beams, in a single static room with sprite rendering.

**Tasks:**

- [x] Update constants in `src/engine/types.ts` (CELL_SIZE=32, CANVAS=640x640)
- [x] Update `Renderer` interface in `src/engine/types.ts` with new method signatures
- [x] Add `"ShiftLeft"` and `"ShiftRight"` to `GAME_KEYS` in `src/engine/Input.ts`
- [x] Add `drawSprite()`, `drawBar()`, `drawRectAlpha()` to `src/engine/Renderer.ts`
- [x] Add static/dynamic two-layer rendering to `src/engine/Renderer.ts`
- [ ] Create placeholder 32px PNG sprites in `public/sprites/` (player, wall, floor, door, beam)
- [ ] Set up asset preloading in `src/main.ts` via PixiJS `Assets`
- [x] Create `src/scenes/DungeonCrawlerScene.ts` with game state machine (start/playing/gameOver/win)
- [x] Implement player movement (WASD, held-key tracking via `onKeyDown`/`onKeyUp` flags)
- [x] Implement facing direction (player sprite or visual indicator for current direction)
- [x] Implement wall collision (player cannot move into wall cells)
- [x] Implement rainbow beam shooting (spacebar, fires in facing direction, 2 cells/tick)
- [x] Implement sprint mechanic (hold Shift to move 2 cells/tick, check both cells for wall collision)
- [x] Implement beam collision with walls (despawn on hit)
- [x] Create one hand-designed test room (walls, open area, doors)
- [x] Render floor, walls, player, and beams using colored rectangles (sprites deferred to Phase 4)
- [x] Update `src/main.ts` to preload assets and load `DungeonCrawlerScene`
- [x] Start/playing state transitions (Space to begin)

**Success criteria:** Player can move around a sprite-rendered room, shoot beams that travel and hit walls. Feels responsive. Sprites render crisp at 1:1.

### Phase 2: Enemies & Combat

**Goal:** Two enemy types with AI, healing mechanic, and damage.

**Tasks:**

- [ ] Implement Chaser enemy (BFS pathfinding toward player, moves every 2 ticks)
- [ ] Implement Ranger enemy (static, line-of-sight check, fires every 5 ticks)
- [ ] Implement enemy projectiles (Ranger shots, 1 cell/tick, damages player)
- [ ] Implement beam-enemy collision (beam hits enemy, reduces heal counter)
- [ ] Implement two-stage healing death (calm phase 6 ticks → dissolve phase 4 ticks → removed)
- [ ] Implement player health and damage (contact damage from Chasers, projectile damage from Rangers)
- [ ] Implement invincibility frames (4 ticks after taking damage)
- [ ] Implement shoot cooldown (1 beam per 3 ticks)
- [ ] Implement tick resolution order (movement → projectiles → AI → collision → effects → cleanup)
- [ ] Implement health HUD (player health bar)
- [ ] Implement game over state (health reaches 0)
- [ ] Place enemies in the test room for combat testing
- [ ] Tune tick rate if 150ms feels too slow for combat

**Success criteria:** Player can fight Chasers and Rangers. Enemies heal with the two-stage death animation. Player can die. Combat feels fair.

### Phase 3: Dungeon & Progression

**Goal:** Multiple rooms, room transitions, rainbow power bar, boss fight.

**Tasks:**

- [ ] Implement dungeon data structure (room graph, connections)
- [ ] Implement room transition (walk onto door → swap room, reposition player)
- [ ] Implement procedural room generation (carve open area, add interior walls, validate reachability)
- [ ] Implement dungeon graph generation (5-7 rooms, linear chain + branches, boss room at end)
- [ ] Implement room population (enemy spawns, pickup spawns based on room position)
- [ ] Implement health pickups (walk over to collect, restores 1 HP)
- [ ] Implement rainbow power bar (fills on enemy heal, displayed as HUD bar)
- [ ] Implement boss enemy (1x1, phase 1 stationary spread shot, phase 2 adds movement)
- [ ] Implement rainbow power → boss health reduction mechanic
- [ ] Implement win state (boss healed → win screen)
- [ ] Implement room cleared tracking (backtracking to cleared rooms stays safe)
- [ ] Static layer rendering for walls (redraw only on room transition)
- [ ] Room indicator in HUD (which room, how many cleared)

**Success criteria:** Player can explore multiple rooms, heal enemies to fill the rainbow bar, reach the boss room, and win. Full gameplay loop works.

### Phase 4: Polish & Visual Effects

**Goal:** The game looks and feels good.

**Tasks:**

- [ ] Implement calm-phase visual (sprite swap to calm variant, slight transparency)
- [ ] Implement dissolve-phase visual (rainbow color cycling overlay with fading alpha)
- [ ] Implement rainbow beam visual (multi-colored or color-cycling sprite)
- [ ] Implement hit flash on player when damaged
- [ ] Create final sprite art for all entities (replace placeholders from Phase 1)
- [ ] Polish start screen (title, controls instructions, theme)
- [ ] Polish game over screen (score/stats, restart prompt)
- [ ] Polish win screen (celebration, stats)
- [ ] Balance pass: enemy count per room, enemy speed, boss health curve, pickup frequency
- [ ] Edge case testing: empty rooms, full rainbow bar before boss, backtracking, dying in boss room

**Success criteria:** Game is visually polished and balanced. All screens feel complete. No obvious bugs or softlocks.

## Alternative Approaches Considered

| Approach | Why Rejected |
|----------|-------------|
| Mouse aiming | Less accessible, requires Input.ts mouse extension, sub-cell angle math |
| Patrol enemy (walks a path) | Ranger provides clearer contrast with Chaser; static + ranged vs mobile + melee |
| Limited ammo | Softlock risk if player runs out with enemies alive; adds complexity without proportional fun |
| One big grid (whole dungeon on 20x20) | Rooms would be 4x4 to 8x8 — too cramped for combat. Room-per-screen gives full 20x20 per room |
| Scrolling camera | Requires camera system the engine doesn't have; room-per-screen achieves similar result with less engine work |
| ECS for entities | Overkill for ~10-15 entities; flat arrays with type discriminators are sufficient and match the scaffold's teaching style |
| Separate files per system | SnakeScene is self-contained in one file; dungeon crawler should follow the same pattern for consistency |
| Emoji as sprites | Quick to prototype but inconsistent across platforms and lacks visual detail; real 32px PNGs look better and render predictably |

## Acceptance Criteria

### Functional Requirements

- [ ] Player moves with WASD on a 20x20 grid, blocked by walls
- [ ] Player shoots rainbow beams with spacebar in their facing direction
- [ ] Player can hold Shift to sprint (2 cells/tick instead of 1)
- [ ] Beams travel at 2 cells/tick and stop at walls or enemies
- [ ] Chaser enemies pathfind toward the player
- [ ] Ranger enemies shoot at the player when they have line of sight
- [ ] Enemies become calm, then dissolve, when fully healed by rainbow beams
- [ ] Rainbow power bar fills as enemies are healed
- [ ] Multiple rooms connected by doors with Zelda-style transitions
- [ ] Boss in final room with health affected by rainbow power bar
- [ ] Health pickups restore player HP
- [ ] Start, playing, game over, and win states with appropriate screens
- [ ] Cleared rooms stay cleared on backtrack

### Non-Functional Requirements

- [ ] Steady 60fps with room-per-screen rendering (static layer for walls)
- [ ] All game logic uses fixed timestep (no `Date.now()` in scene)
- [ ] Scene implements the Scene interface correctly
- [ ] Engine extensions (Renderer, Input) are clean additions, not hacks

### Quality Gates

- [ ] `npm run build` passes with no TypeScript errors
- [ ] Game is playable from start to win condition
- [ ] Game is playable from start to game-over condition
- [ ] All rooms in generated dungeon are reachable (flood fill validation)
- [ ] No softlocks (player can always progress or die)

## Dependencies & Prerequisites

- Existing Snake scaffold must be working (`npm run dev` serves the game)
- 32px PNG sprite assets must be created or sourced (placeholder sprites for Phase 1, polished art by Phase 4)
- No external dependencies needed — everything builds on existing stack + PixiJS built-in `Assets` loader

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Procedural gen produces bad layouts | High | Medium | Validate with flood fill; fall back to hand-designed rooms if gen is unreliable |
| 150ms tick feels sluggish for combat | Medium | High | Constants in one place; tune to 100ms if needed during Phase 2 |
| Renderer GC pressure with many objects | Medium | Medium | Two-layer rendering (static walls, dynamic entities) |
| BFS pathfinding bugs in corridors | Medium | Low | 20x20 grid is small; BFS is simple to debug and visualize |
| Scope creep on boss mechanics | Medium | Medium | Phase 1-2 are boss-free; boss is Phase 3 with defined constraints |
| Sprite asset creation bottleneck | Medium | Medium | Start with simple placeholder sprites (colored shapes as PNGs); replace with detailed art in Phase 4 |

## Future Considerations

- **Sound effects** — PixiJS doesn't handle audio; could add Howler.js later
- **Multiple dungeon floors** — extend dungeon generation to create floor progression
- **More enemy types** — add Patrol (walks a path) or Exploder (charges and bursts)
- **Persistent upgrades** — rainbow power carries across runs
- **Minimap** — show room layout and cleared status in corner of HUD

## References & Research

### Internal References

- Architecture pattern: `docs/solutions/best-practices/scene-based-game-engine-architecture-20260215.md`
- Critical patterns: `docs/solutions/patterns/critical-patterns.md`
- Snake reference implementation: `src/scenes/SnakeScene.ts`
- Engine interface: `src/engine/types.ts`
- Brainstorm: `docs/brainstorms/2026-02-16-dungeon-crawler-brainstorm.md`

### Brainstorm Divergences

The plan diverges from the brainstorm in these areas (decided during planning):

| Topic | Brainstorm | Plan | Reason |
|-------|-----------|------|--------|
| Enemy type #2 | Patrol (walks path) | Ranger (static, shoots) | Clearer contrast with Chaser; decided in conversation |
| Input model | Mouse + keyboard | Keyboard only | More accessible, simpler engine changes |
| Dungeon layout | "On the 20x20 grid" (ambiguous) | Room-per-screen | Full 20x20 per room gives enough space for combat |
| Ammo | Health and ammo pickups | Health pickups only; unlimited ammo | Eliminates softlock risk |
| Visuals | Sprite/icon rendering (unspecified) | 32px native PNG sprites | Real sprite art over emoji; crisp integer-scale rendering |
| Cell size | 30px / 600x600 | 32px / 640x640 | Accommodates 32px sprite assets at 1:1 |
| Boss size | 2x2 cells | 1x1 cell | Avoids special collision/pathfinding for multi-cell entity |
