import type { Scene, GameContext, Renderer } from "../engine/types.js";
import { CANVAS_WIDTH, GRID_SIZE } from "../engine/types.js";

// --- Types ---

interface Point {
  x: number;
  y: number;
}

type Direction = "up" | "down" | "left" | "right";
type CellType = "wall" | "floor" | "door";
type GameState = "start" | "playing" | "gameOver" | "win";
type EnemyType = "chaser" | "ranger" | "boss";
type EnemyState = "active" | "calm" | "dissolving";

interface Player {
  pos: Point;
  facing: Direction;
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

const ENEMY_HEALTH = 2;
const CHASER_MOVE_INTERVAL = 2;
const RANGER_FIRE_INTERVAL = 5;
const RANGER_SHOT_SPEED = 1;
const CALM_DURATION = 6;
const DISSOLVE_DURATION = 4;

const BOSS_BASE_HEALTH = 5;
const BOSS_FIRE_INTERVAL = 5;
const BOSS_MOVE_INTERVAL = 4; // half speed chaser (phase 2)
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

// --- Colors ---

const COLOR_WALL = 0x444466;
const COLOR_FLOOR = 0x1a1a2e;
const COLOR_DOOR = 0x886622;
const COLOR_PLAYER = 0x44cc44;
const COLOR_PLAYER_HIT = 0xff4444;
const COLOR_BEAM = 0xff77ff;
const COLOR_FACING_INDICATOR = 0x88ff88;
const COLOR_CHASER = 0xcc4444;
const COLOR_RANGER = 0x8844cc;
const COLOR_BOSS = 0xff2200;
const COLOR_ENEMY_CALM = 0x88aacc;
const COLOR_ENEMY_SHOT = 0x884422;
const COLOR_PICKUP_HEALTH = 0x44ff88;
const RAINBOW_COLORS = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];

// --- Key mappings ---

const KEY_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

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
  // Position just inside the door (1 cell inward from border)
  const door = doorPos(dir);
  const d = DELTA[dir];
  // We enter FROM the opposite direction, so step inward
  const inward = DELTA[OPPOSITE_DIR[dir]];
  return { x: door.x + inward.x, y: door.y + inward.y };
}

// --- Dungeon generation ---

function generateDungeon(): Dungeon {
  const rng = makeRng(Date.now());
  const numRooms = rng.nextInt(5, 7);
  const dirs: Direction[] = ["up", "down", "left", "right"];

  // Build room graph as a tree: linear chain with 1-2 branches
  interface RoomNode {
    id: number;
    connections: Map<Direction, number>;
  }

  const nodes: RoomNode[] = [];
  for (let i = 0; i < numRooms; i++) {
    nodes.push({ id: i, connections: new Map() });
  }

  // Linear chain: rooms 0-1-2-...-N connecting in random directions
  for (let i = 0; i < numRooms - 1; i++) {
    // Pick a random direction for this connection that isn't already used
    const availDirs = dirs.filter((d) => !nodes[i].connections.has(d));
    if (availDirs.length === 0) break;
    rng.shuffle(availDirs);
    const dir = availDirs[0];
    nodes[i].connections.set(dir, i + 1);
    nodes[i + 1].connections.set(OPPOSITE_DIR[dir], i);
  }

  // Boss room is the last room in the chain
  const bossRoom = numRooms - 1;

  // Generate rooms
  const rooms: Room[] = [];
  let totalEnemies = 0;

  for (let i = 0; i < numRooms; i++) {
    const room = generateRoom(rng, nodes[i].connections);
    rooms.push(room);
  }

  // Populate rooms
  for (let i = 0; i < numRooms; i++) {
    const room = rooms[i];
    const floorCells = getFloorCells(room);

    if (i === 0) {
      // Start room: no enemies, 1 health pickup, already cleared
      placePickups(rng, room, floorCells, 1);
      room.cleared = true;
    } else if (i === bossRoom) {
      // Boss room: boss only
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
        });
        totalEnemies++;
      }
    } else {
      // Normal rooms: 2-4 enemies, 1-2 pickups
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
        });
        totalEnemies++;
      }
      placePickups(rng, room, floorCells, rng.nextInt(1, 2));
    }

    // Set player spawn for each room (near center of open area)
    room.playerSpawn = findPlayerSpawn(room);
  }

  return { rooms, currentRoom: 0, bossRoom, totalEnemies };
}

function generateRoom(
  rng: ReturnType<typeof makeRng>,
  connections: Map<Direction, number>
): Room {
  // Try up to 5 times to generate a valid room
  for (let attempt = 0; attempt < 5; attempt++) {
    const grid: CellType[][] = [];

    // Fill with walls
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push("wall");
      }
      grid.push(row);
    }

    // Carve open area (randomized size, centered)
    const areaW = rng.nextInt(10, 16);
    const areaH = rng.nextInt(10, 16);
    const startX = Math.floor((GRID_SIZE - areaW) / 2);
    const startY = Math.floor((GRID_SIZE - areaH) / 2);

    for (let y = startY; y < startY + areaH; y++) {
      for (let x = startX; x < startX + areaW; x++) {
        grid[y][x] = "floor";
      }
    }

    // Add 2-4 interior wall segments for cover
    const numObstacles = rng.nextInt(2, 4);
    for (let o = 0; o < numObstacles; o++) {
      const obstacleType = rng.nextInt(0, 2);
      if (obstacleType === 0) {
        // Pillar (2x2)
        const px = rng.nextInt(startX + 2, startX + areaW - 4);
        const py = rng.nextInt(startY + 2, startY + areaH - 4);
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            grid[py + dy][px + dx] = "wall";
          }
        }
      } else if (obstacleType === 1) {
        // Horizontal wall segment
        const len = rng.nextInt(3, 5);
        const wx = rng.nextInt(startX + 2, startX + areaW - len - 2);
        const wy = rng.nextInt(startY + 2, startY + areaH - 3);
        for (let i = 0; i < len; i++) {
          grid[wy][wx + i] = "wall";
        }
      } else {
        // Vertical wall segment
        const len = rng.nextInt(3, 5);
        const wx = rng.nextInt(startX + 2, startX + areaW - 3);
        const wy = rng.nextInt(startY + 2, startY + areaH - len - 2);
        for (let i = 0; i < len; i++) {
          grid[wy + i][wx] = "wall";
        }
      }
    }

    // Carve corridors from open area to door positions + place doors
    for (const [dir] of connections) {
      const door = doorPos(dir);
      grid[door.y][door.x] = "door";

      // Carve a corridor from the door to the open area
      carveCorridor(grid, door, dir, startX, startY, startX + areaW - 1, startY + areaH - 1);
    }

    // Validate: all floor cells + door cells reachable from center
    const centerX = Math.floor(GRID_SIZE / 2);
    const centerY = Math.floor(GRID_SIZE / 2);
    // Find a walkable cell near center
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

  // Fallback: simple open room
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

  // Carve straight from door toward open area
  while (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
    if (grid[y][x] === "floor") break; // reached open area
    grid[y][x] = "floor";
    // Check if we're inside the open area bounds
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

  // Place doors
  for (const [dir] of connections) {
    const door = doorPos(dir);
    grid[door.y][door.x] = "door";
  }

  // Add a few pillars for interest
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
  // Pick a random floor cell that isn't near a door and isn't occupied by another enemy
  const candidates = floorCells.filter((c) => {
    // Not near any door
    for (const [dir] of room.connections) {
      const door = doorPos(dir);
      if (Math.abs(c.x - door.x) + Math.abs(c.y - door.y) < 3) return false;
    }
    // Not occupied by existing enemy
    for (const e of room.enemies) {
      if (e.pos.x === c.x && e.pos.y === c.y) return false;
    }
    // Not occupied by existing pickup
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
  // Find a walkable cell near center
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
  private state: GameState = "start";
  private player!: Player;
  private projectiles: Projectile[] = [];
  private dungeon!: Dungeon;
  private heldKeys = new Set<string>();
  private staticDirty = true;
  private tickCount = 0;
  private rainbowPower = 0; // 0-1 float
  private healedEnemies = 0;

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
    if (this.state !== "playing") return;
    this.tickCount++;

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
      return; // skip rest of tick after transition
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

    // --- 8. Remove dissolved enemies, update rainbow power ---
    const prevCount = this.room.enemies.length;
    this.room.enemies = enemies.filter((e) => {
      if (e.state === "dissolving" && e.stateTimer <= 0) {
        this.healedEnemies++;
        if (this.dungeon.totalEnemies > 0) {
          this.rainbowPower = Math.min(1, this.healedEnemies / this.dungeon.totalEnemies);
        }
        return false;
      }
      return true;
    });

    // Mark room cleared when all enemies are gone
    if (this.room.enemies.length === 0) {
      this.room.cleared = true;
    }

    // --- 9. Check win/lose ---
    if (this.player.health <= 0) {
      this.state = "gameOver";
    }
    // Win: boss room cleared (boss dissolved)
    if (this.dungeon.currentRoom === this.dungeon.bossRoom && this.room.cleared) {
      this.state = "win";
    }
  }

  // --- Door transitions ---

  private handleDoorTransition(): void {
    const pos = this.player.pos;
    let transitionDir: Direction | null = null;

    // Determine which door the player is on
    for (const [dir] of this.room.connections) {
      const door = doorPos(dir);
      if (pos.x === door.x && pos.y === door.y) {
        transitionDir = dir;
        break;
      }
    }

    if (!transitionDir) return; // standing on a door that doesn't connect anywhere

    const targetRoomIdx = this.room.connections.get(transitionDir);
    if (targetRoomIdx === undefined) return;

    // Clear projectiles on room transition
    this.projectiles = [];

    // Swap room
    this.dungeon.currentRoom = targetRoomIdx;

    // Position player at the entry point of the corresponding door
    const enterDir = OPPOSITE_DIR[transitionDir];
    const entry = entryPos(enterDir);
    this.player.pos = { ...entry };

    // Redraw static layer
    this.staticDirty = true;
  }

  // --- Input helpers ---

  private getMoveDelta(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    if (this.heldKeys.has("KeyW") || this.heldKeys.has("ArrowUp")) dy -= 1;
    if (this.heldKeys.has("KeyS") || this.heldKeys.has("ArrowDown")) dy += 1;
    if (this.heldKeys.has("KeyA") || this.heldKeys.has("ArrowLeft")) dx -= 1;
    if (this.heldKeys.has("KeyD") || this.heldKeys.has("ArrowRight")) dx += 1;

    return { dx, dy };
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    const cell = this.room.grid[y][x];
    return cell === "floor" || cell === "door";
  }

  // --- Projectile logic ---

  private spawnBeam(): void {
    const delta = DELTA[this.player.facing];
    const startX = this.player.pos.x + delta.x;
    const startY = this.player.pos.y + delta.y;
    if (!this.isWalkable(startX, startY)) return;

    this.projectiles.push({
      pos: { x: startX, y: startY },
      direction: this.player.facing,
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
    // Boss movement: only in phase 2 (below 50% health)
    const healthRatio = enemy.health / enemy.maxHealth;
    if (healthRatio >= 0.5) return; // phase 1: stationary

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

    // Boss fires 3-directional spread: picks most-aligned cardinal to player + adjacent cardinals
    const dirs: Direction[] = ["up", "down", "left", "right"];
    let bestDir: Direction = "down";
    let bestAlignment = 0;

    for (const dir of dirs) {
      const d = DELTA[dir];
      const dx = this.player.pos.x - enemy.pos.x;
      const dy = this.player.pos.y - enemy.pos.y;
      const alignment = dx * d.x + dy * d.y; // dot product
      if (alignment > bestAlignment) {
        bestAlignment = alignment;
        bestDir = dir;
      }
    }

    // Spread: fire in bestDir and two perpendicular directions
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
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.room.grid[y][x];
        let color: number;
        switch (cell) {
          case "wall":
            color = COLOR_WALL;
            break;
          case "door":
            color = COLOR_DOOR;
            break;
          case "floor":
          default:
            color = COLOR_FLOOR;
            break;
        }
        renderer.drawRectStatic(x, y, 1, 1, color);
      }
    }
  }

  private renderEntities(renderer: Renderer): void {
    // Draw pickups
    for (const pickup of this.room.pickups) {
      if (pickup.collected) continue;
      renderer.drawRect(pickup.pos.x, pickup.pos.y, 1, 1, COLOR_PICKUP_HEALTH);
    }

    // Draw enemies
    for (const enemy of this.room.enemies) {
      if (enemy.state === "active") {
        let color: number;
        if (enemy.type === "chaser") color = COLOR_CHASER;
        else if (enemy.type === "ranger") color = COLOR_RANGER;
        else color = COLOR_BOSS;
        renderer.drawRect(enemy.pos.x, enemy.pos.y, 1, 1, color);
      } else if (enemy.state === "calm") {
        const alpha = 0.5 + 0.3 * (enemy.stateTimer / CALM_DURATION);
        renderer.drawRectAlpha(
          enemy.pos.x, enemy.pos.y, 1, 1, COLOR_ENEMY_CALM, alpha
        );
      } else if (enemy.state === "dissolving") {
        const progress = 1 - enemy.stateTimer / DISSOLVE_DURATION;
        const colorIdx = Math.floor(progress * (RAINBOW_COLORS.length - 1));
        const alpha = 1 - progress;
        renderer.drawRectAlpha(
          enemy.pos.x, enemy.pos.y, 1, 1,
          RAINBOW_COLORS[colorIdx], alpha
        );
      }
    }

    // Draw projectiles
    for (const proj of this.projectiles) {
      const color = proj.isPlayerBeam ? COLOR_BEAM : COLOR_ENEMY_SHOT;
      renderer.drawRect(proj.pos.x, proj.pos.y, 1, 1, color);
    }

    // Draw player
    const playerColor =
      this.player.iFrames > 0 && this.player.iFrames % 2 === 0
        ? COLOR_PLAYER_HIT
        : COLOR_PLAYER;
    renderer.drawRect(
      this.player.pos.x, this.player.pos.y, 1, 1, playerColor
    );

    // Draw facing indicator
    const facingDelta = DELTA[this.player.facing];
    const barThick = 0.2;
    const barLong = 0.5;
    const isHorizontal = facingDelta.x !== 0;
    const px =
      this.player.pos.x +
      (facingDelta.x > 0
        ? 1 - barThick
        : facingDelta.x < 0
          ? 0
          : (1 - barLong) / 2);
    const py =
      this.player.pos.y +
      (facingDelta.y > 0
        ? 1 - barThick
        : facingDelta.y < 0
          ? 0
          : (1 - barLong) / 2);
    renderer.drawRect(
      px, py,
      isHorizontal ? barThick : barLong,
      isHorizontal ? barLong : barThick,
      COLOR_FACING_INDICATOR
    );
  }

  private renderHUD(renderer: Renderer): void {
    const barX = 8;
    const barY = 4;
    const barW = 120;
    const barH = 12;

    // Health bar
    renderer.drawBar(
      barX, barY, barW, barH,
      this.player.health / this.player.maxHealth,
      0xff4444, 0x333333
    );
    renderer.drawText("HP", barX + barW + 6, barY - 2, {
      fontSize: 12,
      color: 0xcccccc,
    });

    // Rainbow power bar
    const rbY = barY + barH + 4;
    const rbColorIdx = Math.floor(this.tickCount / 3) % RAINBOW_COLORS.length;
    renderer.drawBar(
      barX, rbY, barW, barH,
      this.rainbowPower,
      RAINBOW_COLORS[rbColorIdx], 0x222233
    );
    renderer.drawText("Rainbow", barX + barW + 6, rbY - 2, {
      fontSize: 12,
      color: 0xcc88ff,
    });

    // Room indicator
    const roomNum = this.dungeon.currentRoom + 1;
    const totalRooms = this.dungeon.rooms.length;
    const clearedCount = this.dungeon.rooms.filter((r) => r.cleared).length;
    renderer.drawText(
      `Room ${roomNum}/${totalRooms} (${clearedCount} cleared)`,
      CANVAS_WIDTH - 8, barY - 2,
      { fontSize: 12, color: 0xcccccc, anchor: 1 }
    );

    // Enemy count in current room
    const activeCount = this.room.enemies.filter(
      (e) => e.state === "active"
    ).length;
    if (activeCount > 0) {
      renderer.drawText(
        `Enemies: ${activeCount}`,
        CANVAS_WIDTH - 8, barY + 14,
        { fontSize: 12, color: 0xcccccc, anchor: 1 }
      );
    }
  }

  private renderStartScreen(renderer: Renderer): void {
    renderer.drawRectAlpha(0, 0, GRID_SIZE, GRID_SIZE, 0x000000, 0.7);
    const cx = CANVAS_WIDTH / 2;
    renderer.drawText("Rainbow Crawler", cx, 180, {
      fontSize: 48,
      color: 0xff77ff,
      anchor: 0.5,
    });
    renderer.drawText("Heal the corruption!", cx, 250, {
      fontSize: 20,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
    renderer.drawText("Press SPACE to start", cx, 340, {
      fontSize: 24,
      color: 0xcccccc,
      anchor: 0.5,
    });
    renderer.drawText("WASD to move  |  SPACE to shoot", cx, 400, {
      fontSize: 16,
      color: 0x666666,
      anchor: 0.5,
    });
    renderer.drawText("Hold SHIFT to sprint", cx, 430, {
      fontSize: 16,
      color: 0x666666,
      anchor: 0.5,
    });
  }

  private renderGameOverScreen(renderer: Renderer): void {
    renderer.drawRectAlpha(0, 0, GRID_SIZE, GRID_SIZE, 0x000000, 0.7);
    const cx = CANVAS_WIDTH / 2;
    renderer.drawText("Game Over", cx, 220, {
      fontSize: 48,
      color: 0xff4444,
      anchor: 0.5,
    });
    renderer.drawText("Press SPACE to restart", cx, 320, {
      fontSize: 24,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
  }

  private renderWinScreen(renderer: Renderer): void {
    renderer.drawRectAlpha(0, 0, GRID_SIZE, GRID_SIZE, 0x000000, 0.7);
    const cx = CANVAS_WIDTH / 2;
    renderer.drawText("You Win!", cx, 200, {
      fontSize: 48,
      color: 0x77ff77,
      anchor: 0.5,
    });
    renderer.drawText("The corruption is healed.", cx, 270, {
      fontSize: 20,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
    const clearedCount = this.dungeon.rooms.filter((r) => r.cleared).length;
    renderer.drawText(`Rooms cleared: ${clearedCount}/${this.dungeon.rooms.length}`, cx, 310, {
      fontSize: 16,
      color: 0x888888,
      anchor: 0.5,
    });
    renderer.drawText(`Enemies healed: ${this.healedEnemies}/${this.dungeon.totalEnemies}`, cx, 335, {
      fontSize: 16,
      color: 0x888888,
      anchor: 0.5,
    });
    renderer.drawText("Press SPACE to play again", cx, 400, {
      fontSize: 24,
      color: 0xcccccc,
      anchor: 0.5,
    });
  }

  onKeyDown(key: string): void {
    this.heldKeys.add(key);

    if (KEY_DIRECTION[key]) {
      this.player.facing = KEY_DIRECTION[key];
    }

    if (key === "Space") {
      if (this.state === "start") {
        this.state = "playing";
        this.heldKeys.delete("Space");
      } else if (this.state === "gameOver" || this.state === "win") {
        this.resetGame();
        this.state = "playing";
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
