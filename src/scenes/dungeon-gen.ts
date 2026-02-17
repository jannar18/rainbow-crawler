import { GRID_SIZE } from "../engine/types.js";
import {
  rng,
  doorPos,
  DELTA,
  OPPOSITE_DIR,
  GNOLL_VARIANTS,
  ELF_GENDERS,
} from "./dungeon-types.js";
import type {
  Point,
  Direction,
  CellType,
  DifficultyConfig,
  EnemyType,
  Room,
  Dungeon,
} from "./dungeon-types.js";

// --- Dungeon generation ---

export function generateDungeon(config: DifficultyConfig): Dungeon {
  const numRooms = rng.nextInt(config.roomCountMin, config.roomCountMax);
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
    const room = generateRoom(nodes[i].connections);
    rooms.push(room);
  }

  for (let i = 0; i < numRooms; i++) {
    const room = rooms[i];
    const floorCells = getFloorCells(room);

    if (i === 0) {
      placePickups(room, floorCells, 1);
      room.cleared = true;
    } else if (i === bossRoom) {
      const bossPos = pickSpawnPos(floorCells, room)
        ?? floorCells[Math.floor(floorCells.length / 2)];
      room.enemies.push({
        pos: { ...bossPos },
        type: "boss",
        state: "active",
        health: config.bossHealth,
        maxHealth: config.bossHealth,
        stateTimer: 0,
        moveCooldown: 1,
        shootCooldown: 1,
        gnollVariant: "",
        healedGender: "",
      });
      totalEnemies++;
    } else {
      const enemyCount = rng.nextInt(config.enemiesPerRoomMin, config.enemiesPerRoomMax);
      for (let e = 0; e < enemyCount; e++) {
        const pos = pickSpawnPos(floorCells, room);
        if (!pos) break;
        const type: EnemyType = rng.next() < 0.5 ? "chaser" : "ranger";
        room.enemies.push({
          pos,
          type,
          state: "active",
          health: config.enemyHealth,
          maxHealth: config.enemyHealth,
          stateTimer: 0,
          moveCooldown: type === "chaser" ? 1 : 0,
          shootCooldown: type === "ranger" ? 1 : 0,
          gnollVariant: GNOLL_VARIANTS[rng.nextInt(0, 2)],
          healedGender: ELF_GENDERS[rng.nextInt(0, 1)],
        });
        totalEnemies++;
      }
      placePickups(room, floorCells, config.pickupsPerRoom);
    }

    room.playerSpawn = findPlayerSpawn(room);
  }

  return { rooms, currentRoom: 0, bossRoom, totalEnemies };
}

function generateRoom(
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
  let head = 0;
  visited[start.y][start.x] = true;

  while (head < queue.length) {
    const cur = queue[head++];
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
  room: Room,
  floorCells: Point[],
  count: number
): void {
  for (let i = 0; i < count; i++) {
    const pos = pickSpawnPos(floorCells, room);
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
  // Fallback: find any floor cell in the room
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (room.grid[y][x] === "floor") return { x, y };
    }
  }
  return { x: cx, y: cy };
}
