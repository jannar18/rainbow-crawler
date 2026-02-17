---
status: done
priority: p3
issue_id: "025"
tags: [simplification, over-engineering]
dependencies: []
---

# Seeded RNG uses `Date.now()` — dungeons are never reproducible

## Problem Statement

`generateDungeon()` creates a seeded RNG via `makeRng(Date.now())`. Since the seed is always the current timestamp and is never stored or exposed, dungeons cannot be reproduced for debugging, sharing, or replays. The entire `makeRng` LCG implementation provides no benefit over using `Math.random()` directly.

## Findings

- `makeRng` implementation: `src/scenes/DungeonCrawlerScene.ts:182-199`
- Called with `Date.now()` on line 222
- Seed is never stored, logged, or returned
- `makeRng` provides `next()`, `nextInt()`, `shuffle()` — useful abstraction, but the seedability is wasted

## Proposed Solutions

### Option 1: Replace with Math.random()

**Approach:** Remove `makeRng` and use `Math.random()` directly. Simpler code, same behavior.

**Effort:** Small (20 min)

### Option 2: Make it actually reproducible

**Approach:** Keep `makeRng` but store the seed (e.g., on the Dungeon object), display it in the HUD or console, and accept an optional seed parameter for replay.

**Effort:** Small (30 min)

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:182-199,222` — either remove makeRng or store seed

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Noted that `makeRng(Date.now())` defeats the purpose of seedable RNG
- Documented two approaches: simplify or actually use seeding
