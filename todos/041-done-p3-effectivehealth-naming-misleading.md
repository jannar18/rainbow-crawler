---
status: done
priority: p3
issue_id: "041"
tags: [naming, readability, boss-hp]
dependencies: []
---

# `effectiveHealth` variable naming is misleading in boss HP display

## Problem Statement

In `renderHUD()`, the variable `effectiveHealth` (line 879) does not represent the boss's effective HP. It represents the number of hearts that should be rendered as "full" (the remaining hits the boss can take before calming). The name suggests it's the boss's adjusted health value, but it's actually `boss.health - threshold` where threshold accounts for rainbow-weakened hearts.

## Findings

- `DungeonCrawlerScene.ts:878-879` — Variable declaration:
  ```typescript
  const threshold = boss.maxHealth - effectiveMax;
  const effectiveHealth = Math.max(0, boss.health - threshold);
  ```
- The three-zone heart display (full → empty → dimmed) is correct but the naming makes it hard to understand at a glance.

## Proposed Solutions

### Option 1: Rename to `remainingHits` and add brief comment

**Approach:** Rename `effectiveHealth` to `remainingHits` or `displayedFullHearts` and add a one-line comment explaining the three-zone layout.

**Pros:**
- Clearer intent for future readers

**Cons:**
- Very minor change

**Effort:** 10 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/scenes/DungeonCrawlerScene.ts:879,895` - rename variable and its usage

## Acceptance Criteria

- [ ] Variable renamed to something clearer
- [ ] Build passes

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code

**Actions:**
- Identified misleading naming during boss HP rendering review
