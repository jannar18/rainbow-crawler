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
  gnollVariant: string; // chaser: which gnoll skin
  healedGender: string; // chaser: which elf gender when healed
}

export interface Projectile {
  pos: Point;
  direction: Direction;
  speed: number;
  isPlayerBeam: boolean;
}

export interface Pickup {
  pos: Point;
  type: "health";
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

// --- Constants ---

export const PLAYER_MAX_HEALTH = 5;
export const SHOOT_COOLDOWN = 3;
export const BEAM_SPEED = 2;
export const I_FRAME_DURATION = 4;

export const ENEMY_HEALTH = 1;
export const CHASER_MOVE_INTERVAL = 3;
export const RANGER_FIRE_INTERVAL = 7;
export const RANGER_SHOT_SPEED = 1;
export const CALM_DURATION = 6;
export const DISSOLVE_DURATION = 4;

export const BOSS_BASE_HEALTH = 3;
export const BOSS_FIRE_INTERVAL = 7;
export const BOSS_MOVE_INTERVAL = 4;
export const BOSS_SHOT_SPEED = 1;

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

// Soft rainbow palette (from art direction brainstorm)
export const RAINBOW_COLORS = [
  0xff6b6b, 0xffa06b, 0xffd93d, 0x6bcf7f, 0x6bb5ff, 0x9b7dff, 0xd97dff,
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
