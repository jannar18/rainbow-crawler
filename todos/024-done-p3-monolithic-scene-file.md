---
status: done
priority: p3
issue_id: "024"
tags: [architecture, simplification]
dependencies: []
---

# Consider decomposing 1536-line DungeonCrawlerScene.ts

## Problem Statement

The entire game — types, constants, dungeon generation, pathfinding, AI, projectile logic, rendering, input, and HUD — lives in a single 1536-line file. This makes it increasingly difficult to navigate, understand individual subsystems, and reason about changes.

## Findings

The file has clear logical sections that could be independent modules:

| Section | Lines | Description |
|---------|-------|-------------|
| Types & interfaces | 1-103 | GameTextures, Point, Direction, Player, Enemy, etc. |
| Constants | 104-172 | Gameplay tuning, colors, key mappings |
| Helpers | 174-211 | animFrame, makeRng, doorPos, entryPos |
| Dungeon generation | 220-570 | generateDungeon, generateRoom, floodFill, etc. |
| Scene class | 574-1536 | All game logic, rendering, input |

## Proposed Solutions

### Option 1: Extract types and dungeon generation

**Approach:** Move types/constants to `src/scenes/dungeon-types.ts` and dungeon generation functions to `src/scenes/dungeon-gen.ts`. Keep the scene class in the main file.

**Pros:**
- Most impactful split (~570 lines extracted)
- Dungeon generation is pure functions with no scene dependency

**Cons:**
- More files to manage
- Circular dependency risk if not careful

**Effort:** Medium (1-2 hours)

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts` — extract sections

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified clear module boundaries in the 1536-line file
- Noted dungeon generation functions are pure and easy to extract
