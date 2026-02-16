import { Graphics } from "pixi.js";
import type { Scene, GameContext, Renderer } from "../engine/types.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../engine/types.js";

type GameState = "start" | "playing" | "gameOver";
type Direction = "up" | "down" | "left" | "right";

interface Point {
  x: number;
  y: number;
}

// Maps key codes to directions
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

// Opposite directions — used to prevent 180-degree turns
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// Movement deltas per direction
const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export class SnakeScene implements Scene {
  private state: GameState = "start";
  private gridSize = 0;

  // Snake state
  private snake: Point[] = [];
  private direction: Direction = "right";
  private nextDirection: Direction = "right"; // Buffered input — applied on next tick

  // Food & score
  private food: Point = { x: 0, y: 0 };
  private score = 0;

  init(context: GameContext): void {
    this.gridSize = context.gridSize;
    this.resetGame();
  }

  private resetGame(): void {
    // Start snake in center, length 3, moving right
    const centerY = Math.floor(this.gridSize / 2);
    const centerX = Math.floor(this.gridSize / 2);
    this.snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY },
    ];
    this.direction = "right";
    this.nextDirection = "right";
    this.score = 0;
    this.spawnFood();
  }

  private spawnFood(): void {
    // Collect all empty cells, then pick one at random
    const occupied = new Set(this.snake.map((p) => `${p.x},${p.y}`));
    const empty: Point[] = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (!occupied.has(`${x},${y}`)) {
          empty.push({ x, y });
        }
      }
    }
    if (empty.length === 0) return; // Snake fills entire grid — you win!
    this.food = empty[Math.floor(Math.random() * empty.length)];
  }

  update(_dt: number): void {
    if (this.state !== "playing") return;

    // Apply buffered direction
    this.direction = this.nextDirection;

    // Move head
    const head = this.snake[0];
    const delta = DELTA[this.direction];
    const newHead: Point = { x: head.x + delta.x, y: head.y + delta.y };

    // Wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= this.gridSize ||
      newHead.y < 0 ||
      newHead.y >= this.gridSize
    ) {
      this.state = "gameOver";
      return;
    }

    // Self collision (check before adding new head)
    if (this.snake.some((p) => p.x === newHead.x && p.y === newHead.y)) {
      this.state = "gameOver";
      return;
    }

    // Add new head
    this.snake.unshift(newHead);

    // Check food
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.spawnFood();
      // Don't remove tail — snake grows
    } else {
      this.snake.pop();
    }
  }

  render(renderer: Renderer): void {
    renderer.clear();
    this.renderBorder(renderer);

    if (this.state === "start") {
      this.renderStartScreen(renderer);
      return;
    }

    if (this.state === "gameOver") {
      this.renderGameField(renderer);
      this.renderGameOverOverlay(renderer);
      return;
    }

    // Playing state
    this.renderGameField(renderer);
  }

  private renderBorder(renderer: Renderer): void {
    const g = new Graphics();
    g.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    g.stroke({ color: 0x333355, width: 2 });
    renderer.stage.addChild(g);
  }

  private renderGameField(renderer: Renderer): void {
    // Draw food
    renderer.drawRect(this.food.x, this.food.y, 1, 1, 0xff4444);

    // Draw snake body
    for (let i = 1; i < this.snake.length; i++) {
      renderer.drawRect(this.snake[i].x, this.snake[i].y, 1, 1, 0x44cc44);
    }

    // Draw snake head (darker green)
    if (this.snake.length > 0) {
      renderer.drawRect(this.snake[0].x, this.snake[0].y, 1, 1, 0x22aa22);
    }

    // Draw score
    renderer.drawText(`Score: ${this.score}`, 10, 10, {
      fontSize: 18,
      color: 0xcccccc,
    });
  }

  private renderStartScreen(renderer: Renderer): void {
    const cx = CANVAS_WIDTH / 2;
    renderer.drawText("Snake", cx, 200, { fontSize: 64, color: 0x44cc44, anchor: 0.5 });
    renderer.drawText("Press SPACE to start", cx, 320, {
      fontSize: 24,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
    renderer.drawText("Arrow keys or WASD to move", cx, 360, {
      fontSize: 18,
      color: 0x666666,
      anchor: 0.5,
    });
  }

  private renderGameOverOverlay(renderer: Renderer): void {
    // Semi-transparent overlay via a dark rectangle
    renderer.drawRect(0, 0, this.gridSize, this.gridSize, 0x000000);

    // Re-draw the field on top at reduced opacity isn't easy with primitives,
    // so we just show game over text on dark background
    const cx = CANVAS_WIDTH / 2;
    renderer.drawText("Game Over", cx, 200, {
      fontSize: 48,
      color: 0xff4444,
      anchor: 0.5,
    });
    renderer.drawText(`Score: ${this.score}`, cx, 270, {
      fontSize: 28,
      color: 0xffffff,
      anchor: 0.5,
    });
    renderer.drawText("Press SPACE to restart", cx, 340, {
      fontSize: 24,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
  }

  onKeyDown(key: string): void {
    // Spacebar: start or restart
    if (key === "Space") {
      if (this.state === "start") {
        this.state = "playing";
      } else if (this.state === "gameOver") {
        this.resetGame();
        this.state = "start";
      }
      return;
    }

    // Direction input — only during play
    if (this.state !== "playing") return;

    const dir = KEY_DIRECTION[key];
    if (!dir) return;

    // Prevent 180-degree turns: reject if new direction is opposite to current
    if (dir === OPPOSITE[this.direction]) return;

    this.nextDirection = dir;
  }

  onKeyUp(_key: string): void {
    // No-op for Snake — included for Scene interface compliance
  }

  destroy(): void {
    // No persistent resources to clean up
  }
}
