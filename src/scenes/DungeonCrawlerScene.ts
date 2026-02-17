import type { Texture } from "pixi.js";
import type { Scene, GameContext, Renderer } from "../engine/types.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE, GRID_SIZE } from "../engine/types.js";
import { generateDungeon } from "./dungeon-gen.js";
import {
  PLAYER_MAX_HEALTH,
  SHOOT_COOLDOWN,
  BEAM_SPEED,
  I_FRAME_DURATION,
  DISSOLVE_DURATION,
  DIFFICULTY_PRESETS,
  ALL_DIFFICULTIES,
  ALL_NIGHTMARE_MODIFIERS,
  NIGHTMARE_MODIFIER_LABELS,
  DELTA,
  DIRECTIONS,
  OPPOSITE_DIR,
  RAINBOW_COLORS,
  RAINBOW_FLOOR_COLORS,
  COLOR_UI_TEXT,
  COLOR_UI_DIM,
  ENTITY_SCALE,
  MOVE_KEY_DIRECTION,
  AIM_KEY_DIRECTION,
  animFrame,
  doorPos,
  entryPos,
  rng,
} from "./dungeon-types.js";
import type {
  GameTextures,
  Point,
  Direction,
  Difficulty,
  DifficultyConfig,
  NightmareModifier,
  GameState,
  PlayerCharacter,
  Player,
  Enemy,
  Projectile,
  Room,
  Dungeon,
} from "./dungeon-types.js";

export type { GameTextures } from "./dungeon-types.js";

const COLOR_ENEMY_SHOT = 0x884422;

function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

// --- Scene ---

export class DungeonCrawlerScene implements Scene {
  private textures: GameTextures;
  private state: GameState = "start";
  private player!: Player;
  private playerCharacter: PlayerCharacter = "fairy";
  private selectedDifficulty: Difficulty = "easy";
  private difficultyConfig: DifficultyConfig = DIFFICULTY_PRESETS.easy;
  private activeModifiers: NightmareModifier[] = [];
  private startMenuFocus: "hero" | "difficulty" = "hero";
  private projectiles: Projectile[] = [];
  private dungeon!: Dungeon;
  private heldKeys = new Set<string>();
  private staticDirty = true;
  private tickCount = 0;
  private rainbowPower = 0;
  private healedEnemies = 0;
  private bossWeakenedPopupTimer = 0;

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
    // Build effective config from preset + Nightmare modifiers
    const base = DIFFICULTY_PRESETS[this.selectedDifficulty];
    this.activeModifiers = [];
    if (this.selectedDifficulty === "nightmare") {
      const pool = [...ALL_NIGHTMARE_MODIFIERS];
      rng.shuffle(pool);
      const count = rng.nextInt(1, 2);
      this.activeModifiers = pool.slice(0, count);
    }
    this.difficultyConfig = this.applyModifiers(base, this.activeModifiers);

    this.dungeon = generateDungeon(this.difficultyConfig);
    this.player = {
      pos: { ...this.dungeon.rooms[0].playerSpawn },
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
    this.bossWeakenedPopupTimer = 0;
  }

  private applyModifiers(base: DifficultyConfig, mods: NightmareModifier[]): DifficultyConfig {
    const config = { ...base, modifiers: mods };
    for (const mod of mods) {
      switch (mod) {
        case "noPickups":
          config.pickupsPerRoom = 0;
          break;
        case "doubleBoss":
          config.bossHealth = base.bossHealth * 2;
          break;
        case "swarm":
          config.enemiesPerRoomMin = base.enemiesPerRoomMin + 2;
          config.enemiesPerRoomMax = base.enemiesPerRoomMax + 2;
          break;
        case "fastShots":
          config.rangerShotSpeed = base.rangerShotSpeed + 1;
          config.bossShotSpeed = base.bossShotSpeed + 1;
          break;
        case "cursedHealing":
          config.calmDuration = Math.max(1, Math.floor(base.calmDuration / 2));
          break;
      }
    }
    return config;
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
        } else if (isDiagonal) {
          // Wall-slide: try each axis independently
          if (this.isWalkable(this.player.pos.x + dx, this.player.pos.y)) {
            this.player.pos.x += dx;
          } else if (this.isWalkable(this.player.pos.x, this.player.pos.y + dy)) {
            this.player.pos.y += dy;
          } else {
            break;
          }
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

    // --- 2. Move projectiles ---
    this.moveProjectiles();

    // --- 3. Move enemies ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.type === "chaser") {
        this.updateChaser(enemy);
      } else if (enemy.type === "boss") {
        this.updateBoss(enemy);
      }
    }

    // --- 4. Enemy AI decisions ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.type === "ranger") {
        this.updateRanger(enemy);
      } else if (enemy.type === "boss") {
        this.updateBossAI(enemy);
      }
    }

    // --- 5. Collision: enemy bodies vs player ---
    for (const enemy of enemies) {
      if (enemy.state !== "active") continue;
      if (enemy.pos.x === this.player.pos.x && enemy.pos.y === this.player.pos.y) {
        this.damagePlayer();
      }
    }

    // --- 5b. Collision: pickups ---
    for (const pickup of this.room.pickups) {
      if (pickup.collected) continue;
      if (pickup.pos.x === this.player.pos.x && pickup.pos.y === this.player.pos.y) {
        pickup.collected = true;
        if (this.player.health < this.player.maxHealth) {
          this.player.health++;
        }
      }
    }

    // --- 6. Update effect timers ---
    if (this.player.iFrames > 0) {
      this.player.iFrames--;
    }
    if (this.bossWeakenedPopupTimer > 0) {
      this.bossWeakenedPopupTimer--;
    }
    this.updateEnemyTimers();

    // --- 7. Transition dissolved enemies to healed, update rainbow power ---
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

    // --- 8. Check win/lose ---
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

    // Show popup when entering boss room with rainbow power
    if (targetRoomIdx === this.dungeon.bossRoom && this.rainbowPower > 0) {
      this.bossWeakenedPopupTimer = 20;
    }

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
    if (!inBounds(x, y)) return false;
    const cell = this.room.grid[y][x];
    return cell === "floor" || cell === "door";
  }

  private isEnemyAt(x: number, y: number, exclude: Enemy): boolean {
    return this.room.enemies.some(
      (e) => e !== exclude && e.state === "active" && e.pos.x === x && e.pos.y === y
    );
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

  private moveProjectiles(): void {
    const toRemove: number[] = [];
    const enemies = this.room.enemies;

    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i];
      const delta = DELTA[proj.direction];
      let alive = true;

      for (let step = 0; step < proj.speed; step++) {
        const nx = proj.pos.x + delta.x;
        const ny = proj.pos.y + delta.y;

        if (!inBounds(nx, ny) || this.room.grid[ny][nx] === "wall") {
          alive = false;
          break;
        }

        proj.pos.x = nx;
        proj.pos.y = ny;

        if (proj.isPlayerBeam) {
          // Calm enemies absorb beams (no state change)
          const calmBlocker = enemies.find(
            (e) => e.state === "calm" && e.pos.x === nx && e.pos.y === ny
          );
          if (calmBlocker) {
            alive = false;
            break;
          }

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
              hitEnemy.stateTimer = this.difficultyConfig.calmDuration;
            }
            alive = false;
            break;
          }
        } else {
          if (nx === this.player.pos.x && ny === this.player.pos.y) {
            this.damagePlayer();
            alive = false;
            break;
          }
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
    enemy.moveCooldown = this.difficultyConfig.chaserMoveInterval;

    const next = this.bfsNextStep(enemy.pos, this.player.pos);
    if (next && !this.isEnemyAt(next.x, next.y, enemy)) {
      enemy.pos.x = next.x;
      enemy.pos.y = next.y;
    }
  }

  private updateRanger(enemy: Enemy): void {
    enemy.shootCooldown--;
    if (enemy.shootCooldown > 0) return;
    enemy.shootCooldown = this.difficultyConfig.rangerFireInterval;

    const fireDir = this.getRangerFireDirection(enemy.pos);
    if (fireDir) {
      const delta = DELTA[fireDir];
      const sx = enemy.pos.x + delta.x;
      const sy = enemy.pos.y + delta.y;
      if (!this.isWalkable(sx, sy)) return;
      this.projectiles.push({
        pos: { x: sx, y: sy },
        direction: fireDir,
        speed: this.difficultyConfig.rangerShotSpeed,
        isPlayerBeam: false,
      });
    }
  }

  private updateBoss(enemy: Enemy): void {
    const healthRatio = enemy.health / enemy.maxHealth;
    if (healthRatio >= 0.5) return;

    enemy.moveCooldown--;
    if (enemy.moveCooldown > 0) return;
    enemy.moveCooldown = this.difficultyConfig.bossMoveInterval;

    const next = this.bfsNextStep(enemy.pos, this.player.pos);
    if (next && !this.isEnemyAt(next.x, next.y, enemy)) {
      enemy.pos.x = next.x;
      enemy.pos.y = next.y;
    }
  }

  private updateBossAI(enemy: Enemy): void {
    enemy.shootCooldown--;
    if (enemy.shootCooldown > 0) return;
    enemy.shootCooldown = this.difficultyConfig.bossFireInterval;

    let bestDir: Direction = "down";
    let bestAlignment = 0;

    for (const dir of DIRECTIONS) {
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
      if (inBounds(sx, sy) && this.room.grid[sy][sx] !== "wall") {
        this.projectiles.push({
          pos: { x: sx, y: sy },
          direction: dir,
          speed: this.difficultyConfig.bossShotSpeed,
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
    let bestDir: Direction | null = null;
    let bestDist = Infinity;

    for (const dir of DIRECTIONS) {
      const delta = DELTA[dir];
      let x = from.x;
      let y = from.y;
      let reachedPlayer = true;

      while (true) {
        x += delta.x;
        y += delta.y;

        if (!inBounds(x, y)) {
          reachedPlayer = false;
          break;
        }
        if (this.room.grid[y][x] === "wall") {
          reachedPlayer = false;
          break;
        }
        if (x === this.player.pos.x && y === this.player.pos.y) {
          break;
        }
      }

      if (reachedPlayer) {
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
  // NOTE: Runs per-enemy per-tick. On a 20x20 grid this is fast.
  // If enemy count grows, consider a single reverse-BFS distance map from player.

  private bfsNextStep(from: Point, to: Point): Point | null {
    if (from.x === to.x && from.y === to.y) return null;

    const grid = this.room.grid;
    const visited = new Array(GRID_SIZE * GRID_SIZE).fill(false);
    const parent = new Array(GRID_SIZE * GRID_SIZE).fill(-1);
    const toIdx = (x: number, y: number) => y * GRID_SIZE + x;

    const queue: Point[] = [{ x: from.x, y: from.y }];
    let head = 0;
    visited[toIdx(from.x, from.y)] = true;

    const neighbors: Point[] = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
    ];

    while (head < queue.length) {
      const cur = queue[head++];

      for (const n of neighbors) {
        const nx = cur.x + n.x;
        const ny = cur.y + n.y;

        if (!inBounds(nx, ny)) continue;
        const idx = toIdx(nx, ny);
        if (visited[idx]) continue;
        if (grid[ny][nx] !== "floor") continue;

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
    const bossHP = this.difficultyConfig.bossHealth;
    // Rainbow power can reduce effective boss HP by up to half (minimum 2)
    const reduction = Math.floor(this.rainbowPower * Math.floor(bossHP / 2));
    return Math.max(2, bossHP - reduction);
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
    const isFirstRoom = this.dungeon.currentRoom === 0;
    const cleared = this.room.cleared && !isFirstRoom && (this.state === "playing" || this.state === "win");
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
        const alpha = 0.5 + 0.3 * (enemy.stateTimer / this.difficultyConfig.calmDuration);
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
        // Rainbow stream: continuous beam from player to projectile head
        const delta = DELTA[proj.direction];
        let sx = this.player.pos.x + delta.x;
        let sy = this.player.pos.y + delta.y;
        for (let step = 0; step < GRID_SIZE * 2; step++) {
          if (!inBounds(sx, sy)) break;
          if (this.room.grid[sy][sx] === "wall") break;
          const colorIdx = (sx + sy + this.tickCount) % RAINBOW_COLORS.length;
          renderer.drawRectAlpha(
            sx + 0.15, sy + 0.15, 0.7, 0.7,
            RAINBOW_COLORS[colorIdx], 0.9
          );
          if (sx === proj.pos.x && sy === proj.pos.y) break;
          sx += delta.x;
          sy += delta.y;
        }
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
      const isMoving = enemy.moveCooldown === this.difficultyConfig.chaserMoveInterval;
      return isMoving ? variant.walk[frame4] : variant.idle[frame4];
    }

    if (enemy.type === "ranger") {
      return tex.ranger.idle[frame4];
    }

    // Boss (golem — 6 frames)
    const frame6 = animFrame(this.tickCount, 6, 3);
    const healthRatio = enemy.health / enemy.maxHealth;
    const isMoving = healthRatio < 0.5 && enemy.moveCooldown === this.difficultyConfig.bossMoveInterval;
    return isMoving ? tex.boss.walk[frame6] : tex.boss.idle[frame6];
  }

  private getEnemyHealedTexture(enemy: Enemy): Texture {
    const tex = this.textures;
    const frame4 = animFrame(this.tickCount, 4, 6); // slower animation for healed

    if (enemy.type === "chaser") {
      const gender = enemy.healedGender === "elf_m" ? "elf_m" : "elf_f";
      return tex.chaserHealed[gender][frame4];
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

    // Boss HP hearts (bottom-center, only in boss room with active boss)
    const boss = this.room.enemies.find((e) => e.type === "boss" && e.state === "active");
    if (boss) {
      const cx = CANVAS_WIDTH / 2;
      const heartsY = CANVAS_HEIGHT - 28;
      const colorIdx = Math.floor(this.tickCount / 3) % RAINBOW_COLORS.length;
      const effectiveMax = this.getBossEffectiveMaxHealth();
      const threshold = boss.maxHealth - effectiveMax;
      const effectiveHealth = Math.max(0, boss.health - threshold);

      // Title
      renderer.drawText("Corrupted Troll", cx, heartsY - 18, {
        fontSize: 13, color: 0xff8866, anchor: 0.5,
      });

      // Draw hearts: full (rainbow) | empty active (gray) | depleted by rainbow (dark purple)
      const heartSize = 18;
      const heartSpacing = heartSize + 2;
      const totalWidth = boss.maxHealth * heartSpacing - 2;
      const startX = cx - totalWidth / 2;

      for (let i = 0; i < boss.maxHealth; i++) {
        const hx = startX + i * heartSpacing + heartSpacing / 2;
        let color: number;
        if (i < effectiveHealth) {
          // Full heart — rainbow cycling
          color = RAINBOW_COLORS[(i + Math.floor(this.tickCount / 3)) % RAINBOW_COLORS.length];
        } else if (i < effectiveMax) {
          // Damaged but within effective range — dark gray
          color = 0x444455;
        } else {
          // Depleted by rainbow power — dim purple
          color = 0x332244;
        }
        renderer.drawText("♥", hx, heartsY, {
          fontSize: heartSize, color, anchor: 0.5,
        });
      }

      // Boss weakened popup
      if (this.bossWeakenedPopupTimer > 0) {
        const popupY = heartsY - 36 - (20 - this.bossWeakenedPopupTimer) * 0.5;
        renderer.drawText("Rainbow Power weakened the boss!", cx, popupY, {
          fontSize: 12, color: RAINBOW_COLORS[colorIdx], anchor: 0.5,
        });
      }
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
    const heroFocused = this.startMenuFocus === "hero";
    renderer.drawText("Choose your hero:", cx, 210, {
      fontSize: 16,
      color: heroFocused ? COLOR_UI_TEXT : COLOR_UI_DIM,
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

    // Selection indicator (only when hero row is focused)
    if (heroFocused) {
      const selectedX = this.playerCharacter === "fairy" ? leftX : rightX;
      renderer.drawText(">", selectedX - 28, charY + 8, {
        fontSize: 20,
        color: 0xffd93d,
      });
    }

    // Difficulty selector
    const diffFocused = this.startMenuFocus === "difficulty";
    const diffY = 370;
    renderer.drawText("Difficulty:", cx, diffY, {
      fontSize: 16,
      color: diffFocused ? COLOR_UI_TEXT : COLOR_UI_DIM,
      anchor: 0.5,
    });

    const diffLabelY = diffY + 24;
    const diffIdx = ALL_DIFFICULTIES.indexOf(this.selectedDifficulty);
    const diffColors: Record<Difficulty, number> = {
      easy: 0x33ee66,
      normal: 0xffdd00,
      hard: 0xff8833,
      nightmare: 0xff3333,
    };
    const preset = DIFFICULTY_PRESETS[this.selectedDifficulty];
    const arrowColor = diffFocused ? 0xffd93d : 0x665577;

    // Left/right arrows
    if (diffIdx > 0) {
      renderer.drawText("<", cx - 80, diffLabelY, {
        fontSize: 16, color: arrowColor, anchor: 0.5,
      });
    }
    renderer.drawText(preset.label, cx, diffLabelY, {
      fontSize: 18,
      color: diffColors[this.selectedDifficulty],
      anchor: 0.5,
    });
    if (diffIdx < ALL_DIFFICULTIES.length - 1) {
      renderer.drawText(">", cx + 80, diffLabelY, {
        fontSize: 16, color: arrowColor, anchor: 0.5,
      });
    }

    // Show nightmare modifier preview
    if (this.selectedDifficulty === "nightmare") {
      renderer.drawText("Random modifiers each run!", cx, diffLabelY + 22, {
        fontSize: 11, color: 0xff6666, anchor: 0.5,
      });
    }

    // Controls
    renderer.drawText("< / > to choose hero & difficulty  |  SPACE to start", cx, 460, {
      fontSize: 12,
      color: COLOR_UI_DIM,
      anchor: 0.5,
    });
    renderer.drawText("WASD: Move  |  Arrows: Aim  |  SPACE: Shoot  |  SHIFT: Sprint", cx, 500, {
      fontSize: 11,
      color: COLOR_UI_DIM,
      anchor: 0.5,
    });
  }

  private renderEndStats(renderer: Renderer, cx: number, label: string, statsColor: number, startY: number): void {
    const clearedCount = this.dungeon.rooms.filter((r) => r.cleared).length;
    renderer.drawText(`Rooms ${label}: ${clearedCount}/${this.dungeon.rooms.length}`, cx, startY, {
      fontSize: 16,
      color: statsColor,
      anchor: 0.5,
    });
    renderer.drawText(`Enemies healed: ${this.healedEnemies}/${this.dungeon.totalEnemies}`, cx, startY + 25, {
      fontSize: 16,
      color: statsColor,
      anchor: 0.5,
    });
    renderer.drawText(`Rainbow power: ${Math.floor(this.rainbowPower * 100)}%`, cx, startY + 50, {
      fontSize: 16,
      color: 0x9b7dff,
      anchor: 0.5,
    });

    renderer.drawText(`Difficulty: ${this.difficultyConfig.label}`, cx, startY + 78, {
      fontSize: 14,
      color: COLOR_UI_DIM,
      anchor: 0.5,
    });
    if (this.activeModifiers.length > 0) {
      const modNames = this.activeModifiers.map((m) => NIGHTMARE_MODIFIER_LABELS[m]).join(", ");
      renderer.drawText(modNames, cx, startY + 96, {
        fontSize: 11,
        color: 0xff6666,
        anchor: 0.5,
      });
    }

    renderer.drawText("Press SPACE to return", cx, startY + 140, {
      fontSize: 22,
      color: COLOR_UI_TEXT,
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

    this.renderEndStats(renderer, cx, "explored", COLOR_UI_DIM, 280);
  }

  private renderWinScreen(renderer: Renderer): void {
    renderer.drawRectAlpha(0, 0, GRID_SIZE, GRID_SIZE, 0x000000, 0.75);
    const cx = CANVAS_WIDTH / 2;

    renderer.drawText("Darkness Healed!", cx, 180, {
      fontSize: 44,
      color: RAINBOW_COLORS[Math.floor(this.tickCount / 4) % RAINBOW_COLORS.length],
      anchor: 0.5,
    });

    const guardianFrame = animFrame(this.tickCount, 4, 4);
    renderer.drawSpriteScaled(
      cx / CELL_SIZE - 0.5, 230 / CELL_SIZE,
      this.textures.bossHealed.idle[guardianFrame], 2.0
    );

    this.renderEndStats(renderer, cx, "cleared", COLOR_UI_TEXT, 290);
  }

  onKeyDown(key: string): void {
    this.heldKeys.add(key);

    if (this.state === "start") {
      // Tab / Up / Down to switch focus between hero and difficulty
      if (key === "Tab" || key === "ArrowDown" || key === "KeyS") {
        this.startMenuFocus = this.startMenuFocus === "hero" ? "difficulty" : "hero";
        return;
      }
      if (key === "ArrowUp" || key === "KeyW") {
        this.startMenuFocus = this.startMenuFocus === "difficulty" ? "hero" : "difficulty";
        return;
      }
      // Left/Right to cycle within focused row
      if (key === "ArrowLeft" || key === "KeyA") {
        if (this.startMenuFocus === "hero") {
          this.playerCharacter = "fairy";
        } else {
          const idx = ALL_DIFFICULTIES.indexOf(this.selectedDifficulty);
          if (idx > 0) this.selectedDifficulty = ALL_DIFFICULTIES[idx - 1];
        }
        return;
      }
      if (key === "ArrowRight" || key === "KeyD") {
        if (this.startMenuFocus === "hero") {
          this.playerCharacter = "wizard";
        } else {
          const idx = ALL_DIFFICULTIES.indexOf(this.selectedDifficulty);
          if (idx < ALL_DIFFICULTIES.length - 1) this.selectedDifficulty = ALL_DIFFICULTIES[idx + 1];
        }
        return;
      }
      if (key === "Space") {
        this.state = "playing";
        this.resetGame();
        this.heldKeys.delete("Space");
        return;
      }
      return;
    }

    if (this.state === "gameOver" || this.state === "win") {
      if (key === "Space") {
        this.resetGame();
        this.state = "start";
        this.staticDirty = true;
        this.heldKeys.delete("Space");
      }
      return;
    }

    if (MOVE_KEY_DIRECTION[key]) {
      this.player.aimDirection = MOVE_KEY_DIRECTION[key];
    }
    if (AIM_KEY_DIRECTION[key]) {
      this.player.aimDirection = AIM_KEY_DIRECTION[key];
    }
  }

  onKeyUp(key: string): void {
    this.heldKeys.delete(key);
  }

  destroy(): void {
    this.heldKeys.clear();
  }
}
