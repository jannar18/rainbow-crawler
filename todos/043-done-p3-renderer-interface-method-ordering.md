---
status: done
priority: p3
issue_id: "043"
tags: [code-organization, renderer]
dependencies: []
---

# `drawRectStatic` placed out of group in Renderer interface

## Problem Statement

In `src/engine/types.ts`, the `Renderer` interface has `drawRectStatic` placed at lines 78-84, after `clear()`, `clearStatic()`, and the `stage` property. All other `drawRect*` methods are grouped at the top of the interface. This was likely added in an earlier commit and never reorganized.

## Findings

- `types.ts:20-27` — `drawRect` (top)
- `types.ts:28-35` — `drawRectAlpha` (top)
- `types.ts:78-84` — `drawRectStatic` (bottom, out of group)

## Proposed Solutions

### Option 1: Move `drawRectStatic` next to `drawRect` and `drawRectAlpha`

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/engine/types.ts:20-86` - reorder interface members

## Acceptance Criteria

- [ ] `drawRectStatic` grouped with other `drawRect*` methods
- [ ] Build passes

## Work Log

### 2026-02-16 - Initial Discovery

**By:** Claude Code
