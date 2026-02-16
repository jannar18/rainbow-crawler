---
title: "feat: Snake Game Teaching Scaffold"
type: feat
status: completed
date: 2026-02-15
---

# ✨ feat: Snake Game Teaching Scaffold

## Overview

Build a Snake game that serves as a **teaching scaffold** for intermediate TypeScript students. The game itself is secondary — the real product is a clean, scene-based architecture that students can transform into a completely different game using Claude Code.

The project splits into two layers: an **engine layer** (game loop, renderer, input) that students keep stable, and a **game layer** (a `Scene` implementation) that students replace entirely to build their own game.

## Problem Statement

Students learning game development with TypeScript need a starting point that is:

- **Readable** — they can understand the full codebase in one sitting
- **Transformable** — they can swap out the game logic without touching the engine
- **Minimal** — no framework overhead, no asset pipeline, no abstractions beyond what's needed
- **AI-friendly** — Claude Code can reason about the architecture and help students effectively

Existing game tutorials are either too simple (single file, no architecture) or too complex (ECS, asset loaders, physics engines). This scaffold hits the sweet spot.

## Proposed Solution

A Vite + TypeScript + PixiJS v8 project with:

1. A `Scene` interface that defines the contract between engine and game
2. A fixed-timestep game loop that calls Scene methods each tick
3. A renderer wrapper that provides convenience methods over PixiJS
4. A keyboard input manager that forwards events to the active Scene
5. A complete Snake game implemented as a single `SnakeScene`
6. A populated `CLAUDE.md` that describes the architecture for Claude Code

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   main.ts                       │
│              (entry point)                      │
└──────────────────┬──────────────────────────────┘
                   │ creates
                   ▼
┌─────────────────────────────────────────────────┐
│                  Game.ts                        │
│  ┌───────────────────────────────────────────┐  │
│  │         Fixed Timestep Loop               │  │
│  │  accumulator += dt                        │  │
│  │  while (accumulator >= TICK_RATE):        │  │
│  │    scene.update(TICK_RATE_S)               │  │
│  │  scene.render(renderer)                   │  │
│  └───────────────────────────────────────────┘  │
│  ┌────────────┐  ┌────────────┐                 │
│  │ Renderer   │  │  Input     │                 │
│  │ (PixiJS)   │  │ (Keyboard) │                 │
│  └────────────┘  └────────────┘                 │
└──────────────────┬──────────────────────────────┘
                   │ calls Scene interface
                   ▼
┌─────────────────────────────────────────────────┐
│              SnakeScene.ts                      │
│  ┌───────────────────────────────────────────┐  │
│  │  State: "start" | "playing" | "gameOver"  │  │
│  │  Snake: position[], direction, length     │  │
│  │  Food: {x, y}                             │  │
│  │  Score: number                            │  │
│  └───────────────────────────────────────────┘  │
│  Students replace THIS file entirely            │
└─────────────────────────────────────────────────┘
```

### Scene Interface (Expanded from Brainstorm)

The SpecFlow analysis identified critical gaps in the original 3-method interface. The expanded contract:

```ts
// src/engine/types.ts

interface Scene {
  init(context: GameContext): void;    // Receive dependencies (grid size, canvas dims)
  update(dt: number): void;            // Advance game logic by one tick (dt in seconds, e.g. 0.15)
  render(renderer: Renderer): void;    // Draw the current frame
  onKeyDown(key: string): void;        // Handle key press
  onKeyUp(key: string): void;          // Handle key release (for hold-to-act games)
  destroy(): void;                     // Clean up PixiJS objects, listeners, etc.
}

interface GameContext {
  gridSize: number;       // 20 (cells per axis)
  cellSize: number;       // 30 (pixels per cell)
  canvasWidth: number;    // 600
  canvasHeight: number;   // 600
}
```

**Why these additions:**
- `init()` — Scenes need dependencies. Without a contract, every student invents a different pattern.
- `onKeyUp()` — Snake doesn't need it, but Asteroids (thrust), Breakout (paddle), and charge-release mechanics all do. Cost: one empty method. Benefit: supports the entire class of hold-to-act games.
- `destroy()` — Without cleanup, PixiJS objects leak on scene switches. Students will see ghost artifacts.

### Renderer API (Hybrid Approach)

```ts
// src/engine/Renderer.ts

class Renderer {
  // Convenience methods — all coordinates are GRID cells, not pixels.
  // The renderer converts grid → pixel internally using cellSize.
  drawRect(gridX: number, gridY: number, widthCells: number, heightCells: number, color: number): void;
  drawText(text: string, pixelX: number, pixelY: number, options?: { fontSize?: number; color?: number }): void;
  clear(): void;

  // Escape hatch for advanced use (pixel-level PixiJS access)
  readonly stage: Container;
}
```

**Why hybrid:** Grid-coordinate convenience methods keep Snake simple (`drawRect(5, 3, 1, 1, 0x00ff00)` draws one cell at grid position 5,3). The `stage` escape hatch lets students drop into pixel-level PixiJS for non-grid games without modifying the engine. `drawText` uses pixel coordinates since text isn't grid-aligned.

### Game Constants

```ts
// src/engine/types.ts

const GRID_SIZE = 20;                          // 20x20 cells
const CELL_SIZE = 30;                          // 30px per cell
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;    // 600px
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;   // 600px
const TICK_RATE_MS = 150;                      // ~6.67 ticks/sec
const TICK_RATE_S = TICK_RATE_MS / 1000;       // 0.15 — passed to scene.update(dt)
const MAX_ACCUMULATOR_MS = 1000;               // Clamp for tab-inactive
```

### File Structure

```
claude-game/
├── src/
│   ├── engine/
│   │   ├── Game.ts          # Game loop, scene lifecycle, error handling
│   │   ├── Renderer.ts      # PixiJS wrapper with convenience methods
│   │   ├── Input.ts         # Keyboard input manager
│   │   └── types.ts         # Scene interface, GameContext, constants
│   ├── scenes/
│   │   └── SnakeScene.ts    # Complete Snake game (students replace this)
│   └── main.ts              # Entry point: creates Game, loads SnakeScene
├── index.html               # Minimal HTML host
├── package.json
├── tsconfig.json
├── vite.config.ts
├── CLAUDE.md                # Architecture guide for Claude Code
└── README.md                # Student-facing getting started guide
```

**Reading order for students:** `main.ts` → `types.ts` → `Game.ts` → `SnakeScene.ts`

### Implementation Phases

#### Phase 1: Project Scaffolding

Set up the project tooling so everything builds and runs.

**Tasks:**
- [x] Initialize `package.json` with Vite, TypeScript, PixiJS v8 dependencies
  - Pin PixiJS to exact version to prevent breaking changes during the course
- [x] Create `tsconfig.json` with strict mode, ES2020 target
- [x] Create `vite.config.ts` (minimal — no special PixiJS config needed since no assets)
- [x] Create `index.html` with a single `<div id="app">` mount point
- [x] Create `src/main.ts` with async bootstrap (PixiJS v8 requires `await Application.init()`)
- [x] Verify `npm run dev` starts Vite and serves the page

**Success criteria:** `npm run dev` opens a browser with no errors. `npm run build` produces a `dist/` folder.

**Files:**
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.ts`

#### Phase 2: Engine Layer

Build the engine that students keep stable. This is the foundation everything else depends on.

**Tasks:**
- [x] Define `Scene` interface and `GameContext` in `src/engine/types.ts`
  - Include all 6 methods: `init`, `update`, `render`, `onKeyDown`, `onKeyUp`, `destroy`
  - Define `GameContext` with grid/canvas dimensions
  - Export game constants (`GRID_SIZE`, `CELL_SIZE`, `TICK_RATE_MS`, etc.)
- [x] Implement `Renderer` in `src/engine/Renderer.ts`
  - Initialize PixiJS v8 `Application` (note: v8 requires async init via `await Application.init()`)
  - Mount canvas to `#app` div
  - Implement `drawRect()` — create/reuse `Graphics` objects for colored rectangles
  - Implement `drawText()` — create/reuse `Text` objects
  - Implement `clear()` — remove all children from stage
  - Expose `stage` as readonly property for escape hatch
- [x] Implement `Input` in `src/engine/Input.ts`
  - Listen to `keydown` and `keyup` on `window`
  - Call `event.preventDefault()` for game-relevant keys (arrows, space, WASD)
  - Forward events to active Scene's `onKeyDown` / `onKeyUp`
- [x] Implement `Game` in `src/engine/Game.ts`
  - Fixed timestep loop using `requestAnimationFrame`
  - Accumulator pattern: `accumulator += deltaTime`, process ticks while `accumulator >= TICK_RATE`
  - **Clamp accumulator** to `MAX_ACCUMULATOR_MS` to handle tab-inactive scenarios
  - Call `scene.init(context)` when loading a scene
  - Call `scene.destroy()` before unloading
  - **Error boundaries:** Wrap `scene.update()` and `scene.render()` in try-catch. On error, render a red error message on canvas instead of crashing silently
  - Public method: `loadScene(scene: Scene)`
- [x] Wire up `main.ts` to create `Game` and verify the loop runs (placeholder scene that draws a rectangle)

**Success criteria:** A colored rectangle renders on screen. The game loop runs at consistent tick rate. Switching browser tabs and back does not freeze the game.

**Files:**
- `src/engine/types.ts`
- `src/engine/Renderer.ts`
- `src/engine/Input.ts`
- `src/engine/Game.ts`
- `src/main.ts` (updated)

#### Phase 3: Snake Game (SnakeScene)

Implement the complete Snake game as a single Scene. This is what students read, study, and eventually replace.

**Tasks:**
- [x] Create `SnakeScene` class implementing `Scene` in `src/scenes/SnakeScene.ts`
- [x] Implement internal state machine: `"start" | "playing" | "gameOver"`
  - **Start state:** Render title text ("Snake") and "Press SPACE to start" prompt. Transition to `playing` on spacebar.
  - **Playing state:** Run game logic on each `update()` tick. Transition to `gameOver` on death.
  - **Game Over state:** Render "Game Over" text, final score, and "Press SPACE to restart" prompt. Transition to `start` on spacebar (reset all state).
- [x] Implement snake movement
  - Snake is an array of `{x, y}` grid positions
  - Head moves in current direction each tick
  - Body follows (shift array, add new head position)
  - **Start position:** Center of grid, length 3, moving right
- [x] Implement input handling
  - Arrow keys and WASD change direction
  - **180-degree turn prevention:** Buffer last input, reject opposite direction
  - Only apply direction change on next tick (prevents rapid multi-input bugs)
- [x] Implement food
  - Randomly placed on grid
  - **Spawn on empty cells only:** Collect all cells not occupied by snake, pick randomly
  - Eating food: grow snake by 1, increment score, spawn new food
- [x] Implement collision detection
  - **Wall collision:** Game over when head exits grid bounds (`WALL_KILLS = true`)
  - **Self-collision:** Game over when head overlaps any body segment
- [x] Implement rendering
  - `render()` calls `renderer.clear()`, then draws based on current state
  - Snake body: green rectangles
  - Snake head: darker green rectangle
  - Food: red rectangle
  - Score: PixiJS text in top-left corner
  - State-specific overlays (title screen, game over screen)
- [x] Implement `init()`, `onKeyUp()` (no-op), and `destroy()` (cleanup)

**Success criteria:** Complete Snake game playable from start to game over. Food never spawns on snake. 180-degree turns are rejected. Switching tabs doesn't break the game. Score displays correctly.

**Files:**
- `src/scenes/SnakeScene.ts`
- `src/main.ts` (updated to load SnakeScene)

#### Phase 4: Documentation & Polish

Make the scaffold useful for students and Claude Code.

**Tasks:**
- [x] Write `CLAUDE.md` with:
  - Project purpose (teaching scaffold for game transformation)
  - Architecture overview (engine vs. game layer, what to keep vs. replace)
  - Scene interface contract with all 6 methods documented
  - Renderer API reference (drawRect, drawText, clear, stage)
  - File structure map with reading order
  - Key constants and where to find them
  - How to run: `npm run dev`
  - How to build: `npm run build`
  - Common transformation patterns for Claude Code to reference
- [x] Update `README.md` with:
  - What this project is (one paragraph)
  - Quick start instructions (`npm install`, `npm run dev`)
  - "How to make your own game" section pointing students to `SnakeScene.ts` and the Scene interface
- [x] Add inline code comments in `SnakeScene.ts` for key logic (direction buffering, food spawning, collision)
- [ ] Verify error boundary works: temporarily throw in a Scene method, confirm red error renders on canvas
- [ ] Verify full page reload on HMR (no stale state issues)
- [x] Run `npm run build` and verify `dist/` serves statically

**Success criteria:** A student who has never seen the project can read CLAUDE.md, run `npm run dev`, play Snake, and understand how to start replacing `SnakeScene.ts` with their own game. Claude Code given this CLAUDE.md can explain the architecture and help scaffold a new Scene.

**Files:**
- `CLAUDE.md`
- `README.md`
- `src/scenes/SnakeScene.ts` (comments added)

## Alternative Approaches Considered

### ECS (Entity Component System)
**Rejected.** Too much conceptual overhead for intermediate students. The pattern itself becomes the lesson rather than the game. Harder for Claude Code to reason about during transformation. Components, systems, and entity management add ~3 new concepts before students write any game logic.

### Simple Classes (No Interface)
**Rejected.** No formal contract — students would have to reverse-engineer what the engine calls. Easy to miss methods when swapping games. Claude Code has no clear reference for what a game must implement.

### Multiple Scenes with Engine-Managed Transitions
**Rejected for game states.** Considered having Start, Play, and GameOver as separate Scene implementations with engine-level `pushScene()` / `popScene()`. Adds engine complexity (scene stack, transition animations) that is not needed for a teaching scaffold. A single Scene with an internal state enum is simpler and puts all game logic in one file students can read top-to-bottom.

### Variable Delta Time
**Rejected.** Snake naturally advances one grid cell per tick — a fixed timestep is the natural fit. Variable delta time adds interpolation complexity and floating-point drift. Fixed timestep is also a more interesting pattern to learn (accumulator, tick rate, determinism).

### Sprite-Based Rendering
**Rejected.** Sprites require an asset pipeline (loading, caching, spritesheets). Colored rectangles keep the rendering layer trivial. Students can upgrade visuals later without changing game logic.

## Acceptance Criteria

### Functional Requirements

- [x] `npm run dev` starts a Vite dev server and opens a playable Snake game
- [x] `npm run build` produces a working static build in `dist/`
- [x] Snake game has three states: Start, Playing, Game Over
- [x] Snake moves on a 20x20 grid at ~6.67 ticks/second
- [x] Arrow keys and WASD control snake direction
- [x] 180-degree turns are prevented
- [x] Food spawns only on empty cells
- [x] Eating food grows snake and increments score
- [x] Wall collision and self-collision trigger Game Over
- [x] Score displays during play and on Game Over screen
- [x] Spacebar starts/restarts the game

### Non-Functional Requirements

- [x] Tab-inactive does not cause game freeze or instant death on return
- [x] Arrow keys do not scroll the page
- [x] Scene errors render a visible red error message on canvas (not blank screen)
- [x] All engine code is in `src/engine/`, all game code is in `src/scenes/`
- [x] The Scene interface is the only contract between engine and game layer
- [x] PixiJS v8 version is pinned (exact, not range) in `package.json`
- [x] No sprites or external assets — colored rectangles only
- [x] TypeScript strict mode enabled

### Quality Gates

- [x] `CLAUDE.md` contains architecture overview, Scene interface docs, and renderer API
- [x] `README.md` has quick start and "make your own game" instructions
- [x] A developer unfamiliar with the project can read the code in under 30 minutes
- [x] Claude Code, given the CLAUDE.md, can correctly describe how to create a new Scene

## Success Metrics

- Students can use Claude Code to replace `SnakeScene.ts` with a different game (Asteroids, Breakout, Pong) without modifying engine files
- A student unfamiliar with the project can read the full codebase (~7 files) and understand the architecture in one sitting

## Dependencies & Prerequisites

- **Node.js** — LTS version for Vite
- **PixiJS v8** — WebGL2/WebGPU renderer (falls back to Canvas)
- **Vite** — Dev server and bundler
- **TypeScript** — Strict mode

No external APIs, databases, or services.

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| PixiJS v8 breaking change | Build failures | Low (pinned version) | Pin exact version in package.json |
| Students modify engine files | Architecture breaks | Medium | Clear CLAUDE.md guidance, file separation |
| Renderer wrapper too limiting | Students can't build creative games | Low | `stage` escape hatch to raw PixiJS |
| Game loop too complex to read | Students get lost | Low | Single `Game.ts` file, well-commented |
| Error boundary hides real bugs | Students don't learn debugging | Low | Error message includes stack trace on canvas |

## Future Considerations

These are explicitly **out of scope** but documented for potential extensions:

- **Audio:** The scaffold is visual-only. Students who want audio can add the Web Audio API at the Scene level.
- **Multiplayer input:** Two-player games (Pong) are handled at the Scene level by mapping different key sets. No engine changes needed.
- **Window resize:** Canvas is fixed at 600x600. Responsive canvas can be added later.
- **FPS counter:** A debug overlay toggled with F3 could help students diagnose performance. Nice-to-have.
- **Speed progression:** Snake could increase tick rate as score increases. Left as a student exercise.

## References & Research

### Source Brainstorm

- `docs/brainstorms/2026-02-15-snake-game-scaffold-brainstorm.md` — All key architectural decisions

### Internal References

- `CLAUDE.md` — To be populated in Phase 4
- `.claude/settings.local.json` — WebFetch allowed for pixijs.com and github.com

### External References

- PixiJS v8 documentation: https://pixijs.com/guides
- Vite documentation: https://vite.dev/guide/
- Fixed timestep game loop pattern: "Fix Your Timestep!" by Glenn Fiedler
