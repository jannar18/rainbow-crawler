# Compound Engineering System

A workflow system for Claude Code that makes each unit of engineering work make the next one easier.

The idea: when you solve a problem, document it. When you plan a feature, check what you've already learned. Over time, your project accumulates institutional knowledge that speeds up every future task.

## How It Works

There are 5 workflow commands that form a pipeline. You don't have to use all of them, and you don't have to use them in order, but they're designed to flow into each other:

```
brainstorm → plan → work → review → compound → feeds back into future plans & reviews
```

### The Pipeline

**`/workflows:brainstorm`** — Explore what to build. Asks questions to clarify your idea, explores 2-3 approaches, and writes a brainstorm document to `docs/brainstorms/`. Good for when you have a vague idea and want to think it through before committing to a direction.

**`/workflows:plan`** — Turn an idea into a structured plan. Reads any prior brainstorm, searches `docs/solutions/` for relevant past learnings, and produces a plan document in `docs/plans/` with checkboxes for each task. The plan becomes a living document — checkboxes get checked off as work progresses.

**`/workflows:work`** — Execute a plan. Takes a plan file as input, reads it, asks clarifying questions, then works through each task. Creates a branch, makes incremental commits, checks off tasks in the plan file, runs tests, and opens a PR when done.

**`/workflows:review`** — Review a PR or branch. Spawns multiple specialist agents in parallel to analyze the code, then synthesizes all findings into todo files in `todos/`. Each finding gets a severity level (P1/P2/P3) and a structured write-up with proposed solutions.

**`/workflows:compound`** — Document a solved problem. After you fix something non-trivial, this captures the problem, what you tried, what worked, and why — then files it in `docs/solutions/` with searchable metadata. This is the "compounding" part: future plans and reviews automatically search these docs.

## File Structure

```
.claude/
├── commands/workflows/          # The 5 workflow commands
│   ├── workflows:brainstorm.md
│   ├── workflows:plan.md
│   ├── workflows:work.md
│   ├── workflows:review.md
│   └── workflows:compound.md
├── subagents/                   # Specialist agents spawned by workflows
│   ├── repo-research-analyst.md   # Scans codebase for patterns (used by brainstorm, plan)
│   ├── learnings-researcher.md    # Searches docs/solutions/ for past learnings (used by plan, review)
│   └── code-simplicity-reviewer.md # Flags over-engineering and YAGNI violations (used by review)
└── skills/                      # Reusable process knowledge
    ├── brainstorming/SKILL.md     # Question techniques, approach exploration
    ├── document-review/SKILL.md   # Structured document refinement
    ├── file-todos/                # Todo file management
    │   ├── SKILL.md
    │   └── assets/todo-template.md
    └── compound-docs/             # Solution documentation capture
        ├── SKILL.md
        ├── schema.yaml              # YAML frontmatter validation schema
        ├── references/yaml-schema.md
        └── assets/
            ├── resolution-template.md       # Template for solution docs
            └── critical-pattern-template.md # Template for critical patterns

docs/
├── brainstorms/          # Output from /workflows:brainstorm
├── plans/                # Output from /workflows:plan
└── solutions/            # Output from /workflows:compound
    └── patterns/
        └── critical-patterns.md  # Must-know patterns (checked every time)

todos/                    # Output from /workflows:review (one file per finding)

compound-engineering.local.md  # Config: which review agents to run
```

## How the Pieces Connect

### Agents

Agents are specialist subprocesses that get spawned by the workflow commands. They run in parallel, do their analysis, and return results to the main workflow.

| Agent | Used By | What It Does |
|-------|---------|-------------|
| `repo-research-analyst` | brainstorm, plan | Scans the codebase for existing patterns and conventions |
| `learnings-researcher` | plan, review | Searches `docs/solutions/` for relevant past problems and solutions |
| `code-simplicity-reviewer` | review | Reviews code for unnecessary complexity, YAGNI violations |

### Skills

Skills are process knowledge — not agents, but instructions that workflows reference for how to do specific things.

| Skill | Used By | What It Does |
|-------|---------|-------------|
| `brainstorming` | brainstorm | Techniques for exploring ideas, YAGNI principles |
| `document-review` | brainstorm, plan | How to review and refine a document |
| `file-todos` | review | How to create and manage todo files in `todos/` |
| `compound-docs` | compound | How to capture a solved problem as structured documentation |

### The Knowledge Loop

The system gets smarter over time through this loop:

1. You solve a problem during `/workflows:work`
2. You run `/workflows:compound` to document it in `docs/solutions/`
3. Next time you run `/workflows:plan`, the `learnings-researcher` agent finds that documentation and incorporates it into the plan
4. Next time you run `/workflows:review`, the same agent checks if any findings match known patterns

The `docs/solutions/patterns/critical-patterns.md` file is special — it contains patterns so important that the `learnings-researcher` agent checks it every single time, regardless of what it's searching for.

## Configuration

The file `compound-engineering.local.md` controls which review agents run during `/workflows:review` and `/workflows:work`:

```yaml
---
review_agents: [code-simplicity-reviewer]
---
```

To add more review agents, create the agent file in `.claude/subagents/` and add its name to this list. The markdown body of this file is passed to all review agents as additional context — use it for project-specific instructions like "we care about frame rate" or "our API is public, scrutinize inputs."

## Quick Start

```bash
# Brainstorm an idea
/workflows:brainstorm "multiplayer lobby system"

# Turn it into a plan
/workflows:plan "implement the lobby system from the brainstorm"

# Execute the plan
/workflows:work docs/plans/2026-02-15-feat-lobby-system-plan.md

# Review the resulting PR
/workflows:review 1

# Document what you learned
/workflows:compound "solved the websocket connection issue"
```

You can enter the pipeline at any point. Have a clear plan already? Skip brainstorm. Just want to review a PR? Start with review. Just fixed a tricky bug? Jump straight to compound.
