---
name: superpowers-cowork
description: |
  Superpowers-style structured development methodology for Cowork. Enforces a disciplined 7-phase workflow:
  Brainstorm → Spec → Plan → Implement → Review → Test → Finalize.

  Uses multi-agent orchestration (up to 50 AI agents in parallel), test-driven development,
  mandatory planning before coding, and systematic code review.

  MUST trigger when:
  - User asks to build, develop, or implement any feature or project
  - User says "superpowers", "체계적으로", "제대로 만들어줘", "프로답게"
  - Any coding task that involves more than a single file change
  - Building new pages, components, features, or full applications
  - Refactoring, migration, or architectural changes
  - "이거 제대로 해줘", "완벽하게 만들어줘", "프로덕션 퀄리티로"
  - Any task where the user expects production-quality results

  Do NOT trigger for simple questions, quick fixes, or single-line changes.
---

# Superpowers for Cowork

A structured development methodology adapted from the Superpowers framework (93K+ GitHub stars).
This skill transforms Claude from a reactive assistant into a disciplined senior developer
who follows a proven process for every non-trivial task.

## Core Philosophy

The reason this methodology exists is that AI agents, when left unconstrained, tend to take shortcuts:
skipping planning, writing code without tests, making changes without reviewing impact.
These shortcuts feel faster but create bugs, regressions, and technical debt.

This skill enforces discipline — not through rigid rules, but by making each phase feel natural
and valuable. Every phase exists because skipping it has caused real problems.

## The 7-Phase Workflow

Every non-trivial task follows these phases. You may skip phases only when genuinely unnecessary
(e.g., a pure refactor doesn't need brainstorming), but document why you skipped.

### Phase 1: Brainstorm 🧠

Before touching any code, understand the problem space.

**What to do:**
- Restate the user's request in your own words to verify understanding
- Identify 2-3 possible approaches with tradeoffs
- Surface edge cases and potential problems early
- Ask clarifying questions if the requirements are ambiguous

**Why this matters:** Jumping straight to code is the #1 cause of wasted work.
A 2-minute brainstorm prevents 20-minute rewrites.

**Output:** A brief summary of the approach you'll take and why.

### Phase 2: Spec 📋

Define what "done" looks like before you start building.

**What to do:**
- List the specific deliverables (files to create/modify)
- Define acceptance criteria — what must be true when you're finished
- Identify dependencies and potential blockers
- Note any user preferences from conversation history

**Why this matters:** Without a spec, you're building toward a moving target.
The spec is your contract with the user.

**Output:** A clear, concise spec that the user could review.

### Phase 3: Plan 📐

Break the spec into ordered, executable steps.

**What to do:**
- Create a TodoList with specific, actionable items
- Order tasks by dependency (what must happen first)
- Identify which tasks can run in parallel via subagents
- Estimate complexity — simple tasks inline, complex tasks get subagents
- Plan verification steps between phases

**Agent allocation strategy:**
- 1-2 files changing → Work inline, no subagents needed
- 3-5 files changing → 2-3 parallel subagents
- 6+ files changing → Up to 50 subagents, organized by domain
- Always reserve 1 agent for final verification

**Why this matters:** A good plan lets you parallelize work safely.
Bad plans cause merge conflicts, duplicated work, and missed edge cases.

**Output:** TodoList populated with all tasks.

### Phase 4: Implement 🔨

Execute the plan. This is where subagents shine.

**Rules:**
- Follow the plan. If you discover the plan needs changing, update it first.
- Each subagent gets a clear, self-contained task description
- Include relevant context in each subagent prompt (file paths, conventions, constraints)
- Use `isolation: "worktree"` for subagents that modify files to prevent conflicts
- Commit frequently with clear, English-only messages
- Author: `FunS Team <>`

**Subagent prompt template:**
```
Task: [specific task]
Files to modify: [list]
Context: [relevant conventions, patterns, constraints]
Acceptance criteria: [what "done" looks like]
Save outputs to: [path]
```

**Why this matters:** Clear task boundaries prevent agents from stepping on each other's work.

### Phase 5: Review 🔍

Never ship without reviewing. Every change gets checked.

**What to do:**
- Read through all modified files
- Check for: consistency, edge cases, security issues, broken links
- Verify the changes match the spec from Phase 2
- Look for things subagents might have missed (cross-file consistency, naming conventions)
- Run a verification subagent if the changes are large

**Review checklist:**
- [ ] All acceptance criteria from spec are met
- [ ] No personal information exposed (emails, usernames, paths)
- [ ] No hardcoded values that should be configurable
- [ ] Consistent naming and style across all files
- [ ] All links and paths are correct
- [ ] No leftover debug code or TODO comments

**Why this matters:** Subagents work independently and can't see each other's output.
Review catches inconsistencies between parallel work streams.

### Phase 6: Test ✅

Verify everything works before declaring done.

**What to do:**
- For web projects: check all pages load, all links work, responsive layout
- For code: run existing tests, write new tests for new functionality
- For data: validate outputs against expected results
- Use a fresh subagent for testing (it has no context bias from implementation)

**Testing strategy by project type:**
- **Static websites:** Grep for broken links, validate HTML structure, check all images exist
- **Scripts/tools:** Run with sample inputs, verify outputs
- **Documents:** Review formatting, check all sections present

**Why this matters:** The implementer is the worst tester — they know what the code is
supposed to do and unconsciously avoid the paths that break.

### Phase 7: Finalize 🎯

Wrap up and communicate results clearly.

**What to do:**
- Summarize what was done and what changed
- Report agent utilization (how many agents, what each did)
- Provide any necessary follow-up items
- Push to appropriate repository (test or production per deployment rules)
- Present the final result with a link if applicable

**Output format:**
```
## Completed
- [summary of changes]

## AI Agent Report
- Agent 1: [task] — [result]
- Agent 2: [task] — [result]
...

## Next Steps (if any)
- [follow-up items]
```

## Key Principles

### YAGNI (You Aren't Gonna Need It)
Don't build features the user didn't ask for. Don't add "nice to have" extras
unless the user explicitly requests them. Scope creep is the enemy of shipping.

### DRY (Don't Repeat Yourself)
If you find yourself writing the same code/content in multiple places, extract it.
Shared CSS goes in common.css. Shared JS goes in common.js.

### Fail Fast
If something isn't working, say so immediately. Don't try 10 different approaches
silently — tell the user what's happening and propose alternatives.

### Fresh Eyes for Verification
Use a separate subagent for testing/review when possible. An agent that wrote the code
is biased toward thinking it works. A fresh agent will catch things the implementer missed.

### Communicate Progress
Use TodoList actively. Update task status in real-time. The user should always know
what's happening without having to ask.

## Deployment Rules

Follow the project's CLAUDE.md deployment rules. Typical pattern:
- Default: push to internal test (funs-platform)
- Production: only when user explicitly requests ("홈페이지에 업데이트해줘", "프로덕션 배포해줘")
- Never push to production without explicit approval

## Git Conventions

- **Commit messages:** English only, concise, descriptive
- **Author:** `FunS Team <>`  (anonymous)
- **Command:** `git -c user.name="FunS Team" -c user.email="" commit -m "message"`
- Never include Korean in commit messages
- Never expose personal information in commits
