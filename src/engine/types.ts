// --- Game Constants ---

export const GRID_SIZE = 20;
export const CELL_SIZE = 32;
export const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE; // 640px
export const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE; // 640px
export const TICK_RATE_MS = 150; // ~6.67 ticks/sec
export const TICK_RATE_S = TICK_RATE_MS / 1000; // 0.15s per tick
export const MAX_ACCUMULATOR_MS = 1000;

// --- Interfaces ---

export interface GameContext {
  gridSize: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface Renderer {
  drawRect(
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number
  ): void;
  drawRectAlpha(
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number,
    alpha: number
  ): void;
  drawSprite(
    gridX: number,
    gridY: number,
    texture: import("pixi.js").Texture
  ): void;
  drawSpriteStatic(
    gridX: number,
    gridY: number,
    texture: import("pixi.js").Texture
  ): void;
  drawSpriteScaled(
    gridX: number,
    gridY: number,
    texture: import("pixi.js").Texture,
    scale: number,
    alpha?: number,
    tint?: number
  ): void;
  drawBar(
    pixelX: number,
    pixelY: number,
    width: number,
    height: number,
    fillRatio: number,
    fgColor: number,
    bgColor: number
  ): void;
  drawText(
    text: string,
    pixelX: number,
    pixelY: number,
    options?: { fontSize?: number; color?: number; anchor?: number }
  ): void;
  clear(): void;
  clearStatic(): void;
  drawRectStatic(
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number
  ): void;
  readonly stage: import("pixi.js").Container;
}

export interface Scene {
  init(context: GameContext): void;
  update(dt: number): void;
  render(renderer: Renderer): void;
  onKeyDown(key: string): void;
  onKeyUp(key: string): void;
  destroy(): void;
}
