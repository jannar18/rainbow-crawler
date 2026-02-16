---
status: pending
priority: p3
issue_id: "010"
tags: [performance, phase2]
dependencies: []
---

# BFS uses Array.shift() which is O(n) per dequeue

## Problem Statement

The BFS in `bfsNextStep()` uses `queue.shift()` on a plain array, which is O(n) per dequeue. On a 20x20 grid (400 cells max) this creates up to ~160,000 operations worst case — negligible at current scale but would matter if rooms scale up.

## Findings

- `src/scenes/DungeonCrawlerScene.ts:544` — `queue.shift()`
- Trivial impact at 20x20, would matter at 50x50+

## Proposed Solutions

### Option 1: Use an index-based queue

**Approach:** Replace `queue.shift()` with a `front` index that advances through the array. Same array, no re-indexing.

**Effort:** 5 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:528-573` — bfsNextStep

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
