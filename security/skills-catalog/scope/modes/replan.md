# Scope Mode: replan

## Replan (the living rhythm, run after a feature or phase ships)

The default cadence, not rare: run each time a feature or phase lands, keeping the scope matching reality and queueing the next slice. Reconciles in place, never spawns a new file; coarse and surgical (reconcile cells, append rows, don't rewrite the file).

1. Read the whole scope again (single file, or `index.md` + epics; the workspace's in a monorepo) and the code/specs for what just shipped.
2. Reconcile completion only from the applicable execution evidence defined in `docs/workflow/governance.md`. Files and checked boxes alone do not pass a gate. Leave Done transitions to sync; flag stale or contradictory completion with the supporting evidence.
   2a. Surface decision debt in the readout and report: for any spec still lacking ratification or with unratified choices, list it and point to `/architect <feature>` before further development.
3. Enroll needs surfaced during the build: read shipped features' spec `## Consequences` and `## Follow-up` sections; a follow-up (e.g. "add rate limiting") not yet a scope row becomes a new `planned` row with intent, tier, `Needs spec?`; the scope grows from real build feedback.
4. Reprioritize / reorder: sequence `Order` again, adjust `Phasing` for work not yet built; foundations stay first; work dropped from scope → `dropped`. If the project's risk profile has clearly shifted (e.g. payments or auth were added), recommend the `**Workflow:**` default again via the plan Step 5b panel; otherwise leave it.
5. Queue the next slice: which feature(s) are next (lowest `Order` `planned` rows), each `Needs spec: yes` (→ `/architect` next) or `no` (→ `/develop`).
6. Report via the completion block (mode: replan): marked done, enrolled from spec follow-up items, reordered/dropped, next step.
