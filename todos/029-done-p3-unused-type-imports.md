---
status: done
priority: p3
issue_id: "029"
tags: [dead-code, cleanup]
dependencies: []
---

# Remove unused type imports from DungeonCrawlerScene

## Problem Statement

DungeonCrawlerScene.ts imports types that are never directly referenced in the file.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:1` — `import type { Texture } from "pixi.js"` is unused (Texture is accessed via `GameTextures` fields, and return types are inferred)
- `src/scenes/DungeonCrawlerScene.ts:38` — `EnemyState` is imported but never used (enemy states are compared as string literals)

## Proposed Solutions

### Option 1: Remove unused imports

**Approach:** Remove `Texture` and `EnemyState` from the import statements.

**Effort:** <5 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:1` — Remove `Texture` import
- `src/scenes/DungeonCrawlerScene.ts:38` — Remove `EnemyState` from type imports

## Acceptance Criteria

- [ ] TypeScript compilation succeeds without the removed imports
- [ ] No functional changes

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
