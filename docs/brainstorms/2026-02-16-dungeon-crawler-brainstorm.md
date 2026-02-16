# Brainstorm: Grid-Based Dungeon Crawler

**Date:** 2026-02-16
**Status:** Reviewed

## What We're Building

A medium-scope grid-based dungeon crawler built on the existing Snake game scaffold. The player explores a procedural dungeon on a 20x20 grid, heals corrupted enemies with rainbow beams, and progresses through rooms to reach and heal a final boss.

**Core experience:** WASD movement + mouse-aimed rainbow beam combat on a grid, with sprite-based visuals and healing effects (sprite transitions, rainbow dissolve).

### Key Features

- **Player movement:** WASD keyboard controls on the grid
- **Ranged combat:** Shoot rainbow beam projectiles toward the mouse cursor; projectiles travel across the grid
- **Enemies:** 2 types — Chaser (moves toward player) and Patrol (walks a fixed path, chases when player is near) — plus a boss in the final room. Enemies are "evil/zombie" sprites that get healed rather than killed
- **Healing mechanic:** Instead of damage, the player shoots rainbow beams that "heal" enemies. When fully healed, enemies first become calm/happy (stop moving, sprite changes), linger briefly, then dissolve into rainbow energy and disappear
- **Rainbow power progression:** Healing enemies fills a rainbow power bar (UI element). The boss draws evil power from corrupted enemies — each enemy healed weakens the boss and strengthens the player. The bar shows progress toward being strong enough to face the boss
- **Dungeon:** Procedurally generated rooms with corridors on the 20x20 grid
- **Items/pickups:** Health and ammo pickups
- **Win/lose conditions:** Heal the boss in the final room to win; lose when player health reaches zero

## Why This Approach

- Natural fit for the grid engine — movement, collision, and room layout all map to cells
- WASD + mouse combo fulfills the input extension requirement (adding mouse tracking + click handling to the existing keyboard-only `Input.ts`)
- Sprite/icon rendering and visual effects (healing transitions, rainbow dissolve, rainbow power bar) fulfill the renderer extension requirement
- Medium scope keeps it achievable while still demonstrating multiple systems (combat, AI, level design)

## Key Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Movement style | Real-time | Mouse aiming feels most natural with continuous movement; the 150ms tick gives it a satisfying grid-snappy rhythm |
| Combat | Rainbow healing beams aimed at mouse | Thematic twist: "heal" enemies instead of damage. Rainbow projectile, two-stage death (calm → dissolve) |
| Input extension | Mouse + keyboard combo | WASD to move, mouse to aim and fire — touches `Input.ts` meaningfully |
| Renderer extensions | Sprite/icon rendering + visual effects | Draw icons instead of plain rects; add healing effects, sprite transitions, rainbow dissolve |
| Projectile movement | Grid-snap | Projectiles jump cell-to-cell each tick — consistent with the grid, retro feel, simpler collision |
| Dungeon generation | Simple procedural | Random room placement with corridors — adds replayability without excessive complexity |
| Enemy types | Chaser + Patrol + Boss | 2 regular enemy types plus a boss — enough variety without excessive AI work |
| Progression | Rainbow power bar | Each healed enemy fills the bar, weakening the boss and strengthening the player |
| Win condition | Heal the boss | Final room contains a boss; healing it wins the game |
| Scope | Medium | Procedural rooms, 2 enemy types + boss, health/ammo pickups — not a full roguelike |

## Assignment Coverage

This game touches all three required layers:

1. **Scene logic (Layer 1):** Entirely new game — player, enemies, projectiles, rooms, collision, AI, win/lose states
2. **Input handling (Layer 2):** Add mouse position tracking and click events to `Input.ts`; game uses WASD + mouse simultaneously
3. **Renderer extensions (Layer 3):** Add sprite/icon drawing method and visual effect helpers (flash, damage numbers) to `Renderer.ts`

## Resolved Questions

1. **Turn-based vs real-time?** Real-time — mouse aiming feels natural with continuous movement, and the 150ms tick gives grid-snappy rhythm.
2. **Procedural generation approach?** Simple procedural — random room placement with corridors. Adds replayability without going overboard.
3. **Projectile behavior on the grid?** Grid-snap — projectiles jump cell-to-cell each tick. Keeps everything in the grid coordinate system, simpler collision detection, retro aesthetic.

## Open Questions

None — all questions resolved.
