---
module: Game Engine Architecture
date: 2026-02-15
problem_type: best_practice
component: Scene-based architecture (Scene interface, Game loop, Renderer, Input)
symptoms:
  - "Need for reusable game engine scaffold to teach architecture patterns"
  - "Separation of concerns between engine layer and game logic layer not well documented"
  - "Students need clear starting architecture to understand before customizing"
root_cause: "Lack of documented architectural pattern for scene-based game engines that can serve as a teaching tool and reusable scaffold"
resolution_type: documentation_update
severity: medium
tags: [game-engine, scene-architecture, teaching-scaffold, vite-typescript, pixijs, architecture-pattern, fixed-timestep]
---

# Best Practice: Scene-Based Game Engine Architecture

## Problem

Students learning game development with TypeScript need a starting point that is readable, transformable, and minimal. Existing tutorials are either too simple (single file, no architecture) or too complex (ECS, asset loaders, physics engines). We needed a documented architectural pattern that separates engine concerns from game logic via a clean interface contract.

## Environment
- Module: Game Engine Architecture
- Affected Component: Scene interface, Game loop, Renderer, Input manager
- Date: 2026-02-15

## Symptoms
- No reusable scaffold existed for teaching scene-based game architecture
- Students had no clear starting architecture to learn from before building their own
- Game engine tutorials conflated engine logic with game logic

## What Didn't Work

**Direct solution:** The architecture was designed from a brainstorm and plan, not a debugging session. Key alternatives that were considered and rejected:

- **ECS (Entity Component System):** Too much conceptual overhead — components, systems, and entity management add ~3 new concepts before students write any game logic.
- **No interface (plain classes):** No formal contract — students would reverse-engineer what the engine calls and miss methods when swapping games.
- **Variable delta time:** Adds interpolation complexity and floating-point drift. Snake advances one grid cell per tick — fixed timestep is the natural fit.
- **Multiple scenes for game states:** Engine-level `pushScene()` / `popScene()` adds complexity not needed for a teaching scaffold. A single Scene with an internal state enum is simpler.

## Solution

A **scene-based engine scaffold** with clear separation: engine (`src/engine/`) provides the starting infrastructure, game (`src/scenes/`) contains game logic. Students can modify either layer.

### The Scene Interface (the default contract)

```typescript
// src/engine/types.ts
interface Scene {
  init(context: GameContext): void;    // Receive grid size, canvas dims
  update(dt: number): void;            // Advance game logic (dt = 0.15s constant)
  render(renderer: Renderer): void;    // Draw the current frame
  onKeyDown(key: string): void;        // Handle key press
  onKeyUp(key: string): void;          // Handle key release
  destroy(): void;                     // Clean up PixiJS objects
}
```

6 methods. `init` receives dependencies, `update`/`render` run per tick/frame, input events forwarded, `destroy` for cleanup.

### Fixed-Timestep Game Loop

```typescript
// src/engine/Game.ts (core loop logic)
accumulator += Math.min(dt, MAX_ACCUMULATOR_MS);  // Clamp for tab-inactive

while (accumulator >= TICK_RATE_MS) {
  scene.update(TICK_RATE_S);  // Always 0.15s
  accumulator -= TICK_RATE_MS;
}
scene.render(renderer);
```

Accumulator clamped to 1 second so returning from an inactive tab doesn't process hundreds of ticks.

### Grid-Coordinate Renderer

```typescript
// Grid convenience — game logic thinks in cells, not pixels
renderer.drawRect(5, 3, 1, 1, 0x00ff00);  // One green cell at grid (5,3)

// Pixel coords for text (not grid-aligned)
renderer.drawText("Score: 5", 10, 10, { fontSize: 18 });

// Escape hatch for advanced use
renderer.stage;  // Raw PixiJS Container
```

### Error Boundaries

```typescript
// Game.ts wraps scene calls in try-catch
try {
  scene.update(TICK_RATE_S);
} catch (e) {
  this.errorMessage = e instanceof Error ? e.message : String(e);
}
// Renders red error text on canvas instead of silent crash
```

### File Structure

```
src/engine/   → types.ts, Game.ts, Renderer.ts, Input.ts (starting infrastructure)
src/scenes/   → SnakeScene.ts (replace with your game)
src/main.ts   → Entry point (change import to load your scene)
```

## Why This Works

1. **Clear separation**: The Scene interface is the only contract. Students see exactly what to implement and what's provided.
2. **Deterministic updates**: Fixed timestep means consistent behavior regardless of frame rate. Students reason about "what happens each tick" without variable delta time.
3. **Grid abstraction**: Thinking in grid cells (0-19) instead of pixels (0-599) reduces cognitive load.
4. **Error visibility**: Red error text on canvas beats silent crashes. Students immediately see when something breaks.
5. **Minimal interface**: 6 methods is learnable in minutes. Students internalize the contract, then focus on game logic.

## Prevention

- **Understand the Scene interface before modifying it.** It's the starting contract between engine and game. Modify it deliberately if your game needs different behavior.
- **Always call `destroy()` when switching scenes.** Scenes must clean up PixiJS children to prevent memory leaks and ghost artifacts.
- **Understand the fixed-timestep design.** The default `dt` is always 0.15s. Using `Date.now()` inside scenes breaks determinism — change the tick rate in the engine if you need different timing.
- **Extend the Renderer deliberately.** Add methods to `Renderer` if your game needs them, rather than working around it from the scene side.
- **Guard input handling.** `onKeyDown`/`onKeyUp` are synchronous — don't block or throw. Use flags and apply changes in `update()`.
- **Monitor accumulator clamping.** `MAX_ACCUMULATOR_MS = 1000` prevents tab-inactive death spirals. Document why it exists.

## Related Issues

No related issues documented yet.
