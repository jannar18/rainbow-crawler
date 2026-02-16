# Snake Game Teaching Scaffold — Brainstorm

**Date:** 2026-02-15
**Status:** Draft

## What We're Building

A Snake game that serves as a **teaching scaffold** for intermediate TypeScript students. The game itself is secondary — the real product is an architecture that students can transform into a completely different game using Claude Code.

### Core Constraints

- **Runtime:** Web browser via Vite
- **Language:** TypeScript
- **Rendering:** PixiJS v8 (colored rectangles, no sprites)
- **Game loop:** Fixed timestep (deterministic, grid-friendly)
- **Tool:** Students will use Claude Code (CLI) to iterate and transform

### What Students Should Be Able To Do

- Read and understand the Snake implementation quickly
- Use Claude Code to transform Snake into a different game (Asteroids, Breakout, Pong, etc.)
- Keep the engine (loop, rendering, input) stable while swapping game logic
- Not get lost in architecture rabbit holes or stuck on rendering boilerplate

## Why This Approach

### Scene-Based Architecture

The project splits into two layers:

1. **Engine layer** (students don't touch): Fixed timestep game loop, PixiJS renderer wrapper, input manager
2. **Game layer** (students replace): A `Scene` implementation that defines game-specific state, update logic, and rendering

A `Scene` interface provides the contract:

```ts
interface Scene {
  update(dt: number): void
  render(renderer: Renderer): void
  onKeyDown(key: string): void
}
```

**Why not Simple Classes?** No formal contract — students would have to reverse-engineer what the engine calls. Easy to miss things when swapping games.

**Why not ECS?** Too much conceptual overhead for intermediate students. The pattern itself becomes the lesson rather than the game. Harder for Claude Code to reason about during transformation.

**Why Scene-based?** Clear seam between "what stays" and "what changes." The interface tells students (and Claude Code) exactly what a game needs to implement. Minimal abstraction — just enough structure to guide without constraining.

## Key Decisions

1. **Fixed timestep game loop** — Snake advances one grid cell per tick. Natural fit for grid-based games, and a more interesting pattern to learn than variable delta time.
2. **Scene-based architecture** — Engine + Scene interface. Students create a new Scene to make a new game.
3. **Colored rectangles only** — No sprites or assets. Keeps the rendering layer trivial and lets students focus on game logic. They can upgrade visuals later.
4. **PixiJS v8** — Current version. Handles the WebGL/Canvas abstraction so students don't fight browser rendering.
5. **Vite + TypeScript** — Fast dev server, hot reload, type safety. Standard modern web tooling.
6. **Claude Code as the transformation tool** — CLAUDE.md should describe the architecture and Scene contract clearly so Claude Code can help students effectively.

## Resolved Questions

1. **Grid size / canvas size** — Use sensible defaults (e.g., 20x20 grid). Exact values are an implementation detail for the plan phase.
2. **Game state management** — Include Start, Play, and Game Over states. This shows students the state transition pattern, which they'll need when building their own game.
3. **Score / UI** — Include a simple score counter rendered via PixiJS text. Gives students an example of text rendering they can repurpose.

## Open Questions

None — ready for planning.
