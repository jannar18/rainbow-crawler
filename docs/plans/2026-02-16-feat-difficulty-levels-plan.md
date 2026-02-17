---
title: "feat: Add 4-tier difficulty system"
type: feat
status: completed
date: 2026-02-16
---

# feat: Add 4-tier difficulty system

Add Easy / Normal / Hard / Nightmare difficulty tiers to the dungeon crawler. Current game balance becomes Easy. Difficulty affects enemy stats and dungeon layout (not player stats). Nightmare adds randomized roguelike modifiers per run. Selection happens on the start screen alongside character choice.

Also improve the boss HP bar to make rainbow power's effect visible — the bar should show effective health (reduced by rainbow power), not raw max health. Add popup text when entering the boss room if rainbow power has weakened the boss.

## Acceptance Criteria

- [x] `DifficultyConfig` interface and 4 preset objects defined in `dungeon-types.ts`
- [x] `generateDungeon(config)` accepts config and uses it for room count, enemy count, and pickup frequency
- [x] Scene stores selected difficulty and passes config to dungeon gen + enemy behavior
- [x] All hardcoded enemy/boss constants replaced with config lookups in `DungeonCrawlerScene.ts`
- [x] Difficulty selector on start screen (Up/Down or W/S to cycle, renders below character select)
- [x] Nightmare tier randomly picks 1-2 roguelike modifiers per run
- [x] Win/game-over screens show difficulty name and active Nightmare modifiers (if any)
- [x] `CALM_DURATION` included in config for Nightmare's "Cursed Healing" modifier
- [x] Boss HP bar shows effective health (reduced by rainbow power), not raw `maxHealth`
- [x] Boss HP bar has a "depleted" section in a dim/grey color showing the portion removed by rainbow power
- [x] Popup text (e.g., "Rainbow Power weakened the boss!") when entering boss room with `rainbowPower > 0`

## Context

### Constants to replace (all in `dungeon-types.ts`)

| Constant | Line | Config field |
|----------|------|-------------|
| `ENEMY_HEALTH` | 106 | `enemyHealth` |
| `CHASER_MOVE_INTERVAL` | 107 | `chaserMoveInterval` |
| `RANGER_FIRE_INTERVAL` | 108 | `rangerFireInterval` |
| `RANGER_SHOT_SPEED` | 109 | `rangerShotSpeed` |
| `BOSS_BASE_HEALTH` | 113 | `bossHealth` |
| `BOSS_FIRE_INTERVAL` | 114 | `bossFireInterval` |
| `BOSS_MOVE_INTERVAL` | 115 | `bossMoveInterval` |
| `BOSS_SHOT_SPEED` | 116 | `bossShotSpeed` |
| `CALM_DURATION` | 110 | `calmDuration` |

### Hardcoded values in `dungeon-gen.ts`

| Value | Line | Config field |
|-------|------|-------------|
| `rng.nextInt(5, 7)` (room count) | 24 | `roomCountMin/Max` |
| `rng.nextInt(2, 4)` (enemies/room) | 80 | `enemiesPerRoomMin/Max` |
| `rng.nextInt(1, 2)` (pickups/room) | 99 | `pickupsPerRoom` |

### Tier values

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
| Calm duration | 6 | 6 | 5 | 4 |

### Nightmare modifiers (pick 1-2 per run)

- **No Pickups** — zero health drops
- **Double Boss HP** — boss HP doubled from Nightmare base
- **Swarm** — +2 extra enemies per room
- **Fast Shots** — all enemy projectile speed +1
- **Cursed Healing** — calm duration halved

## MVP

### dungeon-types.ts — Add DifficultyConfig + presets

```ts
type Difficulty = "easy" | "normal" | "hard" | "nightmare";
type NightmareModifier = "noPickups" | "doubleBoss" | "swarm" | "fastShots" | "cursedHealing";

interface DifficultyConfig {
  label: string;
  difficulty: Difficulty;
  roomCountMin: number;
  roomCountMax: number;
  enemiesPerRoomMin: number;
  enemiesPerRoomMax: number;
  pickupsPerRoom: number;
  enemyHealth: number;
  chaserMoveInterval: number;
  rangerFireInterval: number;
  rangerShotSpeed: number;
  bossHealth: number;
  bossFireInterval: number;
  bossMoveInterval: number;
  bossShotSpeed: number;
  calmDuration: number;
  modifiers?: NightmareModifier[];
}

const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Easy",
    difficulty: "easy",
    roomCountMin: 5, roomCountMax: 7,
    enemiesPerRoomMin: 2, enemiesPerRoomMax: 4,
    pickupsPerRoom: 2,
    enemyHealth: 1, chaserMoveInterval: 3,
    rangerFireInterval: 7, rangerShotSpeed: 1,
    bossHealth: 3, bossFireInterval: 7, bossMoveInterval: 4, bossShotSpeed: 1,
    calmDuration: 6,
  },
  // normal, hard, nightmare follow same pattern...
};
```

### dungeon-gen.ts — Accept config param

```ts
export function generateDungeon(config: DifficultyConfig): Dungeon {
  const numRooms = rng.nextInt(config.roomCountMin, config.roomCountMax);
  // ...
  const enemyCount = rng.nextInt(config.enemiesPerRoomMin, config.enemiesPerRoomMax);
  // ...
  placePickups(room, floorCells, config.pickupsPerRoom);
}
```

### DungeonCrawlerScene.ts — Store config, add UI, replace constants

```ts
// State
private selectedDifficulty: Difficulty = "easy";
private difficultyConfig: DifficultyConfig = DIFFICULTY_PRESETS.easy;

// Init — pass config to dungeon gen
this.dungeon = generateDungeon(this.difficultyConfig);

// Enemy behavior — use config instead of imported constants
if (e.tickCounter % this.difficultyConfig.chaserMoveInterval === 0) { ... }

// Start screen — add difficulty selector after character select
// Up/Down or W/S to cycle through difficulties
```

### DungeonCrawlerScene.ts — Boss HP bar with rainbow power visibility

Current problem: Boss HP bar (line 659-668) uses `enemy.health / enemy.maxHealth` — always looks full at start. Rainbow power reduces effective max health via `getBossEffectiveMaxHealth()` (line 576-577), but the bar doesn't reflect this.

```ts
// Current (line 665):
const fill = enemy.health / enemy.maxHealth;

// New: show effective health relative to effective max
const effectiveMax = this.getBossEffectiveMaxHealth();
const threshold = enemy.maxHealth - effectiveMax;
const effectiveHealth = enemy.health - threshold;
const fill = effectiveHealth / effectiveMax;

// Draw two-section bar:
// 1. Background: dark grey (full width)
// 2. "Depleted by rainbow" section: dim purple/grey on the right
// 3. Actual HP: rainbow-cycling foreground on the left

// If effectiveMax < enemy.maxHealth, draw the depleted section:
const depletedRatio = 1 - (effectiveMax / enemy.maxHealth);
// Draw full bar background, then depleted section in dim color,
// then fill section in rainbow color

// Popup text on boss room entry when rainbowPower > 0:
// "Rainbow Power weakened the boss!" — display for ~20 ticks then fade
private bossWeakenedPopupTimer = 0;
// Set to 20 when entering boss room with rainbowPower > 0
// Render as floating text above boss, decrement each tick
```

## References

- Brainstorm: `docs/brainstorms/2026-02-16-difficulty-levels-brainstorm.md`
- Constants: `src/scenes/dungeon-types.ts:101-116`
- Dungeon gen: `src/scenes/dungeon-gen.ts:23-106`
- Start screen UI: `src/scenes/DungeonCrawlerScene.ts:820-899`
- Enemy behavior: `src/scenes/DungeonCrawlerScene.ts:370-448`
- Boss HP bar rendering: `src/scenes/DungeonCrawlerScene.ts:659-668`
- Rainbow power → effective max health: `src/scenes/DungeonCrawlerScene.ts:576-577`
- Boss calm threshold: `src/scenes/DungeonCrawlerScene.ts:334-342`
