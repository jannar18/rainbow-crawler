---
status: done
priority: p3
issue_id: "036"
tags: [type-safety]
dependencies: []
---

# Use union types for Enemy gnollVariant and healedGender fields

## Problem Statement

`Enemy.gnollVariant` and `Enemy.healedGender` are typed as `string` instead of proper union types. This weakens type safety and leads to `as` casts in the rendering code (line 801).

## Findings

- `src/scenes/dungeon-types.ts:66-67` — `gnollVariant: string` and `healedGender: string`
- `src/scenes/DungeonCrawlerScene.ts:801` — `enemy.healedGender as "elf_f" | "elf_m"` cast needed
- `GNOLL_VARIANTS` and `ELF_GENDERS` const arrays already exist and could derive the types

## Proposed Solutions

### Option 1: Derive union types from const arrays

**Approach:**
```typescript
gnollVariant: typeof GNOLL_VARIANTS[number] | "";
healedGender: typeof ELF_GENDERS[number] | "";
```

**Effort:** 10 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/scenes/dungeon-types.ts:66-67` — Change types
- `src/scenes/DungeonCrawlerScene.ts:801` — Remove `as` cast

## Acceptance Criteria

- [ ] gnollVariant and healedGender use union types
- [ ] No `as` casts needed for these fields
- [ ] TypeScript compilation succeeds

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code (review)
