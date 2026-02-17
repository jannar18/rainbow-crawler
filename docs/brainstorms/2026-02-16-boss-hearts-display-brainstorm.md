# Boss Hearts Display Brainstorm

**Date:** 2026-02-16
**Status:** Completed

## What We're Building

Replace the boss HP bar at the bottom of the screen with **heart icons** that visually represent the boss's health. This makes boss HP legible at a glance and ties it visually to the rainbow power mechanic.

### Current Behavior

- Boss HP is shown as a 3-layer progress bar at the bottom of the screen:
  1. Dark background (full width = max HP)
  2. Dim purple "depleted" section (HP removed by rainbow power)
  3. Rainbow-cycling "active HP" fill
- Boss HP varies by difficulty: Easy 3, Normal 5, Hard 7, Nightmare 10
- Rainbow power (earned by healing corrupted enemies) reduces the boss's effective max HP by up to half
- The "Corrupted Troll" label and a "Rainbow Power weakened the boss!" popup appear alongside the bar

### Desired Behavior

- Boss HP shown as a row of **heart icons** centered at the bottom of the screen
- **Full hearts** (colored/rainbow) = current active HP
- **Hollow/gray hearts** = HP depleted by rainbow power (always visible so you can see max vs current)
- As the player damages the boss, full hearts deplete left-to-right (or right-to-left)
- The rainbow power mechanic itself doesn't change — only the visual representation of boss HP

## Why This Approach

- Hearts are immediately readable — you see "3 out of 5" at a glance
- Hollow hearts show the tangible reward of healing enemies (rainbow power made those hearts gray before the fight even started)
- Consistent visual language if the player's own HP also uses hearts
- Simpler and more charming than a segmented bar

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Heart rendering | Text character `♥` via `drawText` | Simplest approach; no sprite assets needed; matches existing HUD style |
| Depleted hearts | Hollow/gray hearts always visible | Player can always see max HP vs current HP; reinforces the rainbow power payoff |
| Rainbow power math | Keep existing formula | `reduction = floor(rainbowPower * floor(bossHP / 2))` already scales well across difficulties |
| Heart colors | Full = rainbow-cycling color (matches current bar), Hollow = dark gray | Maintains the rainbow theme |
| Damage direction | Hearts deplete right-to-left | Full hearts on the left, empty on the right — natural "health draining" direction |
| Layout | Centered row at bottom of screen, replacing the bar | Same location as current bar; label stays above |

## Open Questions

None — scope is small and well-defined.

## Out of Scope

- Changing the rainbow power bar itself (stays as-is in the top-left HUD)
- Changing boss HP values or the rainbow power formula
- Animated heart loss effects (can add later if desired)
- Player HP display changes (already uses a different system)
