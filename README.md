# Claude Game

Welcome! This repo is your workspace for today's session.

## What's here

This repo has two things:

1. **A working Snake game** built with TypeScript and [PixiJS v8](https://pixijs.com/)
2. **A compound engineering workflow system** — a set of commands that help you use Claude systematically on real projects

Before you start building, get familiar with both:

- **[Snake Game Docs](docs/snake-game-docs.md)** — How the game works, the engine/scene architecture, how to run it
- **[Compound Engineering Docs](docs/compound-engineering-overview.md)** — The five workflow commands, how the agents and knowledge loop work
- **[CLAUDE.md](CLAUDE.md)** — Architecture reference (Scene interface, Renderer API, constants)

## Your challenge

**Transform the Snake game into a completely different game using the compound engineering workflow.**

Be as ambitious as you want. Breakout, Asteroids, a platformer, a puzzle game, a roguelike — whatever you're excited about. The engine handles the game loop, rendering, and input out of the box — leave it as-is if it suits your needs, or modify it if your game calls for something different.

## How to start

```bash
npm install
npm run dev
```

Then, in Claude Code:

1. `/workflows:brainstorm` — figure out what game you want to build
2. `/workflows:plan` — let Claude research the codebase and create an implementation plan
3. **Review the plan** — read it, make sure the approach makes sense
4. `/workflows:work` — execute the plan
5. `/workflows:review` — run a multi-agent code review on your changes
6. `/workflows:compound` — document what you learned so future plans get smarter

While Claude is working on a long step, open a new terminal tab and start another Claude conversation — ask questions about the workflow system, explore the code, think about your design.

Iterate as needed. Each cycle through the pipeline makes the next one better.
