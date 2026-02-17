import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  Sprite,
  Texture,
} from "pixi.js";
import type { Renderer as IRenderer } from "./types.js";
import { CELL_SIZE } from "./types.js";

export class Renderer implements IRenderer {
  private app: Application;
  private staticContainer: Container;
  private drawContainer: Container;

  get stage(): Container {
    return this.app.stage;
  }

  constructor(app: Application) {
    this.app = app;
    this.staticContainer = new Container();
    this.drawContainer = new Container();
    this.app.stage.addChild(this.staticContainer);
    this.app.stage.addChild(this.drawContainer);
  }

  drawRect(
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number
  ): void {
    const g = new Graphics();
    g.rect(
      gridX * CELL_SIZE,
      gridY * CELL_SIZE,
      widthCells * CELL_SIZE,
      heightCells * CELL_SIZE
    );
    g.fill(color);
    this.drawContainer.addChild(g);
  }

  drawRectStatic(
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number
  ): void {
    const g = new Graphics();
    g.rect(
      gridX * CELL_SIZE,
      gridY * CELL_SIZE,
      widthCells * CELL_SIZE,
      heightCells * CELL_SIZE
    );
    g.fill(color);
    this.staticContainer.addChild(g);
  }

  drawRectAlpha(
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number,
    alpha: number
  ): void {
    const g = new Graphics();
    g.rect(
      gridX * CELL_SIZE,
      gridY * CELL_SIZE,
      widthCells * CELL_SIZE,
      heightCells * CELL_SIZE
    );
    g.fill({ color, alpha });
    this.drawContainer.addChild(g);
  }

  drawSprite(gridX: number, gridY: number, texture: Texture): void {
    const s = new Sprite(texture);
    s.x = gridX * CELL_SIZE;
    s.y = gridY * CELL_SIZE;
    s.width = CELL_SIZE;
    s.height = CELL_SIZE;
    this.drawContainer.addChild(s);
  }

  drawSpriteStatic(gridX: number, gridY: number, texture: Texture): void {
    const s = new Sprite(texture);
    s.x = gridX * CELL_SIZE;
    s.y = gridY * CELL_SIZE;
    s.width = CELL_SIZE;
    s.height = CELL_SIZE;
    this.staticContainer.addChild(s);
  }

  drawSpritePixel(
    pixelX: number,
    pixelY: number,
    texture: Texture,
    size: number,
    alpha = 1
  ): void {
    const s = new Sprite(texture);
    s.x = pixelX;
    s.y = pixelY;
    s.width = size;
    s.height = size;
    s.alpha = alpha;
    this.drawContainer.addChild(s);
  }

  drawSpriteScaled(
    gridX: number,
    gridY: number,
    texture: Texture,
    scale: number,
    alpha = 1,
    tint?: number
  ): void {
    const s = new Sprite(texture);
    const size = CELL_SIZE * scale;
    const offset = (CELL_SIZE - size) / 2;
    s.x = gridX * CELL_SIZE + offset;
    s.y = gridY * CELL_SIZE + offset;
    s.width = size;
    s.height = size;
    s.alpha = alpha;
    if (tint !== undefined) s.tint = tint;
    this.drawContainer.addChild(s);
  }

  drawBar(
    pixelX: number,
    pixelY: number,
    width: number,
    height: number,
    fillRatio: number,
    fgColor: number,
    bgColor: number
  ): void {
    const g = new Graphics();
    // Background
    g.rect(pixelX, pixelY, width, height);
    g.fill(bgColor);
    // Foreground
    if (fillRatio > 0) {
      g.rect(pixelX, pixelY, width * Math.min(fillRatio, 1), height);
      g.fill(fgColor);
    }
    this.drawContainer.addChild(g);
  }

  drawText(
    text: string,
    pixelX: number,
    pixelY: number,
    options?: { fontSize?: number; color?: number; anchor?: number }
  ): void {
    const style = new TextStyle({
      fontSize: options?.fontSize ?? 24,
      fill: options?.color ?? 0xffffff,
      fontFamily: "monospace",
    });
    const t = new Text({ text, style });
    t.anchor.set(options?.anchor ?? 0, 0);
    t.x = pixelX;
    t.y = pixelY;
    this.drawContainer.addChild(t);
  }

  clear(): void {
    for (const child of this.drawContainer.removeChildren()) {
      child.destroy();
    }
  }

  clearStatic(): void {
    for (const child of this.staticContainer.removeChildren()) {
      child.destroy();
    }
  }
}
