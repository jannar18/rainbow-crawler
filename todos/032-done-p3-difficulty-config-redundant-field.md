---
status: done
priority: p3
issue_id: "032"
tags: [over-engineering, cleanup]
dependencies: []
---

# Remove redundant DifficultyConfig.difficulty field

## Problem Statement

Each `DifficultyConfig` has a `difficulty: Difficulty` field (e.g., `difficulty: "easy"`) that duplicates the key used to look it up in `DIFFICULTY_PRESETS`. It is never read anywhere in the codebase — only `label` is used for display and `selectedDifficulty` for logic.

## Findings

- `src/scenes/dungeon-types.ts:106` — `difficulty: Difficulty` in DifficultyConfig interface
- `src/scenes/dungeon-types.ts:138,149,160,172` — `difficulty` field set in each preset
- No code reads `config.difficulty` anywhere

## Proposed Solutions

### Option 1: Remove the field

**Approach:** Remove `difficulty` from the interface and each preset object.

**Effort:** <5 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/dungeon-types.ts:106` — Remove from interface
- `src/scenes/dungeon-types.ts:138,149,160,172` — Remove from preset objects

## Acceptance Criteria

- [ ] DifficultyConfig has no `difficulty` field
- [ ] TypeScript compilation succeeds

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
