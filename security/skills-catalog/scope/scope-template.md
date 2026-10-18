Reference shapes for writing the scope and the completion report. Rules live in `SKILL.md`.

## What keeps it readable (the format rules)

- **Two parts:** a slim **At a glance** table for a quick scan, then **the plan** as clean feature sections grouped by phase. Build order is just the section order. There is no separate "build order" list to keep in sync.
- **Clean headings.** A heading is `### <N>. <Feature name>` plus a short status word and short tags **only when they carry real information** (`needs a decision`, a per feature approach override, a workflow tier override like `· GA`). Never a pipe delimited metadata row like `Title | P0 | inherit | …`.
- **Each fact has an owner.** PLAN holds intent, tasks, pointers, and a summary status. STATE holds detailed progress, execution evidence, and blocks. Reconcile their status summaries without duplicating decisions.
- **Only what is set.** No `n/a`, no `inherit`, no empty fields. A pointer line (`spec <n> · code in <path>`) appears **only once those exist**: the spec link added by `/architect` at capture, the code path by `/develop`.
- **A feature grows a defined shape.** It has a one or two line **intent**, a single **Done when:** line (the acceptance criteria seeds), and **checkbox steps**. A **not yet designed** feature has **one box** (its entry command: `/architect` when it `needs a decision`, else `/develop`, or `/audit` for standards & tooling). **When its spec is captured, `/architect` fills in the built ready shape:** `Design it` (ticked) → `Build it: /develop <feature>` with **2 to 5 milestone sub items rolled up from the spec** → `Verify it: /check verify <feature>` → `Review it: /check review <feature>` → `Audit security: /security <feature>` → `Test it: /test <feature>` → `Document it: /document pr` → `Sync it: /sync`. **The atomic build tasks stay in the spec's `## Build plan`, never here**. The scope carries only the milestone rollup. The next step is always the first unticked box.

## Single file scope

```markdown
# Scope: <Product name>

<One or two plain sentences: what the product is and who it serves.>

**Build approach:** <Tracer Bullet | Skateboard | Facade | Journey> (<one-line principle>).
**Workflow:** <Prototype | Alpha | Beta | GA>, the depth of design and validation. All tiers retain the local required stages and the Accepted spec prerequisite.

_The local gates in AGENTS.md and docs/workflow/governance.md apply. A tier does not waive a gate; Done requires applicable execution evidence._

## At a glance

| #   | Feature                       | Phase      | Status      |
| --- | ----------------------------- | ---------- | ----------- |
| 1   | Stack & architecture          | Foundation | in-progress |
| 2   | Coding standards & tooling    | Foundation | planned     |
| 3   | Data model                    | Foundation | in-progress |
| 4   | Design system & UI foundation | Foundation | planned     |
| 5   | Core standup loop             | Slice 1    | planned     |
| 6   | Daily reminders               | Slice 2    | planned     |
| …   | …                             | …          | …           |

## Foundations

### 1. Stack & architecture · in-progress

Decide the stack and scaffold a runnable project so every later slice builds on real structure.
**Done when:** the stack is recorded in a spec and the empty scaffold boots locally and passes build.

- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [ ] Verify it runs: `/check verify stack`
- [ ] Review it: `/check review stack`
- [ ] Audit security: `/security stack`
- [ ] Test it: `/test stack`
- [ ] Document it: `/document pr`
- [ ] Sync it: `/sync`
      Spec 0001 · code in `./`

### 2. Coding standards & tooling

Capture conventions, then install lint, format, and pre-commit enforcement from the real scaffolded project.
**Done when:** root `AGENTS.md` reflects the real stack, and lint/format/pre-commit run clean.

- [ ] Capture conventions + tooling choices: `/audit`
- [ ] Install the tooling: `/develop tooling`
- [ ] Verify it: `/check verify tooling`
- [ ] Review it: `/check review tooling`
- [ ] Audit security: `/security tooling`
- [ ] Test it: `/test tooling`
- [ ] Document it: `/document pr`
- [ ] Sync it: `/sync`

### 3. Data model · in-progress

<!-- DESIGNED: /architect captured spec 0002 and filled in the shape below. The 2 to 5 boxes under
     "Build it" are a ROLLUP of the spec's ## Build plan: every table, column, and policy lives in
     the spec, NOT here. This is what a feature looks like right after its spec is captured. -->

Core entities every feature builds on: users, teams, memberships, standup entries, template.
**Done when:** entities and relationships support later slices (reminders, templates, history) without a breaking migration.

- [x] Design it (spec): `/architect data model`
- [ ] Build it: `/develop data model`
  - [ ] Schema + constraints: tables, keys, unique/check, cascades (AC-01..6)
  - [ ] Row-level security: per-table policies + helpers (AC-07..9)
  - [ ] Apply migration, confirm live, generate types (AC-01..9)
- [ ] Verify it: `/check verify data model`
- [ ] Review it: `/check review data model`
- [ ] Audit security: `/security data model`
- [ ] Test it: `/test data model`
- [ ] Document it: `/document pr`
- [ ] Sync it: `/sync`
      Spec 0002 · code (filled by /develop)

### 4. Design system & UI foundation · needs a decision

Visual language, layout primitives, and base components so the flows feel cohesive and accessible.
**Done when:** `design.md` covers type/color/spacing/components, and base components handle focus and keyboard.

- [ ] Design it (spec): `/architect design system & UI foundation`

## Slice 1: Core standup loop

### 5. Core standup loop · needs a decision

Sign in, create a team, submit today's update on the default template, read the team feed. Nothing else yet. This slice is the walking skeleton.
**Done when:** a user can sign in, create a team, submit one standup a day, and see the team's updates for today.

- [ ] Design it (spec): `/architect core standup loop`

## Slice 2: Daily reminders

### 6. Daily reminders · needs a decision

Nudge members who have not submitted before a team cutoff, so daily standup becomes a habit.
**Done when:** unsubmitted members get a timezone-aware reminder before cutoff, and submitters are not nagged.

- [ ] Design it (spec): `/architect daily reminders`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Email invites**: invite teammates by email · needs a decision
- **Billing & plans**: free and paid tiers · needs a decision · GA
- **Chat integrations**: post standups to team chat · needs a decision
- **Product analytics**: measure signups and habit · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State                        | Set by                      | The feature shows                                                                                                         |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `planned` · needs a decision | `/scope`                    | one box: `Design it (spec): /architect <feature>`                                                                         |
| `in-progress` (designed)     | `/architect` after approval | Accepted spec linked; build milestones plus verify, review, security, test, document, and sync boxes; STATE records Ready |
| `in-progress` (building)     | `/develop`                  | milestone sub-boxes tick one by one; code pointer filled                                                                  |
| `in-progress` (verified)     | `/check verify`             | `Build it` + milestones ticked; `Verify it` ticked                                                                        |
| `done`                       | `/sync`                     | All applicable required gates have current passing evidence; STATE records Done with links                                |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first. Otherwise develop may reuse an existing Accepted spec with complete sources; missing approval still blocks.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** changes depth for that feature, never the required gates or evidence criteria.
- **Workflow** (header line) sets depth, not a different gate chain. All features follow develop, verify, review, security, test, document, and sync after their spec is Accepted.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
```

## Brownfield enrollment

Already built features are enrolled **for context**, above the planned ones, with status `existing` (complete, no task list) or `in-progress` (partial, finish via `/develop`), each with a code pointer. They also appear in the At a glance table.

```markdown
### A. Auth · existing

Pre-workflow auth: sign in, sessions, reset. code in `src/auth/`

### B. Product catalog · in-progress

Partial catalog; finish the remaining pieces via /develop. code in `src/catalog/`
```

`existing` is not `done`: it predates the workflow, so `/develop` and `/sync` leave it alone.

## Large product: epic split

Keep `docs/scope/PLAN.md` as the canonical entry. If needed, move detailed feature sections to epic files and link them from PLAN without renaming it. Each workspace may have its own PLAN linked from the root PLAN.

## Completion report block

Lead with what the pass produced and the first step; the approach, tier, and full list are in the scope file itself (per `docs/workflow/conventions.md`). Template:

```
## /scope <plan | replan | add> · <product, one line>

**<N> features planned (<M> already on the scope, <K> deferred), build approach <name>, workflow <tier>.**
Next: /clear, then <the first unticked box, usually `/architect <first feature>`, or `/audit` if a brownfield repo has no root AGENTS.md>
Heads up: <a feature bumped to a higher tier, a `needs a decision` foundation, or a genuine risk>   (omit if none)
Scope written to <docs/scope/PLAN.md>.
```

_Context hygiene: the scope, the specs, and `AGENTS.md` are the durable state, so the workflow hands off through files, not the chat. Advise `/clear` between units (after `/scope`, after each `/architect`, between features) and `/compact` mid unit if one run gets long. On Claude Code use `/clear` / `/compact`; use your agent's fresh session equivalent elsewhere._
