import { Application, Assets, TextureSource, Texture } from "pixi.js";
import { Game } from "./engine/Game.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./engine/types.js";
import { DungeonCrawlerScene } from "./scenes/DungeonCrawlerScene.js";
import type { GameTextures } from "./scenes/DungeonCrawlerScene.js";

// Crisp pixel art — no bilinear filtering
TextureSource.defaultOptions.scaleMode = "nearest";

function loadFrames(
  loaded: Record<string, Texture>,
  prefix: string,
  count: number,
  startAt = 1
): Texture[] {
  const frames: Texture[] = [];
  for (let i = startAt; i < startAt + count; i++) {
    const key = `${prefix}${i}.png`;
    const tex = loaded[key];
    if (!tex) throw new Error(`Missing texture: ${key}`);
    frames.push(tex);
  }
  return frames;
}

async function bootstrap() {
  const app = new Application();
  await app.init({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: 0x1a1a2e,
  });

  const container = document.getElementById("app");
  if (!container) throw new Error("Missing #app element");
  container.appendChild(app.canvas);

  // --- Build asset list ---
  const paths: string[] = [];

  // Player
  for (let i = 1; i <= 4; i++) {
    paths.push(`sprites/player/fairy_idle_walk_${i}.png`);
    paths.push(`sprites/player/wizard_idle_walk_${i}.png`);
  }

  // Chaser variants (gnolls)
  for (const variant of ["gnollbrute", "gnollshaman", "gnollscout"]) {
    for (let i = 1; i <= 4; i++) {
      paths.push(`sprites/chaser/${variant}_idle_${i}.png`);
      paths.push(`sprites/chaser/${variant}_walk_${i}.png`);
    }
  }

  // Chaser healed (elves)
  for (const gender of ["elf_f", "elf_m"]) {
    for (let i = 1; i <= 4; i++) {
      paths.push(`sprites/chaser-healed/${gender}_idle_${i}.png`);
    }
  }

  // Ranger (chort) — 0-indexed frames
  for (let i = 0; i <= 3; i++) {
    paths.push(`sprites/ranger/chort_idle_anim_f${i}.png`);
  }

  // Ranger healed (mushroom)
  for (let i = 1; i <= 4; i++) {
    paths.push(`sprites/ranger-healed/largemushroom_idle_${i}.png`);
  }

  // Boss (golem) — 6 frames
  for (let i = 1; i <= 6; i++) {
    paths.push(`sprites/boss/golem_idle_${i}.png`);
    paths.push(`sprites/boss/golem_walk_${i}.png`);
  }

  // Boss healed (forest guardian)
  for (let i = 1; i <= 4; i++) {
    paths.push(`sprites/boss-healed/forestguardian_idle_${i}.png`);
  }

  // Tiles
  paths.push("sprites/tiles/doors_leaf_closed.png");
  for (let i = 1; i <= 10; i++) {
    paths.push(`sprites/tiles/jungle_wall_${i}.png`);
  }

  // UI
  paths.push(
    "sprites/ui/ui_heart_full.png",
    "sprites/ui/ui_heart_empty.png"
  );

  // --- Load all ---
  const loaded = await Assets.load(paths) as Record<string, Texture>;

  // --- Build structured texture map ---
  const textures: GameTextures = {
    player: {
      fairy: loadFrames(loaded, "sprites/player/fairy_idle_walk_", 4),
      wizard: loadFrames(loaded, "sprites/player/wizard_idle_walk_", 4),
    },
    chaser: {
      gnollbrute: {
        idle: loadFrames(loaded, "sprites/chaser/gnollbrute_idle_", 4),
        walk: loadFrames(loaded, "sprites/chaser/gnollbrute_walk_", 4),
      },
      gnollshaman: {
        idle: loadFrames(loaded, "sprites/chaser/gnollshaman_idle_", 4),
        walk: loadFrames(loaded, "sprites/chaser/gnollshaman_walk_", 4),
      },
      gnollscout: {
        idle: loadFrames(loaded, "sprites/chaser/gnollscout_idle_", 4),
        walk: loadFrames(loaded, "sprites/chaser/gnollscout_walk_", 4),
      },
    },
    chaserHealed: {
      elf_f: loadFrames(loaded, "sprites/chaser-healed/elf_f_idle_", 4),
      elf_m: loadFrames(loaded, "sprites/chaser-healed/elf_m_idle_", 4),
    },
    ranger: {
      idle: loadFrames(loaded, "sprites/ranger/chort_idle_anim_f", 4, 0),
    },
    rangerHealed: loadFrames(
      loaded,
      "sprites/ranger-healed/largemushroom_idle_",
      4
    ),
    boss: {
      idle: loadFrames(loaded, "sprites/boss/golem_idle_", 6),
      walk: loadFrames(loaded, "sprites/boss/golem_walk_", 6),
    },
    bossHealed: {
      idle: loadFrames(loaded, "sprites/boss-healed/forestguardian_idle_", 4),
    },
    tiles: {
      jungleWalls: loadFrames(loaded, "sprites/tiles/jungle_wall_", 10),
      doorClosed: loaded["sprites/tiles/doors_leaf_closed.png"],
    },
    ui: {
      heartFull: loaded["sprites/ui/ui_heart_full.png"],
      heartEmpty: loaded["sprites/ui/ui_heart_empty.png"],
    },
  };

  const game = new Game(app);
  game.loadScene(new DungeonCrawlerScene(textures));
}

bootstrap().catch(console.error);
