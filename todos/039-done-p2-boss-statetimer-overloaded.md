---
status: done
priority: p2
issue_id: "039"
tags: [boss-ai, state-management, maintainability]
dependencies: []
---

# Boss `stateTimer` field overloaded for two unrelated purposes

## Problem Statement

The `enemy.stateTimer` field on boss enemies serves two completely unrelated roles:

1. **Shot counter** (in `updateBossAI`): incremented from 0 to `bossPauseCycle` to track when the boss should take a breather pause.
2. **Calm/dissolve countdown** (in `updateEnemyTimers`): decremented from `calmDuration` to 0 when the enemy transitions from active → calm → dissolving → healed.

Currently this is safe because bosses never return from `calm` to `active`. But the dual purpose makes the code fragile and hard to reason about. Any future change allowing boss recovery (e.g., a boss that can re-enter active state) would silently break because the shot counter would have been overwritten by the calm timer.

## Findings

- `DungeonCrawlerScene.ts:470-472` — `stateTimer` incremented as shot counter in `updateBossAI()`
- `DungeonCrawlerScene.ts:392` — `stateTimer` set to `calmDuration` when boss enters calm state
- `DungeonCrawlerScene.ts:621-628` — `stateTimer` decremented as calm/dissolve countdown in `updateEnemyTimers()`
- `dungeon-gen.ts:70` — Boss initialized with `stateTimer: 0`
- **Known pattern (Todo #014):** Boss AI direction-picking was previously fixed; changes to boss AI timing must not regress this fix.

## Proposed Solutions

### Option 1: Add dedicated `shotsSinceLastPause` field to Enemy

**Approach:** Add a new numeric field to the `Enemy` interface for tracking the boss pause cycle, keeping `stateTimer` exclusively for calm/dissolve timers.

**Pros:**
- Clean separation of concerns
- Safe for future boss behavior changes

**Cons:**
- Adds one more field to Enemy (slightly larger objects)

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/scenes/dungeon-types.ts:58-69` - Enemy interface: add `shotsSinceLastPause` field
- `src/scenes/DungeonCrawlerScene.ts:465-476` - updateBossAI: use new field instead of stateTimer
- `src/scenes/dungeon-gen.ts:70,89` - Initialize new field to 0

**Related components:**
- Boss AI system (updateBossAI, updateBoss)
- Enemy state machine (calm → dissolving → healed)

## Resources

- **Related todo:** #014 (boss direction-picking fix)

## Acceptance Criteria

- [ ] `stateTimer` is only used for calm/dissolve timers
- [ ] Boss pause cycle uses a dedicated field
- [ ] Build passes
- [ ] Boss pause behavior unchanged when playing

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code

**Actions:**
- Identified dual-purpose stateTimer usage during code review
- Verified bosses currently never return to active state (safe today, fragile tomorrow)
- Cross-referenced with past boss AI fixes (Todo #014)

**Learnings:**
- Overloaded state fields are safe only as long as state transitions remain one-directional
