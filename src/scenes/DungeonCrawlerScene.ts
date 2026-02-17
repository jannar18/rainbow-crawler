import type { Texture } from "pixi.js";
import type { Scene, GameContext, Renderer } from "../engine/types.js";
import { CANVAS_WIDTH, CELL_SIZE, GRID_SIZE } from "../engine/types.js";

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
  ranger: { idle: Texture[]; run: Texture[] };
  rangerHealed: Texture[];
  boss: { idle: Texture[]; walk: Texture[] };
  bossHealed: { idle: Texture[]; walk: Texture[] };
  tiles: {
    wallMid: Texture;
    jungleWalls: Texture[];
    floors: Texture[];
    doorClosed: Texture;
  };
  ui: {
    heartFull: Texture;
    heartHalf: Texture;
    heartEmpty: Texture;
  };
}

// --- Types ---

interface Point {
  x: number;
  y: number;
}

type Direction = "up" | "down" | "left" | "right";
type CellType = "wall" | "floor" | "door";
type GameState = "start" | "playing" | "gameOver" | "win";
type EnemyType = "chaser" | "ranger" | "boss";
type EnemyState = "active" | "calm" | "dissolving" | "healed";
type PlayerCharacter = "fairy" | "wizard";

const GNOLL_VARIANTS = ["gnollbrute", "gnollshaman", "gnollscout"] as const;
const ELF_GENDERS = ["elf_f", "elf_m"] as const;

interface Player {
  pos: Point;
  facing: Direction;
  aimDirection: Direction;
  health: number;
  maxHealth: number;
  iFrames: number;
  shootCooldown: number;
  sprinting: boolean;
}

interface Enemy {
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

interface Projectile {
  pos: Point;
  direction: Direction;
  speed: number;
  isPlayerBeam: boolean;
}

interface Pickup {
  pos: Point;
  type: "health";
  collected: boolean;
}

interface Room {
  grid: CellType[][];
  enemies: Enemy[];
  pickups: Pickup[];
  connections: Map<Direction, number>;
  cleared: boolean;
  playerSpawn: Point;
}

interface Dungeon {
  rooms: Room[];
  currentRoom: number;
  bossRoom: number;
  totalEnemies: number;
}

// --- Constants ---

const PLAYER_MAX_HEALTH = 5;
const SHOOT_COOLDOWN = 3;
const BEAM_SPEED = 2;
const I_FRAME_DURATION = 4;

const ENEMY_HEALTH = 1;
const CHASER_MOVE_INTERVAL = 3;
const RANGER_FIRE_INTERVAL = 7;
const RANGER_SHOT_SPEED = 1;
const CALM_DURATION = 6;
const DISSOLVE_DURATION = 4;

const BOSS_BASE_HEALTH = 3;
const BOSS_FIRE_INTERVAL = 7;
const BOSS_MOVE_INTERVAL = 4;
const BOSS_SHOT_SPEED = 1;

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIR: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// Soft rainbow palette (from art direction brainstorm)
const RAINBOW_COLORS = [
  0xff6b6b, 0xffa06b, 0xffd93d, 0x6bcf7f, 0x6bb5ff, 0x9b7dff, 0xd97dff,
];

// Enchanted forest pastel floor palette (warm mossy tones)
const RAINBOW_FLOOR_COLORS = [
  0xc4ddb2, 0xa8d4a0, 0xd4e8b8, 0xf0e6b0, 0xe8d0a8, 0xf2c8c0, 0xb8d8c4,
];

// Environment colors

// UI colors
const COLOR_UI_TEXT = 0xffeedd;
const COLOR_UI_DIM = 0x9988aa;
const COLOR_ENEMY_SHOT = 0x884422;

// Entity sprite scale (1.0 = one cell, 1.4 = 40% bigger, centered)
const ENTITY_SCALE = 1.4;

// --- Key mappings ---

// WASD = movement, Arrows = aim
const MOVE_KEY_DIRECTION: Record<string, Direction> = {
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

const AIM_KEY_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

// --- Animation helper ---

function animFrame(tick: number, frameCount: number, ticksPerFrame: number): number {
  return Math.floor(tick / ticksPerFrame) % frameCount;
}

// --- Simple seeded RNG ---

function makeRng(seed: number) {
  let s = seed;
  return {
    next(): number {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0x100000000;
    },
    nextInt(min: number, max: number): number {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    shuffle<T>(arr: T[]): void {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    },
  };
}

// --- Door positions ---

function doorPos(dir: Direction): Point {
  const mid = Math.floor(GRID_SIZE / 2);
  switch (dir) {
    case "up": return { x: mid, y: 0 };
    case "down": return { x: mid, y: GRID_SIZE - 1 };
    case "left": return { x: 0, y: mid };
    case "right": return { x: GRID_SIZE - 1, y: mid };
  }
}

function entryPos(dir: Direction): Point {
  const door = doorPos(dir);
  const inward = DELTA[OPPOSITE_DIR[dir]];
  return { x: door.x + inward.x, y: door.y + inward.y };
}

// --- Dungeon generation ---

function generateDungeon(): Dungeon {
  const rng = makeRng(Date.now());
  const numRooms = rng.nextInt(5, 7);
  const dirs: Direction[] = ["up", "down", "left", "right"];

  interface RoomNode {
    id: number;
    connections: Map<Direction, number>;
  }

  const nodes: RoomNode[] = [];
  for (let i = 0; i < numRooms; i++) {
    nodes.push({ id: i, connections: new Map() });
  }

  for (let i = 0; i < numRooms - 1; i++) {
    const availDirs = dirs.filter((d) => !nodes[i].connections.has(d));
    if (availDirs.length === 0) break;
    rng.shuffle(availDirs);
    const dir = availDirs[0];
    nodes[i].connections.set(dir, i + 1);
    nodes[i + 1].connections.set(OPPOSITE_DIR[dir], i);
  }

  const bossRoom = numRooms - 1;

  const rooms: Room[] = [];
  let totalEnemies = 0;

  for (let i = 0; i < numRooms; i++) {
    const room = generateRoom(rng, nodes[i].connections);
    rooms.push(room);
  }

  for (let i = 0; i < numRooms; i++) {
    const room = rooms[i];
    const floorCells = getFloorCells(room);

    if (i === 0) {
      placePickups(rng, room, floorCells, 1);
      room.cleared = true;
    } else if (i === bossRoom) {
      const bossPos = pickSpawnPos(rng, floorCells, room);
      if (bossPos) {
        room.enemies.push({
          pos: bossPos,
          type: "boss",
          state: "active",
          health: BOSS_BASE_HEALTH,
          maxHealth: BOSS_BASE_HEALTH,
          stateTimer: 0,
          moveCooldown: BOSS_MOVE_INTERVAL,
          shootCooldown: BOSS_FIRE_INTERVAL,
          gnollVariant: "",
          healedGender: "",
        });
        totalEnemies++;
      }
    } else {
      const enemyCount = rng.nextInt(2, 4);
      for (let e = 0; e < enemyCount; e++) {
        const pos = pickSpawnPos(rng, floorCells, room);
        if (!pos) break;
        const type: EnemyType = rng.next() < 0.5 ? "chaser" : "ranger";
        room.enemies.push({
          pos,
          type,
          state: "active",
          health: ENEMY_HEALTH,
          maxHealth: ENEMY_HEALTH,
          stateTimer: 0,
          moveCooldown: type === "chaser" ? CHASER_MOVE_INTERVAL : 0,
          shootCooldown: type === "ranger" ? RANGER_FIRE_INTERVAL : 0,
          gnollVariant: GNOLL_VARIANTS[rng.nextInt(0, 2)],
          healedGender: ELF_GENDERS[rng.nextInt(0, 1)],
        });
        totalEnemies++;
      }
      placePickups(rng, room, floorCells, rng.nextInt(1, 2));
    }

    room.playerSpawn = findPlayerSpawn(room);
  }

  return { rooms, currentRoom: 0, bossRoom, totalEnemies };
}

function generateRoom(
  rng: ReturnType<typeof makeRng>,
  connections: Map<Direction, number>
): Room {
  for (let attempt = 0; attempt < 5; attempt++) {
    const grid: CellType[][] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push("wall");
      }
      grid.push(row);
    }

    const areaW = rng.nextInt(10, 16);
    const areaH = rng.nextInt(10, 16);
    const startX = Math.floor((GRID_SIZE - areaW) / 2);
    const startY = Math.floor((GRID_SIZE - areaH) / 2);

    for (let y = startY; y < startY + areaH; y++) {
      for (let x = startX; x < startX + areaW; x++) {
        grid[y][x] = "floor";
      }
    }

    const numObstacles = rng.nextInt(2, 4);
    for (let o = 0; o < numObstacles; o++) {
      const obstacleType = rng.nextInt(0, 2);
      if (obstacleType === 0) {
        const px = rng.nextInt(startX + 2, startX + areaW - 4);
        const py = rng.nextInt(startY + 2, startY + areaH - 4);
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            grid[py + dy][px + dx] = "wall";
          }
        }
      } else if (obstacleType === 1) {
        const len = rng.nextInt(3, 5);
        const wx = rng.nextInt(startX + 2, startX + areaW - len - 2);
        const wy = rng.nextInt(startY + 2, startY + areaH - 3);
        for (let i = 0; i < len; i++) {
          grid[wy][wx + i] = "wall";
        }
      } else {
        const len = rng.nextInt(3, 5);
        const wx = rng.nextInt(startX + 2, startX + areaW - 3);
        const wy = rng.nextInt(startY + 2, startY + areaH - len - 2);
        for (let i = 0; i < len; i++) {
          grid[wy + i][wx] = "wall";
        }
      }
    }

    for (const [dir] of connections) {
      const door = doorPos(dir);
      grid[door.y][door.x] = "door";
      carveCorridor(grid, door, dir, startX, startY, startX + areaW - 1, startY + areaH - 1);
    }

    const centerX = Math.floor(GRID_SIZE / 2);
    const centerY = Math.floor(GRID_SIZE / 2);
    let seedCell: Point | null = null;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = centerX + dx;
          const cy = centerY + dy;
          if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE) {
            if (grid[cy][cx] === "floor" || grid[cy][cx] === "door") {
              seedCell = { x: cx, y: cy };
            }
          }
          if (seedCell) break;
        }
        if (seedCell) break;
      }
      if (seedCell) break;
    }

    if (!seedCell) continue;

    const reachable = floodFill(grid, seedCell);
    let allReachable = true;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if ((grid[y][x] === "floor" || grid[y][x] === "door") && !reachable[y][x]) {
          allReachable = false;
          break;
        }
      }
      if (!allReachable) break;
    }

    if (allReachable) {
      return {
        grid,
        enemies: [],
        pickups: [],
        connections,
        cleared: false,
        playerSpawn: { x: centerX, y: centerY },
      };
    }
  }

  return generateFallbackRoom(connections);
}

function carveCorridor(
  grid: CellType[][],
  door: Point,
  dir: Direction,
  areaX1: number,
  areaY1: number,
  areaX2: number,
  areaY2: number
): void {
  const inward = OPPOSITE_DIR[dir];
  const d = DELTA[inward];
  let x = door.x + d.x;
  let y = door.y + d.y;

  while (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
    if (grid[y][x] === "floor") break;
    grid[y][x] = "floor";
    if (x >= areaX1 && x <= areaX2 && y >= areaY1 && y <= areaY2) break;
    x += d.x;
    y += d.y;
  }
}

function floodFill(grid: CellType[][], start: Point): boolean[][] {
  const visited: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    visited.push(new Array(GRID_SIZE).fill(false));
  }

  const queue: Point[] = [start];
  visited[start.y][start.x] = true;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      if (visited[ny][nx]) continue;
      if (grid[ny][nx] === "wall") continue;
      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }

  return visited;
}

function generateFallbackRoom(connections: Map<Direction, number>): Room {
  const grid: CellType[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: CellType[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
        row.push("wall");
      } else {
        row.push("floor");
      }
    }
    grid.push(row);
  }

  for (const [dir] of connections) {
    const door = doorPos(dir);
    grid[door.y][door.x] = "door";
  }

  grid[5][5] = "wall";
  grid[5][6] = "wall";
  grid[6][5] = "wall";
  grid[6][6] = "wall";

  grid[13][13] = "wall";
  grid[13][14] = "wall";
  grid[14][13] = "wall";
  grid[14][14] = "wall";

  return {
    grid,
    enemies: [],
    pickups: [],
    connections,
    cleared: false,
    playerSpawn: { x: 10, y: 10 },
  };
}

function getFloorCells(room: Room): Point[] {
  const cells: Point[] = [];
  for (let y = 2; y < GRID_SIZE - 2; y++) {
    for (let x = 2; x < GRID_SIZE - 2; x++) {
      if (room.grid[y][x] === "floor") {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function pickSpawnPos(
  rng: ReturnType<typeof makeRng>,
  floorCells: Point[],
  room: Room
): Point | null {
  const candidates = floorCells.filter((c) => {
    for (const [dir] of room.connections) {
      const door = doorPos(dir);
      if (Math.abs(c.x - door.x) + Math.abs(c.y - door.y) < 3) return false;
    }
    for (const e of room.enemies) {
      if (e.pos.x === c.x && e.pos.y === c.y) return false;
    }
    for (const p of room.pickups) {
      if (p.pos.x === c.x && p.pos.y === c.y) return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;
  return { ...candidates[rng.nextInt(0, candidates.length - 1)] };
}

function placePickups(
  rng: ReturnType<typeof makeRng>,
  room: Room,
  floorCells: Point[],
  count: number
): void {
  for (let i = 0; i < count; i++) {
    const pos = pickSpawnPos(rng, floorCells, room);
    if (pos) {
      room.pickups.push({ pos, type: "health", collected: false });
    }
  }
}

function findPlayerSpawn(room: Room): Point {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          if (room.grid[y][x] === "floor") {
            return { x, y };
          }
        }
      }
    }
  }
  return { x: cx, y: cy };
}

// --- Scene ---

export class DungeonCrawlerScene implements Scene {
  private textures: GameTextures;
  private state: GameState = "start";
  private player!: Player;
  private playerCharacter: PlayerCharacter = "fairy";
  private projectiles: Projectile[] = [];
  private dungeon!: Dungeon;
  private heldKeys = new Set<string>();
  private staticDirty = true;
  private tickCount = 0;
  private rainbowPower = 0;
  private healedEnemies = 0;

  constructor(textures: GameTextures) {
    this.textures = textures;
  }

  init(_context: GameContext): void {
    this.resetGame();
  }

  private get room(): Room {
    return this.dungeon.rooms[this.dungeon.currentRoom];
  }

  private resetGame(): void {
    this.dungeon = generateDungeon();
    this.player = {
      pos: { ...this.dungeon.rooms[0].playerSpawn },
      facing: "right",
      aimDirection: "right",
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      iFrames: 0,
      shootCooldown: 0,
      sprinting: false,
    };
    this.projectiles = [];
    this.heldKeys.clear();
    this.staticDirty = true;
    this.tickCount = 0;
    this.rainbowPower = 0;
    this.healedEnemies = 0;
  }

  update(_dt: number): void {
    this.tickCount++; // always tick for animations (start screen, win screen)
    if (this.state !== "playing") return;

    const enemies = this.room.enemies;

    // --- 1. Process input: movement ---
    this.player.sprinting =
      this.heldKeys.has("ShiftLeft") || this.heldKeys.has("ShiftRight");

    const { dx, dy } = this.getMoveDelta();
    if (dx !== 0 || dy !== 0) {
      const steps = this.player.sprinting ? 2 : 1;
      for (let i = 0; i < steps; i++) {
        const nx = this.player.pos.x + dx;
        const ny = this.player.pos.y + dy;
        const isDiagonal = dx !== 0 && dy !== 0;
        const canMove = isDiagonal
          ? this.isWalkable(nx, ny) &&
            this.isWalkable(this.player.pos.x + dx, this.player.pos.y) &&
            this.isWalkable(this.player.pos.x, this.player.pos.y + dy)
          : this.isWalkable(nx, ny);
        if (canMove) {
          this.player.pos.x = nx;
          this.player.pos.y = ny;
        } else {
          break;
        }
      }
    }

    // --- 1a. Check door transition ---
    const cell = this.room.grid[this.player.pos.y][this.player.pos.x];
    if (cell === "door") {
      this.handleDoorTransition();
      return;
    }

    // --- 1b. Process input: shooting ---
    if (this.player.shootCooldown > 0) {
      this.player.shootCooldown--;
    }
    if (this.heldKeys.has("Space") && this.player.shootCooldown <= 0) {
      this.spawnBeam();
      this.player.shootCooldown = SHOOT_COOLDOWN;
    }

    // --- 2. Move player projectiles ---
    this.movePlayerProjectiles();

    // --- 3. Move enemy projectiles ---
    this.moveEnemyProjectiles();

    // --- 4. Move enemies ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.type === "chaser") {
        this.updateChaser(enemy);
      } else if (enemy.type === "boss") {
        this.updateBoss(enemy);
      }
    }

    // --- 5. Enemy AI decisions ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.type === "ranger") {
        this.updateRanger(enemy);
      } else if (enemy.type === "boss") {
        this.updateBossAI(enemy);
      }
    }

    // --- 6. Collision: enemy bodies vs player ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.pos.x === this.player.pos.x && enemy.pos.y === this.player.pos.y) {
        this.damagePlayer();
      }
    }

    // --- 6b. Collision: pickups ---
    for (const pickup of this.room.pickups) {
      if (pickup.collected) continue;
      if (pickup.pos.x === this.player.pos.x && pickup.pos.y === this.player.pos.y) {
        pickup.collected = true;
        if (this.player.health < this.player.maxHealth) {
          this.player.health++;
        }
      }
    }

    // --- 7. Update effect timers ---
    if (this.player.iFrames > 0) {
      this.player.iFrames--;
    }
    this.updateEnemyTimers();

    // --- 8. Transition dissolved enemies to healed, update rainbow power ---
    for (const e of enemies) {
      if (e.state === "dissolving" && e.stateTimer <= 0) {
        e.state = "healed";
        this.healedEnemies++;
        if (this.dungeon.totalEnemies > 0) {
          this.rainbowPower = Math.min(1, this.healedEnemies / this.dungeon.totalEnemies);
        }
      }
    }

    if (!this.room.cleared && this.room.enemies.every((e) => e.state === "healed")) {
      this.room.cleared = true;
      this.staticDirty = true; // re-render room with healed background
    }

    // --- 9. Check win/lose ---
    if (this.player.health <= 0) {
      this.state = "gameOver";
    }
    if (this.dungeon.currentRoom === this.dungeon.bossRoom && this.room.cleared) {
      this.state = "win";
    }
  }

  // --- Door transitions ---

  private handleDoorTransition(): void {
    const pos = this.player.pos;
    let transitionDir: Direction | null = null;

    for (const [dir] of this.room.connections) {
      const door = doorPos(dir);
      if (pos.x === door.x && pos.y === door.y) {
        transitionDir = dir;
        break;
      }
    }

    if (!transitionDir) return;

    const targetRoomIdx = this.room.connections.get(transitionDir);
    if (targetRoomIdx === undefined) return;

    this.projectiles = [];
    this.dungeon.currentRoom = targetRoomIdx;

    const enterDir = OPPOSITE_DIR[transitionDir];
    const entry = entryPos(enterDir);
    this.player.pos = { ...entry };

    this.staticDirty = true;
  }

  // --- Input helpers ---

  private getMoveDelta(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    if (this.heldKeys.has("KeyW")) dy -= 1;
    if (this.heldKeys.has("KeyS")) dy += 1;
    if (this.heldKeys.has("KeyA")) dx -= 1;
    if (this.heldKeys.has("KeyD")) dx += 1;

    return { dx, dy };
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    const cell = this.room.grid[y][x];
    return cell === "floor" || cell === "door";
  }

  // --- Projectile logic ---

  private spawnBeam(): void {
    const delta = DELTA[this.player.aimDirection];
    const startX = this.player.pos.x + delta.x;
    const startY = this.player.pos.y + delta.y;
    if (!this.isWalkable(startX, startY)) return;

    this.projectiles.push({
      pos: { x: startX, y: startY },
      direction: this.player.aimDirection,
      speed: BEAM_SPEED,
      isPlayerBeam: true,
    });
  }

  private movePlayerProjectiles(): void {
    const toRemove: number[] = [];
    const enemies = this.room.enemies;

    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i];
      if (!proj.isPlayerBeam) continue;

      const delta = DELTA[proj.direction];
      let alive = true;

      for (let step = 0; step < proj.speed; step++) {
        const nx = proj.pos.x + delta.x;
        const ny = proj.pos.y + delta.y;

        if (
          nx < 0 || nx >= GRID_SIZE ||
          ny < 0 || ny >= GRID_SIZE ||
          this.room.grid[ny][nx] === "wall"
        ) {
          alive = false;
          break;
        }

        proj.pos.x = nx;
        proj.pos.y = ny;

        const hitEnemy = enemies.find(
          (e) => e.state === "active" && e.pos.x === nx && e.pos.y === ny
        );
        if (hitEnemy) {
          hitEnemy.health--;
          const threshold = hitEnemy.type === "boss"
            ? hitEnemy.maxHealth - this.getBossEffectiveMaxHealth()
            : 0;
          if (hitEnemy.health <= threshold) {
            hitEnemy.state = "calm";
            hitEnemy.stateTimer = CALM_DURATION;
          }
          alive = false;
          break;
        }
      }

      if (!alive) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1);
    }
  }

  private moveEnemyProjectiles(): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i];
      if (proj.isPlayerBeam) continue;

      const delta = DELTA[proj.direction];
      let alive = true;

      for (let step = 0; step < proj.speed; step++) {
        const nx = proj.pos.x + delta.x;
        const ny = proj.pos.y + delta.y;

        if (
          nx < 0 || nx >= GRID_SIZE ||
          ny < 0 || ny >= GRID_SIZE ||
          this.room.grid[ny][nx] === "wall"
        ) {
          alive = false;
          break;
        }

        proj.pos.x = nx;
        proj.pos.y = ny;

        if (nx === this.player.pos.x && ny === this.player.pos.y) {
          this.damagePlayer();
          alive = false;
          break;
        }
      }

      if (!alive) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1);
    }
  }

  // --- Enemy AI ---

  private updateChaser(enemy: Enemy): void {
    enemy.moveCooldown--;
    if (enemy.moveCooldown > 0) return;
    enemy.moveCooldown = CHASER_MOVE_INTERVAL;

    const next = this.bfsNextStep(enemy.pos, this.player.pos);
    if (next) {
      enemy.pos.x = next.x;
      enemy.pos.y = next.y;
    }
  }

  private updateRanger(enemy: Enemy): void {
    enemy.shootCooldown--;
    if (enemy.shootCooldown > 0) return;
    enemy.shootCooldown = RANGER_FIRE_INTERVAL;

    const fireDir = this.getRangerFireDirection(enemy.pos);
    if (fireDir) {
      const delta = DELTA[fireDir];
      this.projectiles.push({
        pos: { x: enemy.pos.x + delta.x, y: enemy.pos.y + delta.y },
        direction: fireDir,
        speed: RANGER_SHOT_SPEED,
        isPlayerBeam: false,
      });
    }
  }

  private updateBoss(enemy: Enemy): void {
    const healthRatio = enemy.health / enemy.maxHealth;
    if (healthRatio >= 0.5) return;

    enemy.moveCooldown--;
    if (enemy.moveCooldown > 0) return;
    enemy.moveCooldown = BOSS_MOVE_INTERVAL;

    const next = this.bfsNextStep(enemy.pos, this.player.pos);
    if (next) {
      enemy.pos.x = next.x;
      enemy.pos.y = next.y;
    }
  }

  private updateBossAI(enemy: Enemy): void {
    enemy.shootCooldown--;
    if (enemy.shootCooldown > 0) return;
    enemy.shootCooldown = BOSS_FIRE_INTERVAL;

    const dirs: Direction[] = ["up", "down", "left", "right"];
    let bestDir: Direction = "down";
    let bestAlignment = 0;

    for (const dir of dirs) {
      const d = DELTA[dir];
      const ddx = this.player.pos.x - enemy.pos.x;
      const ddy = this.player.pos.y - enemy.pos.y;
      const alignment = ddx * d.x + ddy * d.y;
      if (alignment > bestAlignment) {
        bestAlignment = alignment;
        bestDir = dir;
      }
    }

    const spreadDirs = this.getSpreadDirections(bestDir);
    for (const dir of spreadDirs) {
      const d = DELTA[dir];
      const sx = enemy.pos.x + d.x;
      const sy = enemy.pos.y + d.y;
      if (sx >= 0 && sx < GRID_SIZE && sy >= 0 && sy < GRID_SIZE && this.room.grid[sy][sx] !== "wall") {
        this.projectiles.push({
          pos: { x: sx, y: sy },
          direction: dir,
          speed: BOSS_SHOT_SPEED,
          isPlayerBeam: false,
        });
      }
    }
  }

  private getSpreadDirections(main: Direction): Direction[] {
    switch (main) {
      case "up": return ["up", "left", "right"];
      case "down": return ["down", "left", "right"];
      case "left": return ["left", "up", "down"];
      case "right": return ["right", "up", "down"];
    }
  }

  private getRangerFireDirection(from: Point): Direction | null {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    let bestDir: Direction | null = null;
    let bestDist = Infinity;

    for (const dir of dirs) {
      const delta = DELTA[dir];
      let x = from.x;
      let y = from.y;
      let clear = true;

      while (true) {
        x += delta.x;
        y += delta.y;

        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
          clear = false;
          break;
        }
        if (this.room.grid[y][x] === "wall") {
          clear = false;
          break;
        }
        if (x === this.player.pos.x && y === this.player.pos.y) {
          break;
        }
      }

      if (clear) {
        const dist = Math.abs(from.x - this.player.pos.x) + Math.abs(from.y - this.player.pos.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestDir = dir;
        }
      }
    }

    return bestDir;
  }

  // --- BFS pathfinding ---

  private bfsNextStep(from: Point, to: Point): Point | null {
    if (from.x === to.x && from.y === to.y) return null;

    const grid = this.room.grid;
    const visited = new Array(GRID_SIZE * GRID_SIZE).fill(false);
    const parent = new Array(GRID_SIZE * GRID_SIZE).fill(-1);
    const toIdx = (x: number, y: number) => y * GRID_SIZE + x;

    const queue: Point[] = [{ x: from.x, y: from.y }];
    visited[toIdx(from.x, from.y)] = true;

    const neighbors: Point[] = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;

      for (const n of neighbors) {
        const nx = cur.x + n.x;
        const ny = cur.y + n.y;

        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const idx = toIdx(nx, ny);
        if (visited[idx]) continue;
        if (grid[ny][nx] === "wall") continue;

        visited[idx] = true;
        parent[idx] = toIdx(cur.x, cur.y);

        if (nx === to.x && ny === to.y) {
          let step = idx;
          while (parent[step] !== toIdx(from.x, from.y)) {
            step = parent[step];
          }
          return { x: step % GRID_SIZE, y: Math.floor(step / GRID_SIZE) };
        }

        queue.push({ x: nx, y: ny });
      }
    }

    return null;
  }

  // --- Damage ---

  private damagePlayer(): void {
    if (this.player.iFrames > 0) return;
    this.player.health--;
    this.player.iFrames = I_FRAME_DURATION;
  }

  // --- Enemy state timers ---

  private updateEnemyTimers(): void {
    for (const enemy of this.room.enemies) {
      if (enemy.state === "calm") {
        enemy.stateTimer--;
        if (enemy.stateTimer <= 0) {
          enemy.state = "dissolving";
          enemy.stateTimer = DISSOLVE_DURATION;
        }
      } else if (enemy.state === "dissolving") {
        enemy.stateTimer--;
      }
    }
  }

  // --- Boss health adjusted by rainbow power ---

  private getBossEffectiveMaxHealth(): number {
    return Math.max(2, BOSS_BASE_HEALTH - Math.floor(this.rainbowPower * 3));
  }

  // --- Rendering ---

  render(renderer: Renderer): void {
    if (this.staticDirty) {
      renderer.clearStatic();
      this.renderRoom(renderer);
      this.staticDirty = false;
    }

    if (this.state === "start") {
      this.renderStartScreen(renderer);
      return;
    }

    if (this.state === "gameOver") {
      this.renderGameOverScreen(renderer);
      return;
    }

    if (this.state === "win") {
      this.renderWinScreen(renderer);
      return;
    }

    this.renderEntities(renderer);
    this.renderHUD(renderer);
  }

  private renderRoom(renderer: Renderer): void {
    const tiles = this.textures.tiles;
    const cleared = this.room.cleared && this.state === "playing";
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.room.grid[y][x];
        switch (cell) {
          case "wall": {
            // Deterministic pseudo-random tile pick per cell
            let h = x * 374761 + y * 668265;
            h = ((h >> 16) ^ h) * 0x45d9f3b;
            h = ((h >> 16) ^ h);
            const wallIdx = ((h >>> 0) % tiles.jungleWalls.length);
            renderer.drawSpriteStatic(x, y, tiles.jungleWalls[wallIdx]);
            break;
          }
          case "door":
            renderer.drawSpriteStatic(x, y, tiles.doorClosed);
            break;
          case "floor":
          default: {
            let floorColor = 0x2a1519;
            if (cleared) {
              let fh = x * 271828 + y * 314159;
              fh = ((fh >> 16) ^ fh) * 0x45d9f3b;
              fh = ((fh >> 16) ^ fh);
              floorColor = RAINBOW_FLOOR_COLORS[(fh >>> 0) % RAINBOW_FLOOR_COLORS.length];
            }
            renderer.drawRectStatic(x, y, 1, 1, floorColor);
            break;
          }
        }
      }
    }
  }

  private renderEntities(renderer: Renderer): void {
    const tex = this.textures;
    const sc = ENTITY_SCALE;

    // Draw pickups (heart sprites — slightly smaller than entities)
    for (const pickup of this.room.pickups) {
      if (pickup.collected) continue;
      renderer.drawSpriteScaled(pickup.pos.x, pickup.pos.y, tex.ui.heartFull, 1.2);
    }

    // Draw enemies
    for (const enemy of this.room.enemies) {
      if (enemy.state === "active") {
        const frame = this.getEnemyActiveTexture(enemy);
        renderer.drawSpriteScaled(enemy.pos.x, enemy.pos.y, frame, sc);
      } else if (enemy.state === "calm") {
        // Show healed form at reduced alpha (pulsing)
        const alpha = 0.5 + 0.3 * (enemy.stateTimer / CALM_DURATION);
        const frame = this.getEnemyHealedTexture(enemy);
        renderer.drawSpriteScaled(enemy.pos.x, enemy.pos.y, frame, sc, alpha);
      } else if (enemy.state === "dissolving") {
        // Show healed form with rainbow tint, fading out
        const progress = 1 - enemy.stateTimer / DISSOLVE_DURATION;
        const colorIdx = Math.floor(progress * (RAINBOW_COLORS.length - 1));
        const alpha = 1 - progress;
        const frame = this.getEnemyHealedTexture(enemy);
        renderer.drawSpriteScaled(
          enemy.pos.x, enemy.pos.y, frame, sc, alpha,
          RAINBOW_COLORS[colorIdx]
        );
      } else if (enemy.state === "healed") {
        // Friendly healed sprite, gentle idle animation
        const frame = this.getEnemyHealedTexture(enemy);
        renderer.drawSpriteScaled(enemy.pos.x, enemy.pos.y, frame, sc, 0.85);
      }
    }

    // Draw projectiles
    for (const proj of this.projectiles) {
      if (proj.isPlayerBeam) {
        // Rainbow beam: color cycles based on position
        const colorIdx = (proj.pos.x + proj.pos.y + this.tickCount) % RAINBOW_COLORS.length;
        renderer.drawRectAlpha(
          proj.pos.x + 0.15, proj.pos.y + 0.15, 0.7, 0.7,
          RAINBOW_COLORS[colorIdx], 0.9
        );
      } else {
        renderer.drawRectAlpha(
          proj.pos.x + 0.2, proj.pos.y + 0.2, 0.6, 0.6,
          COLOR_ENEMY_SHOT, 0.9
        );
      }
    }

    // Draw player
    if (this.player.iFrames > 0 && this.player.iFrames % 2 === 0) {
      // Blink: skip rendering every other iFrame tick
    } else {
      const playerFrames = tex.player[this.playerCharacter];
      const frame = animFrame(this.tickCount, playerFrames.length, 4);
      renderer.drawSpriteScaled(this.player.pos.x, this.player.pos.y, playerFrames[frame], sc);
    }
  }

  private getEnemyActiveTexture(enemy: Enemy): Texture {
    const tex = this.textures;
    const frame4 = animFrame(this.tickCount, 4, 3);

    if (enemy.type === "chaser") {
      const variant = tex.chaser[enemy.gnollVariant];
      if (!variant) return tex.chaser.gnollbrute.idle[frame4];
      // Use walk frames when chaser is moving (cooldown was just reset)
      const isMoving = enemy.moveCooldown === CHASER_MOVE_INTERVAL;
      return isMoving ? variant.walk[frame4] : variant.idle[frame4];
    }

    if (enemy.type === "ranger") {
      return tex.ranger.idle[frame4];
    }

    // Boss (golem — 6 frames)
    const frame6 = animFrame(this.tickCount, 6, 3);
    const healthRatio = enemy.health / enemy.maxHealth;
    const isMoving = healthRatio < 0.5 && enemy.moveCooldown === BOSS_MOVE_INTERVAL;
    return isMoving ? tex.boss.walk[frame6] : tex.boss.idle[frame6];
  }

  private getEnemyHealedTexture(enemy: Enemy): Texture {
    const tex = this.textures;
    const frame4 = animFrame(this.tickCount, 4, 6); // slower animation for healed

    if (enemy.type === "chaser") {
      const gender = enemy.healedGender as "elf_f" | "elf_m";
      const elfFrames = tex.chaserHealed[gender];
      return elfFrames ? elfFrames[frame4] : tex.chaserHealed.elf_f[frame4];
    }

    if (enemy.type === "ranger") {
      return tex.rangerHealed[frame4];
    }

    // Boss healed (forest guardian)
    return tex.bossHealed.idle[frame4];
  }

  private renderHUD(renderer: Renderer): void {
    const tex = this.textures;
    const startX = 8;
    const startY = 4;
    const heartSpacing = CELL_SIZE + 2; // full cell size + small gap

    // Health hearts (rendered as full cell-sized sprites)
    for (let i = 0; i < this.player.maxHealth; i++) {
      const heartTex = i < this.player.health ? tex.ui.heartFull : tex.ui.heartEmpty;
      const heartGridX = (startX + i * heartSpacing) / CELL_SIZE;
      const heartGridY = startY / CELL_SIZE;
      renderer.drawSprite(heartGridX, heartGridY, heartTex);
    }

    // Rainbow power bar
    const rbY = startY + CELL_SIZE + 4;
    const rbW = this.player.maxHealth * heartSpacing;
    const rbColorIdx = Math.floor(this.tickCount / 3) % RAINBOW_COLORS.length;
    renderer.drawBar(
      startX, rbY, rbW, 8,
      this.rainbowPower,
      RAINBOW_COLORS[rbColorIdx], 0x222233
    );
    renderer.drawText("Rainbow", startX + rbW + 6, rbY - 2, {
      fontSize: 10,
      color: 0xd97dff,
    });

    // Room indicator
    const roomNum = this.dungeon.currentRoom + 1;
    const totalRooms = this.dungeon.rooms.length;
    const clearedCount = this.dungeon.rooms.filter((r) => r.cleared).length;
    renderer.drawText(
      `Room ${roomNum}/${totalRooms} (${clearedCount} cleared)`,
      CANVAS_WIDTH - 8, startY - 2,
      { fontSize: 12, color: COLOR_UI_TEXT, anchor: 1 }
    );

    // Enemy count
    const activeCount = this.room.enemies.filter(
      (e) => e.state === "active"
    ).length;
    if (activeCount > 0) {
      renderer.drawText(
        `Enemies: ${activeCount}`,
        CANVAS_WIDTH - 8, startY + 14,
        { fontSize: 12, color: COLOR_UI_TEXT, anchor: 1 }
      );
    }
  }

  private renderStartScreen(renderer: Renderer): void {
    renderer.drawRectAlpha(0, 0, GRID_SIZE, GRID_SIZE, 0x000000, 0.75);
    const cx = CANVAS_WIDTH / 2;
    const tex = this.textures;

    // Title in cycling rainbow colors
    renderer.drawText("Rainbow Crawler", cx, 30, {
      fontSize: 42,
      color: RAINBOW_COLORS[Math.floor(this.tickCount / 3) % RAINBOW_COLORS.length],
      anchor: 0.5,
    });

    // Lore intro
    const lore = [
      "Darkness has swallowed the Enchanted Forest.",
      "Its creatures — once gentle — now wander as corrupted shadows.",
      "Only the siblings Sylvaria and Silvandor carry the ancient gift",
      "of rainbow healing, a light that can restore what was lost.",
      "Descend into the dungeons. Find the source. Heal your world.",
    ];
    const loreStart = 90;
    for (let i = 0; i < lore.length; i++) {
      renderer.drawText(lore[i], cx, loreStart + i * 18, {
        fontSize: 12,
        color: i === lore.length - 1 ? 0x9b7dff : 0xccbbdd,
        anchor: 0.5,
      });
    }

    // Character selection
    renderer.drawText("Choose your hero:", cx, 210, {
      fontSize: 16,
      color: COLOR_UI_TEXT,
      anchor: 0.5,
    });

    // Sylvaria (fairy, left)
    const leftX = cx - 80;
    const rightX = cx + 80;
    const charY = 248;
    const charGridX = leftX / CELL_SIZE;
    const charGridY = charY / CELL_SIZE;
    const charGridX2 = rightX / CELL_SIZE;

    const fairyFrame = animFrame(this.tickCount, 4, 4);
    renderer.drawSpriteScaled(charGridX - 0.5, charGridY, tex.player.fairy[fairyFrame], 2.0);
    renderer.drawText("Sylvaria", leftX, charY + CELL_SIZE * 2.0 + 4, {
      fontSize: 13,
      color: this.playerCharacter === "fairy" ? 0xffd93d : COLOR_UI_DIM,
      anchor: 0.5,
    });

    // Angrod (wizard, right)
    const wizardFrame = animFrame(this.tickCount, 4, 4);
    renderer.drawSpriteScaled(charGridX2 - 0.5, charGridY, tex.player.wizard[wizardFrame], 2.0);
    renderer.drawText("Silvandor", rightX, charY + CELL_SIZE * 2.0 + 4, {
      fontSize: 13,
      color: this.playerCharacter === "wizard" ? 0xffd93d : COLOR_UI_DIM,
      anchor: 0.5,
    });

    // Selection indicator
    const selectedX = this.playerCharacter === "fairy" ? leftX : rightX;
    renderer.drawText(">", selectedX - 28, charY + 8, {
      fontSize: 20,
      color: 0xffd93d,
    });

    // Controls
    renderer.drawText("< / > to choose  |  SPACE to start", cx, 400, {
      fontSize: 14,
      color: COLOR_UI_DIM,
      anchor: 0.5,
    });
    renderer.drawText("WASD: Move  |  Arrows: Aim  |  SPACE: Shoot  |  SHIFT: Sprint", cx, 428, {
      fontSize: 11,
      color: COLOR_UI_DIM,
      anchor: 0.5,
    });
  }

  private renderGameOverScreen(renderer: Renderer): void {
    renderer.drawRectAlpha(0, 0, GRID_SIZE, GRID_SIZE, 0x000000, 0.75);
    const cx = CANVAS_WIDTH / 2;

    renderer.drawText("Game Over", cx, 200, {
      fontSize: 48,
      color: 0xff6b6b,
      anchor: 0.5,
    });

    const clearedCount = this.dungeon.rooms.filter((r) => r.cleared).length;
    renderer.drawText(`Rooms explored: ${clearedCount}/${this.dungeon.rooms.length}`, cx, 280, {
      fontSize: 16,
      color: COLOR_UI_DIM,
      anchor: 0.5,
    });
    renderer.drawText(`Enemies healed: ${this.healedEnemies}/${this.dungeon.totalEnemies}`, cx, 305, {
      fontSize: 16,
      color: COLOR_UI_DIM,
      anchor: 0.5,
    });
    renderer.drawText(`Rainbow power: ${Math.floor(this.rainbowPower * 100)}%`, cx, 330, {
      fontSize: 16,
      color: 0x9b7dff,
      anchor: 0.5,
    });

    renderer.drawText("Press SPACE to return", cx, 400, {
      fontSize: 22,
      color: COLOR_UI_TEXT,
      anchor: 0.5,
    });
  }

  private renderWinScreen(renderer: Renderer): void {
    renderer.drawRectAlpha(0, 0, GRID_SIZE, GRID_SIZE, 0x000000, 0.75);
    const cx = CANVAS_WIDTH / 2;

    // Rainbow-ish title
    renderer.drawText("Darkness Healed!", cx, 180, {
      fontSize: 44,
      color: RAINBOW_COLORS[Math.floor(this.tickCount / 4) % RAINBOW_COLORS.length],
      anchor: 0.5,
    });

    // Show healed forest guardian
    const guardianFrame = animFrame(this.tickCount, 4, 4);
    renderer.drawSpriteScaled(
      cx / CELL_SIZE - 0.5, 230 / CELL_SIZE,
      this.textures.bossHealed.idle[guardianFrame], 2.0
    );

    const clearedCount = this.dungeon.rooms.filter((r) => r.cleared).length;
    renderer.drawText(`Rooms cleared: ${clearedCount}/${this.dungeon.rooms.length}`, cx, 290, {
      fontSize: 16,
      color: COLOR_UI_TEXT,
      anchor: 0.5,
    });
    renderer.drawText(`Enemies healed: ${this.healedEnemies}/${this.dungeon.totalEnemies}`, cx, 315, {
      fontSize: 16,
      color: COLOR_UI_TEXT,
      anchor: 0.5,
    });
    renderer.drawText(`Rainbow power: ${Math.floor(this.rainbowPower * 100)}%`, cx, 340, {
      fontSize: 16,
      color: 0x9b7dff,
      anchor: 0.5,
    });

    renderer.drawText("Press SPACE to return", cx, 410, {
      fontSize: 22,
      color: COLOR_UI_TEXT,
      anchor: 0.5,
    });
  }

  onKeyDown(key: string): void {
    this.heldKeys.add(key);

    if (this.state === "start") {
      // Character selection with arrow keys
      if (key === "ArrowLeft" || key === "KeyA") {
        this.playerCharacter = "fairy";
        return;
      }
      if (key === "ArrowRight" || key === "KeyD") {
        this.playerCharacter = "wizard";
        return;
      }
      if (key === "Space") {
        this.state = "playing";
        this.heldKeys.delete("Space");
        return;
      }
      return;
    }

    if (MOVE_KEY_DIRECTION[key]) {
      this.player.facing = MOVE_KEY_DIRECTION[key];
      this.player.aimDirection = MOVE_KEY_DIRECTION[key];
    }
    if (AIM_KEY_DIRECTION[key]) {
      this.player.aimDirection = AIM_KEY_DIRECTION[key];
    }

    if (key === "Space") {
      if (this.state === "gameOver" || this.state === "win") {
        this.resetGame();
        this.state = "start";
        this.staticDirty = true;
        this.heldKeys.delete("Space");
      }
    }
  }

  onKeyUp(key: string): void {
    this.heldKeys.delete(key);
  }

  destroy(): void {
    this.heldKeys.clear();
  }
}
