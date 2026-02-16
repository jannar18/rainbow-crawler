# Rainbow Crawler — Art Direction & Visual Identity

**Date:** 2026-02-16
**Status:** Brainstorm
**Approach:** Design-first, build later — document the complete visual identity now; implement during Phase 4 (Polish & Sprites) unless noted otherwise.

---

## What We're Building

A cohesive "cozy retro" visual identity for Rainbow Crawler — a dungeon crawler where a small fairy heals corrupted creatures with rainbow beams inside crystal caverns. Every visual element should feel warm, charming, and nostalgic (think early Zelda color palette meets Kirby's friendliness) while supporting the core mechanic of "rainbow healing transforms darkness into color."

---

## Art Style: Cozy Retro

- **Pixel art at 32x32 per cell** — chunky, readable sprites with no anti-aliasing
- **Warm color palette** — avoid cold grays; even "dark" tones should lean warm (deep purples, warm browns)
- **High contrast between corrupted (dark) and healed (colorful) states** — the rainbow theme should be visible at a glance
- **Retro charm** — limited color counts per sprite (8-12 colors), visible pixel grid, no gradients or glow shaders

---

## Rainbow Beam — Particle Stream

The signature mechanic and the most important visual element.

### Behavior
- **Tight & sparkly:** Particles travel in a narrow stream along the beam's direction
- **Slight scatter:** Each particle has a small random offset (1-3 pixels perpendicular to direction) so it's not a rigid line
- **Multiple particles per shot:** Firing spawns 4-6 small square particles (4x4 to 6x6 pixels) per tick
- **Rainbow cycling:** Each particle gets the next color in the rainbow sequence (red, orange, yellow, green, blue, indigo, violet), so the stream naturally shows the full spectrum
- **Sparkle effect:** Particles have a brief bright flash on spawn, then settle to their assigned color
- **Trail fade:** Particles shrink slightly and fade alpha as they travel, disappearing after ~4-5 cells of travel
- **Speed:** Particles move at 2 cells/tick (matching current beam speed) with slight speed variation (+/- 10%)

### Color Palette (Rainbow)
| Color | Hex | Role |
|-------|-----|------|
| Red | `0xff6b6b` | Warm, soft red (not aggressive) |
| Orange | `0xffa06b` | Peachy orange |
| Yellow | `0xffd93d` | Bright golden yellow |
| Green | `0x6bcf7f` | Soft mint green |
| Blue | `0x6bb5ff` | Sky blue |
| Indigo | `0x9b7dff` | Soft purple |
| Violet | `0xd97dff` | Light magenta |

These are intentionally softened/pastel-leaning to match the cozy retro aesthetic rather than harsh neon.

---

## Player Character — Small Fairy/Sprite

### Design
- A tiny winged humanoid creature, roughly 20x24 pixels within the 32x32 cell
- **Big expressive eyes** (the primary source of personality)
- **Small translucent wings** that flutter in an idle animation
- **Trailing sparkles** — 2-3 tiny bright pixels trail behind the fairy when moving, fading quickly
- **Color:** Soft white/cream body with pastel rainbow-tinted wings

### States
| State | Visual Change |
|-------|--------------|
| Idle | Wings gently flutter (2-frame animation) |
| Moving | Slight forward lean, sparkle trail appears |
| Firing beam | Arms/wand extended forward, wings spread wider, brighter glow |
| Damaged (i-frames) | Flashes between normal and transparent (current behavior but with sprite) |
| Low health | Wings droop slightly, sparkle trail dims |

### Facing Indicator
Replace the current small green rectangle with a tiny glowing orb or wand tip that floats in front of the fairy in the facing direction.

---

## Enemies — Dark to Colorful Transformation

### Core Concept
Corrupted enemies are **dark, shadowy versions** with glowing red eyes. They look like they're wrapped in dark smoke/shadow. When healed by the rainbow beam, their true colorful, friendly form is revealed underneath.

### Chaser Enemy (Corrupted)
- A small quadruped creature (like a corrupted fox or cat)
- **Corrupted:** Dark purple/black silhouette, red glowing eyes, jagged/spiky outline
- **Partially healed:** Shadow starts cracking, patches of color visible underneath
- **Fully healed:** Bright orange fox or colorful cat, friendly eyes, smooth outline, might have a small happy expression

### Ranger Enemy (Corrupted)
- A floating eye/wisp creature that shoots from a distance
- **Corrupted:** Dark orb with a single angry red eye, dark particles orbiting it
- **Partially healed:** Eye color shifts from red toward blue, dark particles slow down
- **Fully healed:** Becomes a friendly floating crystal spirit with a calm blue eye, orbiting sparkles instead of dark particles

### Heal Effect — Spiral Wrap
When the rainbow beam hits and heals an enemy:
1. Rainbow particles from the beam **spiral inward** around the enemy (2-3 rotations over ~1 second)
2. The spiraling particles form a **rainbow cocoon** that briefly envelops the enemy
3. The cocoon **shatters outward** in a burst of colorful fragments
4. The healed form is revealed underneath
5. A brief shower of sparkles falls around the newly healed creature

### Dissolve (Enemy Exits After Healing)
After being fully healed, the creature lingers for a moment (happy idle), then:
- Body cycles through rainbow colors rapidly
- Alpha fades from 1.0 to 0.0 over ~0.5 seconds
- Small colored particles drift upward as it fades (like ascending sparkles)

---

## Environment — Crystal Caverns

### Walls
- **Crystal-embedded stone:** Base dark warm stone (deep purple-brown `0x3d2b4a`) with embedded crystal facets
- **Crystal accents:** Small bright crystal shapes (2-4 pixels) embedded in walls, using colors from the rainbow palette
- **Variety:** 3-4 wall tile variants to avoid repetition
- **Edges:** Walls that border floors should have a slightly lighter edge to create depth

### Floors
- **Smooth cave stone:** Warm dark base (`0x2a1f3d`) with subtle texture variation
- **Crystal dust:** Occasional tiny bright pixels scattered on floor tiles (like crystal fragments)
- **Puddle tiles (rare):** Some floor tiles have small reflective puddles that subtly mirror crystal colors

### Doors
- **Crystal archway:** Doorways framed by larger crystal formations
- **Glow:** Doors emit a soft warm light (golden) to draw the player's attention
- **Color:** Warm amber/gold crystal (`0xd4a847`) rather than current brown

### Lighting Feel
- No dynamic lighting system needed — convey warmth through **color palette choices**
- Walls slightly lighter near doors (baked-in torch glow effect)
- Floor tiles near crystals have a faint color tint matching the nearest crystal

---

## HUD & UI — Ornate Crystal Frame

### Health Display
- **Frame:** A small ornate crystal-themed border around the health bar
- **Bar style:** Heart-shaped or gem-shaped segments rather than a plain rectangle
- **Colors:** Health segments glow soft pink/red when full, dim to gray when empty
- **Position:** Top-left corner, sized to not obstruct gameplay

### Rainbow Power Meter
- **Frame:** Matching crystal border, positioned below health
- **Bar style:** Fills with cycling rainbow colors as power increases
- **Full indicator:** When full, the frame pulses/sparkles to signal the player can use their power
- **Colors:** Gradient fill cycling through the rainbow palette defined above

### Title Screen — "Rainbow Crawler"
- **Title text:** Large pixel font in rainbow gradient (each letter a different color from the palette)
- **Background:** Dark crystal cavern with a few glowing crystals
- **Fairy character** centered below the title, idle animation playing
- **Instructions:** Warm cream-colored text (`0xffeedd`) on the dark background
- **Subtitle:** "Heal the darkness" or similar thematic tagline in soft violet

### Game Over / Victory Screen
- **Game over:** Screen dims, fairy falls with drooping wings, text in soft red
- **Victory:** Screen fills with rainbow light, all healed creatures briefly appear and wave, confetti particles

---

## Color Palette Summary

### Environment
| Element | Hex | Description |
|---------|-----|-------------|
| Wall base | `0x3d2b4a` | Deep warm purple-brown |
| Wall highlight | `0x5a4170` | Lighter purple for edges |
| Floor base | `0x2a1f3d` | Dark warm purple |
| Floor variation | `0x332648` | Slightly lighter floor |
| Door/crystal | `0xd4a847` | Warm amber gold |
| Door glow | `0xffe4a1` | Soft golden light |

### Characters
| Element | Hex | Description |
|---------|-----|-------------|
| Fairy body | `0xfff5e6` | Warm cream white |
| Fairy wings | `0xd4bfff` | Soft lavender |
| Fairy sparkles | `0xffffff` | Pure white |
| Corrupted base | `0x1a0f2e` | Very dark purple-black |
| Corrupted eyes | `0xff3344` | Angry red glow |
| Healed chaser | `0xff9b5e` | Warm friendly orange |
| Healed ranger | `0x7ec8ff` | Calm crystal blue |

### UI
| Element | Hex | Description |
|---------|-----|-------------|
| Health full | `0xff7088` | Soft warm pink |
| Health empty | `0x4a3555` | Dim purple-gray |
| UI frame | `0x8b7daa` | Muted crystal purple |
| UI text | `0xffeedd` | Warm cream |
| UI text dim | `0x9988aa` | Muted lavender |

---

## Key Decisions

1. **Cozy retro art style** — 32x32 pixel art, warm palette, chunky pixels, no shader effects
2. **Fairy protagonist** — small winged creature with sparkle trail, big eyes, expressive states
3. **Rainbow particle beam** — tight sparkly stream of 4-6 square particles cycling through soft rainbow colors
4. **Dark-to-colorful enemy transformation** — corrupted enemies are shadowy; healing reveals their true colorful form
5. **Spiral wrap heal effect** — rainbow cocoon spirals around enemy, shatters to reveal healed form
6. **Crystal cavern environment** — warm purple-brown stone with embedded crystal accents and golden doors
7. **Ornate crystal-frame HUD** — gem-themed health segments, rainbow power meter with crystal borders
8. **Design-first approach** — all visuals documented now, implemented during Phase 4 (sprites & polish)
9. **3-4 frame animations** — smooth enough to feel polished, manageable art workload
10. **Large corrupted creature boss** — multi-cell sprite, dramatic dark-to-colorful transformation
11. **Particle system: scene-scoped first, extract later** — build beam particles in-scene, extract to engine once the pattern repeats across effects

---

## Resolved Questions

1. **Sound design:** Separate brainstorm later — audio deserves its own session.
2. **Animation frame count:** 3-4 frames per animation. Smooth motion, moderate art effort.
3. **Boss visual:** Large corrupted creature (e.g., corrupted dragon or bear). Multi-cell sprite (2x2 or 3x3). Dark shadowy form healed into a majestic colorful creature.
4. **Particle system scope:** Start scene-scoped (helpers in DungeonCrawlerScene), then extract to a reusable engine `ParticleSystem` once the pattern is clear across beam, sparkle trail, heal spiral, and dissolve effects.

---

## Open Questions

_(None remaining — all questions resolved.)_
