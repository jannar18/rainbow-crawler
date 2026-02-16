---
status: done
priority: p2
issue_id: "013"
tags: [resource-leak, engine, pixijs]
dependencies: []
---

# Fix renderError() PixiJS object leak and infinite loop

## Problem Statement

When a runtime error occurs, `Game.ts:renderError()` is called every animation frame. Each call does `this.app.stage.removeChildren()` (which does NOT destroy children) and creates 3 new PixiJS objects (Graphics + 2 Text). The removed children leak GPU resources. At 60fps, this creates 180 leaked objects per second indefinitely, since the animation loop never stops.

**Known Pattern:** This is the same `removeChildren()` vs `destroy()` issue that was fixed in `Renderer.clear()` during Phase 1 review (documented in `docs/solutions/patterns/pixijs-v8-phase1-review-20260216.md`).

## Findings

- `Game.ts:89`: `this.app.stage.removeChildren()` — no `.destroy()` on removed children
- `Game.ts:91-121`: Creates new Graphics and Text objects every frame
- `Game.ts:85`: `requestAnimationFrame` called unconditionally — loop never stops after error
- `Game.ts:82`: `renderError` runs every frame while `errorMessage` is set
- `Renderer.ts:131-134`: The fix for this exact pattern already exists in `clear()`

## Proposed Solutions

### Option 1: Render error once and stop the loop

**Approach:** After rendering the error, set `this.running = false` to stop the animation loop. Destroy removed children.

**Pros:**
- Zero ongoing resource consumption
- Simple

**Cons:**
- Loop cannot be restarted without page reload (acceptable for unrecoverable error)

**Effort:** 15 minutes

**Risk:** Low

### Option 2: Cache error display objects

**Approach:** Create error overlay objects once, guard `renderError` with `if (this.errorRendered) return`.

**Pros:**
- Loop stays alive (could be useful if error clearing is added later)
- No leak

**Cons:**
- Slightly more code

**Effort:** 20 minutes

**Risk:** Low

## Recommended Action

Option 1 is simpler and matches the current behavior (errors are terminal).

## Technical Details

**Affected files:**
- `src/engine/Game.ts:81-122` - fix renderError and loop termination

## Acceptance Criteria

- [ ] Error display objects are created only once
- [ ] Removed children are destroyed
- [ ] No PixiJS object accumulation during error display

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)

**Actions:**
- Identified leak pattern matching Phase 1 findings
- Confirmed by learnings-researcher agent
