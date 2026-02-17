import type { Texture } from "pixi.js";
import { GRID_SIZE } from "../engine/types.js";

// --- Texture types ---

export interface GameTextures {
  player: {
    fairy: Texture[];
    wizard: Texture[];
  };
  chaser: Record<string, { idle: Texture[]; walk: Texture[] }>;
  chaserHealed: {
    elf_f: Texture[];
    elf_m: Texture[];
  };
  ranger: { idle: Texture[] };
  rangerHealed: Texture[];
  boss: { idle: Texture[]; walk: Texture[] };
  bossHealed: { idle: Texture[] };
  tiles: {
    jungleWalls: Texture[];
    doorClosed: Texture;
  };
  ui: {
    heartFull: Texture;
    heartEmpty: Texture;
  };
}

// --- Types ---

export interface Point {
  x: number;
  y: number;
}

export type Direction = "up" | "down" | "left" | "right";
export const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
export type CellType = "wall" | "floor" | "door";
export type GameState = "start" | "playing" | "gameOver" | "win";
export type EnemyType = "chaser" | "ranger" | "boss";
export type EnemyState = "active" | "calm" | "dissolving" | "healed";
export type PlayerCharacter = "fairy" | "wizard";

export const GNOLL_VARIANTS = ["gnollbrute", "gnollshaman", "gnollscout"] as const;
export const ELF_GENDERS = ["elf_f", "elf_m"] as const;

export interface Player {
  pos: Point;
  aimDirection: Direction;
  health: number;
  maxHealth: number;
  iFrames: number;
  shootCooldown: number;
  sprinting: boolean;
}

export interface Enemy {
  pos: Point;
  type: EnemyType;
  state: EnemyState;
  health: number;
  stateTimer: number;
  moveCooldown: number;
  shootCooldown: number;
  maxHealth: number;
  gnollVariant: typeof GNOLL_VARIANTS[number] | "";
  healedGender: typeof ELF_GENDERS[number] | "";
}

export interface Projectile {
  pos: Point;
  direction: Direction;
  speed: number;
  isPlayerBeam: boolean;
}

export interface Pickup {
  pos: Point;
  collected: boolean;
}

export interface Room {
  grid: CellType[][];
  enemies: Enemy[];
  pickups: Pickup[];
  connections: Map<Direction, number>;
  cleared: boolean;
  playerSpawn: Point;
}

export interface Dungeon {
  rooms: Room[];
  currentRoom: number;
  bossRoom: number;
  totalEnemies: number;
}

// --- Difficulty system ---

export type Difficulty = "easy" | "normal" | "hard" | "nightmare";
export type NightmareModifier = "noPickups" | "doubleBoss" | "swarm" | "fastShots" | "cursedHealing";

export interface DifficultyConfig {
  label: string;
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

export const ALL_NIGHTMARE_MODIFIERS: NightmareModifier[] = [
  "noPickups", "doubleBoss", "swarm", "fastShots", "cursedHealing",
];

export const NIGHTMARE_MODIFIER_LABELS: Record<NightmareModifier, string> = {
  noPickups: "No Pickups",
  doubleBoss: "Double Boss HP",
  swarm: "Swarm",
  fastShots: "Fast Shots",
  cursedHealing: "Cursed Healing",
};

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Easy",

    roomCountMin: 5, roomCountMax: 7,
    enemiesPerRoomMin: 2, enemiesPerRoomMax: 4,
    pickupsPerRoom: 2,
    enemyHealth: 1, chaserMoveInterval: 3,
    rangerFireInterval: 7, rangerShotSpeed: 1,
    bossHealth: 3, bossFireInterval: 7, bossMoveInterval: 4, bossShotSpeed: 1,
    calmDuration: 6,
  },
  normal: {
    label: "Normal",

    roomCountMin: 6, roomCountMax: 8,
    enemiesPerRoomMin: 3, enemiesPerRoomMax: 5,
    pickupsPerRoom: 1,
    enemyHealth: 1, chaserMoveInterval: 2,
    rangerFireInterval: 6, rangerShotSpeed: 1,
    bossHealth: 5, bossFireInterval: 6, bossMoveInterval: 3, bossShotSpeed: 1,
    calmDuration: 6,
  },
  hard: {
    label: "Hard",

    roomCountMin: 7, roomCountMax: 9,
    enemiesPerRoomMin: 4, enemiesPerRoomMax: 6,
    pickupsPerRoom: 1,
    enemyHealth: 2, chaserMoveInterval: 2,
    rangerFireInterval: 5, rangerShotSpeed: 2,
    bossHealth: 7, bossFireInterval: 5, bossMoveInterval: 3, bossShotSpeed: 2,
    calmDuration: 5,
  },
  nightmare: {
    label: "Nightmare",

    roomCountMin: 8, roomCountMax: 10,
    enemiesPerRoomMin: 5, enemiesPerRoomMax: 7,
    pickupsPerRoom: 0,
    enemyHealth: 2, chaserMoveInterval: 1,
    rangerFireInterval: 4, rangerShotSpeed: 2,
    bossHealth: 10, bossFireInterval: 4, bossMoveInterval: 2, bossShotSpeed: 2,
    calmDuration: 4,
  },
};

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "nightmare"];

// --- Constants ---

export const PLAYER_MAX_HEALTH = 5;
export const SHOOT_COOLDOWN = 3;
export const BEAM_SPEED = 2;
export const I_FRAME_DURATION = 4;

export const DISSOLVE_DURATION = 4;

export const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE_DIR: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// Vivid rainbow palette
export const RAINBOW_COLORS = [
  0xff3333, 0xff8833, 0xffdd00, 0x33ee66, 0x33aaff, 0x8855ff, 0xee55ff,
];

// Enchanted forest pastel floor palette (warm mossy tones)
export const RAINBOW_FLOOR_COLORS = [
  0xc4ddb2, 0xa8d4a0, 0xd4e8b8, 0xf0e6b0, 0xe8d0a8, 0xf2c8c0, 0xb8d8c4,
];

// UI colors
export const COLOR_UI_TEXT = 0xffeedd;
export const COLOR_UI_DIM = 0x9988aa;

// Entity sprite scale (1.0 = one cell, 1.4 = 40% bigger, centered)
export const ENTITY_SCALE = 1.4;

// --- Key mappings ---

// WASD = movement, Arrows = aim
export const MOVE_KEY_DIRECTION: Record<string, Direction> = {
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

export const AIM_KEY_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

// --- Helpers ---

export function animFrame(tick: number, frameCount: number, ticksPerFrame: number): number {
  return Math.floor(tick / ticksPerFrame) % frameCount;
}

// --- RNG helpers ---

export const rng = {
  next(): number {
    return Math.random();
  },
  nextInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
  },
  shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },
};

// --- Door positions ---

export function doorPos(dir: Direction): Point {
  const mid = Math.floor(GRID_SIZE / 2);
  switch (dir) {
    case "up": return { x: mid, y: 0 };
    case "down": return { x: mid, y: GRID_SIZE - 1 };
    case "left": return { x: 0, y: mid };
    case "right": return { x: GRID_SIZE - 1, y: mid };
  }
}

export function entryPos(dir: Direction): Point {
  const door = doorPos(dir);
  const inward = DELTA[OPPOSITE_DIR[dir]];
  return { x: door.x + inward.x, y: door.y + inward.y };
}
