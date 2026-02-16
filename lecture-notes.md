# Lecture Notes - Using Claude in a Real Project

## 1. Recap: Text in, text out

So last week we spent the day building an intuition for what Claude actually is.
Let's quickly rehash the key ideas.

At the foundation, we have a language model — a magic box.
Text goes in, text comes out.

No matter what fancy terms people use, what systems or interfaces get built on top, it's fundamentally text in, text out.

## 2. Recap: The conversation simulation

And we saw how to turn that into a conversation.

The trick is, every time we want the next reply, we pass the whole conversation so far back in as input.
It's still just text in, text out — we're just building up the input each time to simulate an ongoing conversation.

## 3. Recap: The harness

And then we saw how Claude Code works as a harness — a program that watches for tool calls in the model's output, performs those actions on the computer, and feeds the results back into the conversation.

That's how the model goes from just chatting to actually driving your computer — reading files, writing files, running commands.

## 4. But how do you apply this to a real project?

So we've learned what Claude is, we've experimented with it in our Claudebooks, we've built some intuition.

But we haven't really explored how you take this thing and apply it systematically to a real software engineering project.
That's what today is about.

## 5. The key principle: Don't gamble

The key principle of what we're doing here is we're not gambling.

And to understand what I mean by that, it's worth talking about what gambling really is.

## 6. What is gambling?

Why do people get addicted to gambling?

Anytime you have a system where you take an action and the reward you get back is unpredictable — sometimes it's high reward, sometimes it's low reward, sometimes it's medium reward — but you don't know what you're going to get out every time you put some input in, that triggers this brain circuitry that produces the experience of gambling.

This can be a really, really deeply addictive circuitry.

## 7. Gambling is everywhere

Slot machines function this way.
Internet feeds function this way.

You're pulling the slot machine lever or you're swiping up through the feed, and you don't know if you're going to get a hit or a miss.

You're going to get dopamine from a reward — like finding the right piece of content on the internet, or getting straight sevens in a slot machine — or you're going to get nothing.

And so you develop a compulsion to pull that lever.

## 8. You don't control the outcome

But crucially, you don't control the outcome.

The system has baked-in odds.
You pull the lever and you hope.
You're at the mercy of the machine.

## 9. Using Claude naively is gambling

Using Claude naively is like gambling.

You create a prompt.
You don't know if it's going to be the right prompt or the wrong prompt.
You don't know if it's going to give Claude the context it needs, or if it's going to cause Claude to find the context it needs.

And depending on how good the model is and how easily it can find what it's looking for in your existing repo, you're kind of just playing odds with the model.

## 10. If you can't predict the output, you're not in control

Now as models get increasingly better, you're more likely to get good outcomes.
But then you also raise the difficulty ceiling to something where the model still performs variably depending on the prompt or the context.

So you get this situation where you're always chasing the winning hand — how do I get Claude to produce something good again?

This feedback loop can be productive.
But just notice that you might feel a compulsion toward building without necessarily being able to predict your quality of output.

And if you can't predict your quality of output, you're not really in control of whether you deliver a project well, quickly, or to the right constraints, or with the right bar of quality for the project you're creating.

So how do we change that?

## 11. How do you bend the odds?

So what we're going to talk about is how do you bend the odds in your favor?

How do you basically get predictably good output from Claude in the context of complex software engineering projects?
How do you steer Claude towards your goals in an effective way without just rolling the dice?

## 12. Principles first, systems second

We're going to look at a specific system that was developed by a team that's been shipping production code this way for months.

But more importantly, we're going to look first at the principles behind that system.

There are four key ideas that make the whole thing work:
- Context is your only lever
- Compaction turns noise into signal
- Sub-agents keep your context clean
- Human attention belongs at the top of the pipeline

Just like we understood language models from first principles up, we don't want you to just have to accept other people's views of the world.
We want you to have a deep understanding of these principles so that you can evaluate different approaches and even potentially invent your own.

## 13. Principle 1: Context is the only lever

So remember from last week — each turn of the model is a stateless function call.
The model doesn't remember anything between turns.
The only thing it sees is whatever is in the context window right now.

That means the context window is the only lever you have for affecting the quality of what comes out.
There's no other knob to turn.

If you want better output, you need better input.
That's it.

## 14. So what threatens your context?

So if context is the only lever, what actually threatens it?
What fills up that context window?

Every action the model takes consumes context:
- Searching for files
- Reading and understanding code
- Applying edits
- Running tests and getting back build logs
- Big JSON blobs from tool results

All of this accumulates in the context window.

And most of it is noise.
It was useful to the model in the moment it needed it, but once that step is done, it's just dead weight taking up space and making it harder for the model to focus on what matters next.

## 15. Principle 2: Compaction turns noise into signal

So this is where compaction comes in.

Compaction means pausing to distill everything you've learned so far into a clean, structured artifact — and then starting fresh.

Instead of dragging all that search noise and failed test output and file contents forward through the conversation, you write down what matters:
- What you found
- Where you are
- What's left to do

And you carry that compact summary into a new context.
The model goes from working with a cluttered, noisy context to working with a clean, dense one.

In practice, what "starting fresh" means is you end the current conversation, start a new one, and load only the compact artifact — the document you wrote.

The goal is to keep context utilization in the 40-60% range.
If you're filling the window to 90% before you even start making changes, you don't have room for the model to think and iterate.

## 16. Principle 3: Sub-agents keep your context clean

Sub-agents are another way to manage context.

A sub-agent gets its own fresh context window.
You can send it off to search, read files, explore the codebase — all of that messy searching happens in the sub-agent's context, not yours.

When it comes back, it returns a structured summary of what it found.

So the parent agent stays clean.
It never had to wade through all those search results and file contents.
It just gets the compacted findings.

This is the same principle as compaction, but applied at the architecture level — keeping the primary working context clean by offloading exploration to separate contexts.

## 17. The three-phase workflow

So those first three principles — context is your only lever, compaction turns noise into signal, sub-agents keep context clean — they lead to a natural workflow structure: research, plan, implement.

**Research** — Understand the codebase.
Find the relevant files, map the information flow, figure out what's going on.
Then you compact that into a research document.

**Plan** — Outline exact steps.
Which files to edit, how to verify each change.
Then you compact that into a plan.

**Implement** — Step through the plan.
For complex work, you compact progress after each phase.

Each transition between phases is a compaction point — you start with a fresh context loaded with only what matters for the next stage.

## 18. Principle 4: Human attention belongs at the top

Here's a really important principle about where you spend your attention.

Bad code is bad code — one function, maybe a few lines.
But a bad plan spawns hundreds of lines of bad code.
And bad research can generate thousands of lines of bad code, because the whole plan is built on wrong assumptions.

So the highest-leverage place to focus your human review is on the research and the plan — not the implementation.

A small correction at the research stage has a much bigger downstream impact than catching a bug in the code.
This doesn't mean you ignore the code, but it means you front-load your attention where it matters most.

## 19. A system built on these principles

So we've set up a workflow system in this repo that puts all of these principles into practice.

It expands the three-phase pattern we just talked about — research, plan, implement — into five phases.

Brainstorm captures your intent before planning starts.
Compound captures what you learned after you're done.

And notice that there's no separate "research" phase in the five — that's because research gets absorbed into the plan phase.
The sub-agents do the research as part of planning.

Each phase is a command you can run.
Let's walk through each piece.

## 20. Brainstorm: Clarify WHAT to build

The first command is `/workflows:brainstorm`.

Before you write any code, before you even think about implementation, you figure out what you're actually building.

When you run this, Claude asks you questions — one at a time — to understand your intent.
Together you explore a few different approaches with trade-offs.
And at the end, it produces a brainstorm document that captures your decisions.

This connects directly to the principle that better input produces better output.

If you skip this step and jump straight to coding, the model is guessing at your intent.
And what is guessing? It's gambling.
You're hoping the model reads your mind.

The brainstorm phase eliminates that gamble by making your intent explicit.

## 21. Plan: Define HOW to build it

Next is `/workflows:plan`.

This is where the sub-agent principle really comes to life.

When you run plan, Claude sends out multiple sub-agents in parallel:
- A **repo researcher** that scans your codebase for existing patterns
- A **learnings researcher** that checks if you've solved similar problems before
- Optionally a **best-practices researcher** that looks up external documentation

Each of these sub-agents runs in its own fresh context window.
They do all the messy searching and reading, and they return compacted summaries back to the parent.

The parent agent then synthesizes all of that into a structured implementation plan with exact steps, files to edit, and verification criteria.

This is compaction in action — all that research noise gets distilled into a clean plan document.

## 22. Work: Execute the plan

Then you run `/workflows:work`.

Claude reads the plan and works through it step by step:
- Creates a task list from the plan
- Implements each task following existing patterns in the codebase
- Verifies each step as it goes
- Checks off steps in the plan document
- Commits incrementally

This is the "design your workflow around context" principle in practice.

The plan is a compact artifact — Claude starts with a clean context loaded with exactly what it needs to execute.
It's not dragging hours of accumulated conversation noise forward.
It's starting fresh, with a dense summary of what to do and how to do it.

## 23. Review & Compound: Close the loop

After implementation, there are two more phases.

`/workflows:review` runs a multi-agent code review — it spawns specialized reviewers that analyze your changes from different angles and produce findings ranked by severity.

`/workflows:compound` documents what you learned.
When you solve a problem, you capture it:
- The symptoms
- The investigation
- The root cause
- The solution
- How to prevent it next time

That documentation goes into a knowledge base.

And here's the compounding part: the next time you run `/workflows:plan`, the learnings researcher sub-agent searches that knowledge base.

So the first time you solve a problem, it's research.
The second time, it's a lookup.
Your knowledge compounds over time.

## 24. Where you come in

But this is not autopilot.
You are the driver.

- You guide the brainstorm — Claude asks the questions, but you make the decisions
- You review the plan — this is your highest-leverage moment, where catching a wrong assumption saves hundreds of lines of bad code downstream
- You review the output — is this what you wanted? Does it meet your bar?

The system handles the context management, the sub-agents, the compaction.
Your job is to steer at the decision points that matter most.

## 25. Today's project

So today we're going to put all of this into practice.

This repo contains a working Snake game.

Your mission is to transform it into a completely different game using this workflow.

You're going to brainstorm what game you want to build, plan how to transform the existing code, and then execute that plan — all using the commands we just walked through.

## 26. How to start

Here's how to get started:

1. **Explore the repo** — read the code, understand what exists
2. **`/workflows:brainstorm`** — decide what game to build
3. **`/workflows:plan`** — let Claude research the codebase and create an implementation plan
4. **Review the plan** — read it, is the approach right? Are the steps sensible? This is your highest-leverage moment
5. **`/workflows:work`** — execute the plan
6. **Iterate** — review, compound what you learned, keep going

Don't gamble. Drive.

## 27. While Claude is working

One last thing — some of these steps, especially plan and work, take a while to run.
Claude might be crunching for a few minutes.

You don't have to sit and watch.
Open a new terminal tab, start a new Claude conversation, and use that time productively.

Ask Claude questions about the workflow system, the commands, how things are set up in this repo — explore the codebase, think about your game design.
Claude can be working for you in one tab while you're learning in another.
