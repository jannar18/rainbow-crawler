import type { Scene, GameContext, Renderer } from "../engine/types.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE } from "../engine/types.js";

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

interface Projectile {
  pos: Point;
  direction: Direction;
  speed: number;
  isPlayerBeam: boolean;
}

interface Room {
  grid: CellType[][];
  connections: Map<Direction, number>;
  cleared: boolean;
}

// --- Constants ---

const GRID_SIZE = 20;
const PLAYER_MAX_HEALTH = 5;
const SHOOT_COOLDOWN = 3; // ticks
const BEAM_SPEED = 2; // cells per tick
const I_FRAME_DURATION = 4; // ticks

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

  return {
    grid,
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

  init(_context: GameContext): void {
    this.room = createTestRoom();
    this.resetGame();
  }

  private resetGame(): void {
    this.player = {
      pos: { x: 10, y: 10 },
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
  }

  update(_dt: number): void {
    if (this.state !== "playing") return;

    // --- 1. Process input: movement ---
    this.player.sprinting =
      this.heldKeys.has("ShiftLeft") || this.heldKeys.has("ShiftRight");

    const moveDir = this.getHeldDirection();
    if (moveDir) {
      this.player.facing = moveDir;
      const steps = this.player.sprinting ? 2 : 1;
      const delta = DELTA[moveDir];
      for (let i = 0; i < steps; i++) {
        const nx = this.player.pos.x + delta.x;
        const ny = this.player.pos.y + delta.y;
        if (this.isWalkable(nx, ny)) {
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

    // --- 2. Move player projectiles ---
    this.moveProjectiles();

    // --- 7. Update effect timers ---
    if (this.player.iFrames > 0) {
      this.player.iFrames--;
    }
  }

  private getHeldDirection(): Direction | null {
    // Priority: last pressed wins, but we iterate in a fixed order
    // Check WASD first (more common for this game), then arrows
    for (const key of [
      "KeyW",
      "KeyS",
      "KeyA",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ]) {
      if (this.heldKeys.has(key) && KEY_DIRECTION[key]) {
        return KEY_DIRECTION[key];
      }
    }
    return null;
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    const cell = this.room.grid[y][x];
    return cell === "floor" || cell === "door";
  }

  private spawnBeam(): void {
    const delta = DELTA[this.player.facing];
    const startX = this.player.pos.x + delta.x;
    const startY = this.player.pos.y + delta.y;

    // Don't spawn if starting position is a wall
    if (!this.isWalkable(startX, startY)) return;

    this.projectiles.push({
      pos: { x: startX, y: startY },
      direction: this.player.facing,
      speed: BEAM_SPEED,
      isPlayerBeam: true,
    });
  }

  private moveProjectiles(): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i];
      const delta = DELTA[proj.direction];

      let alive = true;
      for (let step = 0; step < proj.speed; step++) {
        const nx = proj.pos.x + delta.x;
        const ny = proj.pos.y + delta.y;

        // Check bounds and walls
        if (
          nx < 0 ||
          nx >= GRID_SIZE ||
          ny < 0 ||
          ny >= GRID_SIZE ||
          this.room.grid[ny][nx] === "wall"
        ) {
          alive = false;
          break;
        }

        proj.pos.x = nx;
        proj.pos.y = ny;
      }

      if (!alive) {
        toRemove.push(i);
      }
    }

    // Remove dead projectiles (reverse order to preserve indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1);
    }
  }

  render(renderer: Renderer): void {
    // Static layer: walls and floors (only redrawn when dirty)
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

    // Playing state
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
    // Draw projectiles
    for (const proj of this.projectiles) {
      if (proj.isPlayerBeam) {
        renderer.drawRect(proj.pos.x, proj.pos.y, 1, 1, COLOR_BEAM);
      }
    }

    // Draw player
    const playerColor =
      this.player.iFrames > 0 && this.player.iFrames % 2 === 0
        ? COLOR_PLAYER_HIT
        : COLOR_PLAYER;
    renderer.drawRect(
      this.player.pos.x,
      this.player.pos.y,
      1,
      1,
      playerColor
    );

    // Draw facing indicator (small rect in facing direction edge)
    const facingDelta = DELTA[this.player.facing];
    const indicatorSize = 0.3;
    const px = this.player.pos.x + (facingDelta.x > 0 ? 0.7 : facingDelta.x < 0 ? 0 : 0.35);
    const py = this.player.pos.y + (facingDelta.y > 0 ? 0.7 : facingDelta.y < 0 ? 0 : 0.35);
    renderer.drawRect(
      px,
      py,
      facingDelta.x !== 0 ? indicatorSize : indicatorSize,
      facingDelta.y !== 0 ? indicatorSize : indicatorSize,
      COLOR_FACING_INDICATOR
    );
  }

  private renderHUD(renderer: Renderer): void {
    // Health bar
    const barX = 8;
    const barY = 4;
    const barW = 120;
    const barH = 12;
    renderer.drawBar(
      barX,
      barY,
      barW,
      barH,
      this.player.health / this.player.maxHealth,
      0xff4444,
      0x333333
    );
    renderer.drawText("HP", barX + barW + 6, barY - 2, {
      fontSize: 12,
      color: 0xcccccc,
    });
  }

  private renderStartScreen(renderer: Renderer): void {
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

    if (key === "Space") {
      if (this.state === "start") {
        this.state = "playing";
      } else if (this.state === "gameOver" || this.state === "win") {
        this.resetGame();
        this.state = "start";
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
