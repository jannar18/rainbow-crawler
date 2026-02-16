# Critical Patterns

Required reading for all planning and review workflows. These patterns are checked every time.

---

## 1. Scene Interface Is the Only Engine-Game Contract (ALWAYS REQUIRED)

### WRONG (Will break engine/game separation)
```typescript
// Game logic directly imports engine internals
import { Application } from "pixi.js";
import { Input } from "../engine/Input.js";

class MyScene implements Scene {
  private app: Application; // DON'T access PixiJS directly

  update(dt: number) {
    // DON'T use variable time — dt is always 0.15s
    const now = Date.now();
    this.move(now - this.lastTime);
  }
}
```

### CORRECT
```typescript
import type { Scene, GameContext, Renderer } from "../engine/types.js";

class MyScene implements Scene {
  private gridSize = 0;

  init(context: GameContext) {
    this.gridSize = context.gridSize; // Get config from context
  }

  update(dt: number) {
    // Use the fixed dt directly — it's always 0.15s
    this.position += this.speed * dt;
  }

  render(renderer: Renderer) {
    renderer.drawRect(this.x, this.y, 1, 1, 0xff0000); // Grid coords
    renderer.stage; // Escape hatch if you need raw PixiJS
  }

  onKeyDown(key: string) { /* handle input */ }
  onKeyUp(key: string) { /* handle release */ }
  destroy() { /* clean up */ }
}
```

**Why:** The Scene interface is the only contract between engine and game layer. Bypassing it (importing engine internals, using Date.now() instead of fixed dt, accessing PixiJS directly) breaks the architecture and makes the engine unstable. Students should only modify files in `src/scenes/` and the import in `src/main.ts`.

**Placement/Context:** Applies whenever creating a new Scene implementation or modifying game logic. The engine layer (`src/engine/`) should never be modified.

**Documented in:** `docs/solutions/best-practices/scene-based-game-engine-architecture-20260215.md`
