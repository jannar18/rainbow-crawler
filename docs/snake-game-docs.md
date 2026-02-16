# Snake Game Teaching Scaffold

A minimal game engine + Snake game built with TypeScript and PixiJS v8. Designed as a starting point for learning game development — read the code, understand the architecture, then replace the Snake game with your own.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and play Snake with arrow keys or WASD.

## Make Your Own Game

The project has two layers:

- **Engine** (`src/engine/`) — Game loop, renderer, input handling. You keep this as-is.
- **Game** (`src/scenes/SnakeScene.ts`) — The Snake game. You replace this file.

To create your own game:

1. Create a new file in `src/scenes/` (e.g., `BreakoutScene.ts`)
2. Implement the `Scene` interface from `src/engine/types.ts`
3. Change the import in `src/main.ts` to load your scene
4. Run `npm run dev`

The `Scene` interface has 6 methods:

```ts
interface Scene {
  init(context: GameContext): void;   // Setup (called once)
  update(dt: number): void;           // Game logic (called every tick)
  render(renderer: Renderer): void;   // Drawing (called every frame)
  onKeyDown(key: string): void;       // Key pressed
  onKeyUp(key: string): void;         // Key released
  destroy(): void;                    // Cleanup
}
```

Look at `SnakeScene.ts` for a complete example of how these methods work together.

## Project Structure

```
src/
├── engine/
│   ├── types.ts        # Scene interface, constants
│   ├── Game.ts         # Game loop
│   ├── Renderer.ts     # Drawing API
│   └── Input.ts        # Keyboard input
├── scenes/
│   └── SnakeScene.ts   # The game you'll replace
└── main.ts             # Entry point
```

Read `CLAUDE.md` for detailed architecture documentation.
