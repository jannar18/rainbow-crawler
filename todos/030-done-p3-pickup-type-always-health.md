---
status: done
priority: p3
issue_id: "030"
tags: [over-engineering, cleanup]
dependencies: []
---

# Remove unused Pickup.type field

## Problem Statement

The `Pickup` interface has a `type: "health"` field that is a single-value literal type. It is set to `"health"` in the only creation site (dungeon-gen.ts:345) and is never read or checked anywhere in the codebase.

## Findings

- `src/scenes/dungeon-types.ts:77-81` — `Pickup` interface with `type: "health"`
- `src/scenes/dungeon-gen.ts:345` — Only place pickups are created, always `type: "health"`
- No code reads `pickup.type` anywhere

## Proposed Solutions

### Option 1: Remove the field

**Approach:** Remove `type` from the `Pickup` interface and from the creation site.

**Effort:** <5 minutes

**Risk:** Low — if pickup types are needed later, the field can be re-added then

## Technical Details

**Affected files:**
- `src/scenes/dungeon-types.ts:79` — Remove `type: "health"` from Pickup interface
- `src/scenes/dungeon-gen.ts:345` — Remove `type: "health"` from pickup creation

## Acceptance Criteria

- [ ] Pickup interface has no `type` field
- [ ] TypeScript compilation succeeds

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
