---
status: done
priority: p2
issue_id: "021"
tags: [dead-code]
dependencies: []
---

# Remove dead `drawSpriteAlpha` and `drawSpriteTinted` renderer methods

## Problem Statement

`drawSpriteAlpha` and `drawSpriteTinted` are defined in both the `Renderer` class and `Renderer` interface but are never called anywhere in the codebase. The scene exclusively uses `drawSpriteScaled`, which accepts optional `alpha` and `tint` parameters, making these two methods fully redundant.

## Findings

- `Renderer.drawSpriteAlpha()` — defined at `src/engine/Renderer.ts:103-116`, declared at `src/engine/types.ts:46-51`. Zero callers.
- `Renderer.drawSpriteTinted()` — defined at `src/engine/Renderer.ts:118-133`, declared at `src/engine/types.ts:52-58`. Zero callers.
- `Renderer.drawSpriteScaled()` — defined at `src/engine/Renderer.ts:135-153`, accepts `alpha` (default 1) and `tint` (optional). This is a strict superset of both dead methods.

## Proposed Solutions

### Option 1: Remove both methods

**Approach:** Delete `drawSpriteAlpha` and `drawSpriteTinted` from `Renderer.ts` and `types.ts`.

**Pros:**
- Less code to maintain
- Interface accurately reflects what's used

**Cons:**
- None — these are dead code

**Effort:** Small (10 min)

**Risk:** Low

## Technical Details

**Affected files:**
- `src/engine/Renderer.ts:103-133` — remove both method implementations
- `src/engine/types.ts:46-58` — remove both interface declarations

## Acceptance Criteria

- [ ] Both methods removed from class and interface
- [ ] Build passes
- [ ] No runtime errors

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Confirmed zero callers via grep
- Confirmed `drawSpriteScaled` provides superset functionality
