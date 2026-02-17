---
status: done
priority: p3
issue_id: "017"
tags: [gameplay, ai, pathfinding]
dependencies: []
---

# Enemies can BFS-path onto door cells, creating exploits

## Problem Statement

BFS pathfinding treats door cells as walkable, allowing chasers and the boss to stand on door cells. When an enemy is on a door cell and the player steps on it, the door transition fires and the rest of the tick is skipped — the enemy collision never triggers. This allows the player to exploit door cells as safe spots, particularly during the boss fight where unlimited retreat is possible.

## Findings

- `DungeonCrawlerScene.ts:1052`: BFS skips only `"wall"` cells, doors are traversable
- `DungeonCrawlerScene.ts:626-629`: Door transition triggers and returns before collision checks
- Boss room has exactly 1 door — boss can be kited onto it
- Enemies stacking on doors become effectively harmless
- Enemies also stack on each other (no enemy-enemy collision avoidance in BFS)

## Proposed Solutions

### Option 1: Add door cells to BFS wall check

**Approach:** In `bfsNextStep`, treat door cells as walls for enemy pathfinding: `if (grid[ny][nx] === "wall" || grid[ny][nx] === "door") continue;`

**Pros:**
- Enemies never path onto doors
- Prevents the boss-kiting exploit

**Cons:**
- If a door is the only path between two areas, enemies can't cross (but rooms are designed to be single open areas with doors on edges, so this shouldn't happen)

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Option 1 — simple, prevents exploits.

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:1052` - add door check to BFS

## Acceptance Criteria

- [ ] Enemies never stand on door cells
- [ ] Boss fight cannot be cheesed via door retreat

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified via scenario exploration agent
- Confirmed boss-kiting exploit path
