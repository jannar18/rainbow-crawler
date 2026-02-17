---
status: done
priority: p3
issue_id: "031"
tags: [dead-code, cleanup]
dependencies: []
---

# Remove unused RoomNode.id field in dungeon generation

## Problem Statement

The `RoomNode` interface inside `generateDungeon()` has an `id` field that is set during construction but never read. Array indices are used directly instead.

## Findings

- `src/scenes/dungeon-gen.ts:26-29` — `RoomNode` interface has `id: number`
- `src/scenes/dungeon-gen.ts:33` — `id: i` is set but never accessed

## Proposed Solutions

### Option 1: Remove the id field

**Approach:** Remove `id` from `RoomNode` interface and creation site.

**Effort:** <5 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/dungeon-gen.ts:26-33` — Remove `id` from RoomNode interface and object creation

## Acceptance Criteria

- [ ] RoomNode has no `id` field
- [ ] Dungeon generation still works correctly

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
