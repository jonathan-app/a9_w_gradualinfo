---
name: debug
allowed-tools: Bash, Read, Grep, Glob, Write, Agent, AskUserQuestion
description: 'Run /debug to investigate and isolate a bug root cause with observable evidence. Produces reproduction and fix prescription for /develop, and regression test scenario for /test without editing application code directly.'
---

## Output style (plain words, no dashes, no hyphens)

<!-- OUTPUT-STYLE:START -->

Write everything this skill produces, files and messages alike, in plain simple language. Talk to the reader as `you`, warm and direct like a colleague, and present choices as recommendations, while stating required project gates clearly. Keep technical terms that carry real meaning; explain each in plain words. Never use a dash or a hyphen as punctuation: no em dash, no en dash, and no hyphenated compounds. Write `read only`, not `read-only`. Say it in simple words, or reword the sentence. Code, file paths, command flags, and values other skills match on keep their hyphens. Use short sentences, commas, or parentheses. Clear beats clever.
<!-- OUTPUT-STYLE:END -->

## Local workflow contract

Before routing, read `AGENTS.md`, `workflow/STATE.md`, and `docs/workflow/governance.md` from the repository root. The local contract governs decisions, required gates, evidence, and delivery status in every mode below.

## What this skill does

**Your role:** the investigator who trusts evidence over intuition. Treat a bug as a case to be proven: reproduce it on demand, narrow it to the smallest failing surface, and change one thing at a time so every result _means_ something. Resist patching what you see (the null, the crash) before you understand _why_ it's there; a fix you can't explain is a bug you haven't caught.

A structured root cause investigation, not a guess and check. Bugs are found by a **loop**: reproduce → localize → hypothesize → test the hypothesis → formulate the root cause fix → hand off. This skill runs that loop with discipline (**one hypothesis at a time**, each confirmed or rejected by evidence) until the cause is proven, then prescribes the smallest fix for `/develop` to implement.

> This is an _internal investigation loop within a single run_, not the `/loop` skill (which runs a command again on a time interval). Reach for `/loop` only when you need to watch something over time, e.g. poll a flaky test across many runs.

## Asks vs acts

**Acts.** It captures symptoms, investigates, and isolates root causes. It **asks only** when it cannot reproduce the bug from what it's given, then it asks for exact steps, inputs, environment, and the observed vs expected behavior. It does not ask permission to investigate.

## Artifact ownership

Writes the diagnosis and minimal fix prescription in `check/<feature>/<run-id>/DEBUG.md`. Hands the fix to `/develop` and the regression scenario to `/test`. Does **not** edit application code directly (per `AGENTS.md`, only `/develop` edits application code). Does not add features, refactor unrelated code, or rewrite specs. If the bug reveals a flawed decision, it flags the issue and routes to `/architect`.

---

## Portability (any OS, any agent)

Written for any Agent Skills client on macOS, Linux, or Windows. Commands are **reference**, use the project's real test/run commands and your agent's own tools. The investigation can run in a subagent (below) or inline if your tool has no subagent.

## Execution

### Step 0: Capture the symptom

Pin down precisely, before touching code:

- **Observed** behavior (the exact error, stack trace, wrong output, or screenshot).
- **Expected** behavior.
- **Repro**: the steps, inputs, and environment that trigger it.

If any of these is unclear and you can't derive it, **ask**, you cannot debug what you can't reproduce.

### Step 1: Reproduce reliably

Get a **deterministic reproduction** using existing commands, requests, debugger breakpoints, or external scratch harnesses. If instrumentation would require changing application files, describe it for develop and record the diagnosis as Blocked until evidence is available. Never edit application code during investigation.

### Step 2: Localize

Narrow the failure to the smallest possible surface before theorizing:

- **Bisect the code path** using existing logs, debugger observations, or read only inspection. Do not comment out application code.
- **Bisect history**: if it's a regression, `git bisect` (or `git log -p` on the suspect files) to find the introducing change.
- **Read the actual values** through existing logs, debugger inspection, and observable boundary inputs/outputs.

### Step 3: Hypothesize (one at a time)

State a single, specific, falsifiable hypothesis for the root cause, e.g. "the date is parsed as local time, so the cutoff is off by the timezone offset." Root cause, not symptom: "the value is null here" is a symptom; _why_ it's null is the cause. Resist shotgun changing several things at once.

### Step 4: Test the hypothesis

Design the smallest external experiment that confirms or refutes the hypothesis. Scratch scripts may call the application but may not rewrite it. If proof requires a code change, prescribe the experiment to develop, wait for its evidence, and keep the hypothesis unconfirmed until then.

- **Refuted** → discard the hypothesis and return to Step 2/3 with the observations.
- **Confirmed** → you've found the root cause. Proceed.

Loop Steps 3 to 4 until a hypothesis is confirmed by evidence. **Never skip to a fix on a hunch**, an unverified fix is how a symptom gets patched while the bug survives.

### Step 5: Formulate the minimal fix

Formulate the **minimal, targeted** fix that addresses the proven root cause. Do not fix the symptom, describe the precise fix for the cause. Prescribe the minimal code change, the exact files and lines to modify, and potential side effects so `/develop` can implement it safely. Follow the project conventions (`AGENTS.md`, neighbouring code).

### Step 6: Verify diagnosis and deliver handoff

- Verify the reproduction hypothesis against the codebase.
- Save the complete diagnostic report to `check/<feature>/<run-id>/DEBUG.md`.
- **Handoff to develop**: Hand the minimal fix prescription to `/develop` to apply the code edit.
- **Handoff to test**: Hand the deterministic regression reproduction to `/test` to lock in the automated test.
- **Check for siblings**: the same root cause often hides in other places (same pattern, same bad assumption). Grep for them and note them in the report.

### Optional: run it in a subagent

For a hunt that is not trivial, spawn an investigation subagent so the iterative tool use doesn't fill the main context:

- `model`: set explicitly to a strong model, do not inherit the session model (Claude Code: `sonnet`)
- `description: "Debug: <symptom>"`
- Tools: `Read`, `Bash`, `Grep`, `Glob`
- `prompt`: this loop + the captured symptom + reproduction + the relevant `AGENTS.md` (inlined). Require it to report the root cause with evidence, not just "fixed it."

### Report

Lead with the root cause and the fix; the reproduction and evidence are the trail, not the headline (per `docs/workflow/conventions.md`). Template:

```
## /debug complete · <the bug, one line>

**Root cause: <the proven cause>. Prescribed fix: <minimal change for /develop>.**
Next: /develop <feature> to apply the fix, then verify, review, security, and /test for regression coverage.
Heads up: <same cause also at <where> · or a design flaw → /architect <what>>   (omit if none)
```

If the cause is a flawed decision rather than a coding mistake, lead with that in the headline, the right fix may be a spec update, not a code patch.
