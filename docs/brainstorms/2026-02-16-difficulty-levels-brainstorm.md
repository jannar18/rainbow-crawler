# Difficulty Levels Brainstorm

**Date:** 2026-02-16
**Status:** Draft

## What We're Building

Four difficulty tiers for the dungeon crawler: **Easy, Normal, Hard, Nightmare**. Current game balance becomes the Easy tier. Difficulty affects enemy stats and dungeon layout (not player stats). Nightmare adds roguelike modifiers on top of stat scaling.

Selection happens on the existing start screen alongside character choice.

## Why This Approach

**Config object pattern** — A `DifficultyConfig` interface defines all tunable parameters per tier. Each difficulty is a preset config object. The config is passed into `generateDungeon()` and referenced by the scene, replacing hardcoded constants.

This gives fine-grained control per tier and cleanly supports Nightmare's extra roguelike modifiers without hacky multiplier math.

## Key Decisions

1. **4 tiers:** Easy / Normal / Hard / Nightmare
2. **Current balance = Easy tier** — Normal is harder than today's game
3. **What scales:** Enemy stats (HP, speed, fire rate, count) and dungeon layout (room count, pickup frequency). Player stats stay constant across difficulties.
4. **Nightmare extras:** Roguelike modifiers — e.g., no pickups, double boss HP, extra enemy spawns, randomized per-run modifiers
5. **UI:** Difficulty selector added to existing start screen (alongside character select)
6. **Implementation:** Central `DifficultyConfig` interface with 4 preset objects

## Proposed Config Shape

```ts
interface DifficultyConfig {
  label: string;
  // Dungeon
  roomCountMin: number;       // Easy: 5, Nightmare: 8+
  roomCountMax: number;
  enemiesPerRoomMin: number;  // Easy: 2, Nightmare: 5+
  enemiesPerRoomMax: number;
  pickupsPerRoom: number;     // Easy: 1-2, Nightmare: 0

  // Enemies
  enemyHealth: number;        // Easy: 1, Hard: 2
  chaserMoveInterval: number; // Easy: 3 (slow), Hard: 2 (fast)
  rangerFireInterval: number; // Easy: 7 (slow), Hard: 4 (fast)
  rangerShotSpeed: number;    // Easy: 1, Hard: 2

  // Boss
  bossHealth: number;         // Easy: 3, Nightmare: 8+
  bossFireInterval: number;
  bossMoveInterval: number;
  bossShotSpeed: number;

  // Nightmare modifiers (optional)
  modifiers?: NightmareModifier[];
}
```

## Proposed Tier Values

| Parameter | Easy | Normal | Hard | Nightmare |
|-----------|------|--------|------|-----------|
| Rooms | 5-7 | 6-8 | 7-9 | 8-10 |
| Enemies/room | 2-4 | 3-5 | 4-6 | 5-7 |
| Pickups/room | 1-2 | 1 | 0-1 | 0 |
| Enemy HP | 1 | 1 | 2 | 2 |
| Chaser speed | 3 | 2 | 2 | 1 |
| Ranger fire rate | 7 | 6 | 5 | 4 |
| Ranger shot speed | 1 | 1 | 2 | 2 |
| Boss HP | 3 | 5 | 7 | 10 |
| Boss fire rate | 7 | 6 | 5 | 4 |
| Boss move speed | 4 | 3 | 3 | 2 |
| Boss shot speed | 1 | 1 | 2 | 2 |

## Nightmare Roguelike Modifiers (pick 1-2 per run)

- **No Pickups** — zero health drops in any room
- **Double Boss HP** — boss HP doubled from Nightmare base
- **Swarm** — +2 extra enemies per room
- **Fast Shots** — all enemy projectile speed +1
- **Cursed Healing** — calm duration halved (enemies recover faster if not finished)

## Files to Change

- `src/scenes/dungeon-types.ts` — Add `DifficultyConfig` interface, 4 preset objects, export selected config
- `src/scenes/dungeon-gen.ts` — Accept config param in `generateDungeon()`, use config values instead of constants
- `src/scenes/DungeonCrawlerScene.ts` — Store selected difficulty, pass config to dungeon gen, use config for enemy behavior intervals, add difficulty selector to start screen UI

## Resolved Questions

1. **Nightmare modifier display** — Reveal at start of run only, then hide. Player discovers effects through gameplay.
2. **Difficulty-specific win text** — Yes, show difficulty tier name and active modifiers on win/game-over screens.
