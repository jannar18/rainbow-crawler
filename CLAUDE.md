# Snake Game Teaching Scaffold

A Vite + TypeScript + PixiJS v8 project designed as a starting point for game development. Students replace the game layer (SnakeScene) with their own game and can modify the engine layer as needed.

## Architecture

Two layers separated by the `Scene` interface:

- **Engine layer** (`src/engine/`) — Game loop, renderer, input. Can be extended or modified as needed.
- **Game layer** (`src/scenes/`) — Game logic. Students replace `SnakeScene.ts` with their own Scene implementation.

```
src/
├── engine/
│   ├── types.ts        # Scene interface, GameContext, constants
│   ├── Game.ts         # Fixed-timestep game loop, error boundaries
│   ├── Renderer.ts     # PixiJS wrapper (grid-coordinate convenience methods)
│   └── Input.ts        # Keyboard input manager
├── scenes/
│   └── SnakeScene.ts   # Complete Snake game (replace this)
└── main.ts             # Entry point: creates Game, loads a Scene
```

**Reading order:** `main.ts` → `types.ts` → `Game.ts` → `SnakeScene.ts`

## Scene Interface

The default contract between engine and game (defined in `src/engine/types.ts`):

```ts
interface Scene {
  init(context: GameContext): void;   // Receive grid size, canvas dimensions
  update(dt: number): void;           // Advance game logic (dt = 0.15s per tick)
  render(renderer: Renderer): void;   // Draw the current frame
  onKeyDown(key: string): void;       // Handle key press (key codes like "ArrowUp", "KeyW", "Space")
  onKeyUp(key: string): void;         // Handle key release
  destroy(): void;                    // Clean up PixiJS objects
}
```

`GameContext` provides: `gridSize` (20), `cellSize` (30), `canvasWidth` (600), `canvasHeight` (600).

## Renderer API

The `Renderer` (passed to `render()`) provides:

| Method | Coordinates | Description |
|--------|------------|-------------|
| `drawRect(gridX, gridY, widthCells, heightCells, color)` | Grid cells | Draw a colored rectangle |
| `drawText(text, pixelX, pixelY, options?)` | Pixels | Draw text (options: `fontSize`, `color`) |
| `clear()` | — | Remove all drawn objects |
| `stage` (readonly) | — | Raw PixiJS Container for advanced use |

Grid methods convert cell coordinates to pixels internally. `drawText` uses pixel coordinates since text isn't grid-aligned.

## Constants

Defined in `src/engine/types.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `GRID_SIZE` | 20 | Cells per axis |
| `CELL_SIZE` | 30 | Pixels per cell |
| `CANVAS_WIDTH` | 600 | Canvas width in pixels |
| `CANVAS_HEIGHT` | 600 | Canvas height in pixels |
| `TICK_RATE_MS` | 150 | Milliseconds per tick (~6.67 ticks/sec) |
| `TICK_RATE_S` | 0.15 | Seconds per tick (passed to `update()`) |

## How to Create a New Game

1. Create a new file in `src/scenes/` (e.g., `AsteroidsScene.ts`)
2. Implement the `Scene` interface
3. Update `src/main.ts` to import and load your scene instead of `SnakeScene`
4. Modify the engine layer (`src/engine/`) if your game needs different rendering, input, or loop behavior
5. Run `npm run dev` to test

The engine provides a working game loop, renderer, and input system out of the box. You can use it as-is or modify it to fit your game's needs.

## Commands

- `npm install` — Install dependencies
- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — TypeScript check + production build to `dist/`
- `npm run preview` — Serve the production build locally

## Key Design Decisions

- **Fixed timestep** — The game loop uses an accumulator pattern. `update()` is called with a constant `dt` (0.15s), making game logic deterministic.
- **Grid coordinates** — `drawRect` works in grid cells, not pixels. This keeps game logic clean.
- **Error boundaries** — If a scene throws during `update()` or `render()`, the engine catches it and renders a red error message on canvas instead of crashing silently.
- **Accumulator clamping** — When the browser tab is inactive, the accumulator is clamped to 1 second to prevent the game from processing many ticks at once on return.
