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

interface Player {
  pos: Point;
  facing: Direction;
  health: number;
  maxHealth: number;
  iFrames: number;
  shootCooldown: number;
  sprinting: boolean;
}

type EnemyType = "chaser" | "ranger";
type EnemyState = "active" | "calm" | "dissolving";

interface Enemy {
  pos: Point;
  type: EnemyType;
  state: EnemyState;
  health: number;
  stateTimer: number;
  moveCooldown: number;
  shootCooldown: number;
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
}

// --- Constants ---

const PLAYER_MAX_HEALTH = 5;
const SHOOT_COOLDOWN = 3; // ticks
const BEAM_SPEED = 2; // cells per tick
const I_FRAME_DURATION = 4; // ticks after taking damage

// Enemy constants
const ENEMY_HEALTH = 2; // beam hits to heal
const CHASER_MOVE_INTERVAL = 2; // ticks between moves
const RANGER_FIRE_INTERVAL = 5; // ticks between shots
const RANGER_SHOT_SPEED = 1; // cells per tick
const CALM_DURATION = 6; // ticks in calm state
const DISSOLVE_DURATION = 4; // ticks in dissolve state

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
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
const COLOR_ENEMY_CALM = 0x88aacc;
const COLOR_ENEMY_SHOT = 0x884422;
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

// --- Test Room ---

function createTestRoom(): Room {
  const grid: CellType[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: CellType[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      // Border walls
      if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
        row.push("wall");
      } else {
        row.push("floor");
      }
    }
    grid.push(row);
  }

  // Interior wall segments for cover/interest
  // Horizontal wall segment
  for (let x = 4; x <= 8; x++) {
    grid[5][x] = "wall";
  }
  // Vertical wall segment
  for (let y = 8; y <= 12; y++) {
    grid[y][14] = "wall";
  }
  // L-shape wall
  for (let x = 3; x <= 6; x++) {
    grid[14][x] = "wall";
  }
  for (let y = 11; y <= 14; y++) {
    grid[y][3] = "wall";
  }
  // Pillar
  grid[9][9] = "wall";
  grid[9][10] = "wall";
  grid[10][9] = "wall";
  grid[10][10] = "wall";

  // Doors at edge midpoints
  const mid = Math.floor(GRID_SIZE / 2);
  grid[0][mid] = "door"; // top
  grid[GRID_SIZE - 1][mid] = "door"; // bottom
  grid[mid][0] = "door"; // left
  grid[mid][GRID_SIZE - 1] = "door"; // right

  // Spawn enemies for testing
  const enemies: Enemy[] = [
    // Two chasers
    {
      pos: { x: 16, y: 3 },
      type: "chaser",
      state: "active",
      health: ENEMY_HEALTH,
      stateTimer: 0,
      moveCooldown: CHASER_MOVE_INTERVAL,
      shootCooldown: 0,
    },
    {
      pos: { x: 4, y: 16 },
      type: "chaser",
      state: "active",
      health: ENEMY_HEALTH,
      stateTimer: 0,
      moveCooldown: CHASER_MOVE_INTERVAL,
      shootCooldown: 0,
    },
    // One ranger
    {
      pos: { x: 16, y: 16 },
      type: "ranger",
      state: "active",
      health: ENEMY_HEALTH,
      stateTimer: 0,
      moveCooldown: 0,
      shootCooldown: RANGER_FIRE_INTERVAL,
    },
  ];

  return {
    grid,
    enemies,
    pickups: [],
    connections: new Map(),
    cleared: false,
  };
}

// --- Scene ---

export class DungeonCrawlerScene implements Scene {
  private state: GameState = "start";
  private player!: Player;
  private projectiles: Projectile[] = [];
  private room!: Room;
  private heldKeys = new Set<string>();
  private staticDirty = true;
  private tickCount = 0;

  init(_context: GameContext): void {
    this.room = createTestRoom();
    this.resetGame();
  }

  private resetGame(): void {
    this.player = {
      pos: { x: 10, y: 7 },
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
    // Reset enemies to initial state
    this.room = createTestRoom();
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
        // For diagonal movement, check both cardinal intermediates to prevent corner-cutting
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

    // --- 1b. Process input: shooting ---
    if (this.player.shootCooldown > 0) {
      this.player.shootCooldown--;
    }
    if (this.heldKeys.has("Space") && this.player.shootCooldown <= 0) {
      this.spawnBeam();
      this.player.shootCooldown = SHOOT_COOLDOWN;
    }

    // --- 2. Move player projectiles (with beam-enemy collision) ---
    this.movePlayerProjectiles();

    // --- 3. Move enemy projectiles (with player collision) ---
    this.moveEnemyProjectiles();

    // --- 4. Move enemies (Chasers pathfind) ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.type === "chaser") {
        this.updateChaser(enemy);
      }
    }

    // --- 5. Enemy AI decisions (Rangers fire) ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.type === "ranger") {
        this.updateRanger(enemy);
      }
    }

    // --- 6. Collision: enemy bodies vs player (contact damage) ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.pos.x === this.player.pos.x && enemy.pos.y === this.player.pos.y) {
        this.damagePlayer();
      }
    }

    // --- 7. Update effect timers ---
    if (this.player.iFrames > 0) {
      this.player.iFrames--;
    }
    this.updateEnemyTimers();

    // --- 8. Remove dissolved enemies ---
    this.room.enemies = enemies.filter(
      (e) => !(e.state === "dissolving" && e.stateTimer <= 0)
    );

    // --- 9. Check win/lose ---
    if (this.player.health <= 0) {
      this.state = "gameOver";
    }
  }

  // --- Input helpers ---

  private getMoveDelta(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    // Vertical axis
    if (this.heldKeys.has("KeyW") || this.heldKeys.has("ArrowUp")) dy -= 1;
    if (this.heldKeys.has("KeyS") || this.heldKeys.has("ArrowDown")) dy += 1;

    // Horizontal axis
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

        // Check beam-enemy collision at each step
        const hitEnemy = enemies.find(
          (e) => e.state === "active" && e.pos.x === nx && e.pos.y === ny
        );
        if (hitEnemy) {
          hitEnemy.health--;
          if (hitEnemy.health <= 0) {
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

        // Check enemy projectile vs player
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

  private getRangerFireDirection(from: Point): Direction | null {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    let bestDir: Direction | null = null;
    let bestDist = Infinity;

    for (const dir of dirs) {
      const delta = DELTA[dir];
      let x = from.x;
      let y = from.y;
      let clear = true;

      // Walk along the cardinal line until we hit the player, a wall, or grid edge
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
          break; // found player
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
          // Trace back to find first step
          let step = idx;
          while (parent[step] !== toIdx(from.x, from.y)) {
            step = parent[step];
          }
          return { x: step % GRID_SIZE, y: Math.floor(step / GRID_SIZE) };
        }

        queue.push({ x: nx, y: ny });
      }
    }

    return null; // no path
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
    // Draw enemies
    for (const enemy of this.room.enemies) {
      if (enemy.state === "active") {
        const color = enemy.type === "chaser" ? COLOR_CHASER : COLOR_RANGER;
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
    renderer.drawBar(
      barX, barY, barW, barH,
      this.player.health / this.player.maxHealth,
      0xff4444, 0x333333
    );
    renderer.drawText("HP", barX + barW + 6, barY - 2, {
      fontSize: 12,
      color: 0xcccccc,
    });

    // Enemy count
    const activeCount = this.room.enemies.filter(
      (e) => e.state === "active"
    ).length;
    renderer.drawText(`Enemies: ${activeCount}`, CANVAS_WIDTH - 8, barY - 2, {
      fontSize: 12,
      color: 0xcccccc,
      anchor: 1,
    });
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
    renderer.drawText("You Win!", cx, 220, {
      fontSize: 48,
      color: 0x77ff77,
      anchor: 0.5,
    });
    renderer.drawText("The corruption is healed.", cx, 290, {
      fontSize: 20,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
    renderer.drawText("Press SPACE to play again", cx, 360, {
      fontSize: 24,
      color: 0xcccccc,
      anchor: 0.5,
    });
  }

  onKeyDown(key: string): void {
    this.heldKeys.add(key);

    // Update facing based on last direction key pressed (beam aim control)
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
