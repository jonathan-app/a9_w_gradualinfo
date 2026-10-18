# Shortcut Debt Ledger

Harvested 2026-10-16 18:04 UTC. One row per deferral marker, grouped by file.
Scope: working-tree grep over `*.ts/tsx/mjs/js/py/md`, skipping `.git`, `node_modules`,
`.next`, `.open-next`, `pnpm-lock.yaml`, and the meta-files that only quote the convention
(`AGENTS.md:152`, `docs/audits/2026-10-15-2048-auditoria-completa.md:96`,
`docs/reviews/2026-10-14-1225-0017-fatia4-retencao-worm-verify.md:19`, `workflow/STATE.md:685`).

Two hits were excluded as not deferrals: a `shadcn` CLI flag note in
`.agents/quarantine-skills/2026-10-07/shadcn/SKILL.md:214` (a command suggestion, not a
code ceiling) and its backup copy.

---

## app/api/out/[id]/route.ts:49

- **What was simplified**: `validateAffiliateUrl` matches the destination hostname against the
  merchant domain with an exact match or a single subdomain suffix. Credentials, non-standard
  ports, and `https:` are already rejected above it.
- **Ceiling**: one merchant domain per redirect. Intermediate affiliate networks (Lomadee,
  Awin) that rewrite or proxy the final URL are silently rejected with
  `merchant_domain_boundary_mismatch` / 403.
- **Upgrade trigger**: onboard an affiliate aggregator whose redirect chain lands on a host
  that is neither the merchant nor a direct subdomain. Add an explicit allowlist of trusted
  intermediate hosts, validated per-merchant.
- **Tag**: names the trigger scenario → **has-trigger**.

## lib/offers/webhook-auth.ts:13-14

- **What was simplified**: `MemoryNonceCache`, an in-process `Map` with a 60 s auto-sweep and
  a 5 000-entry FIFO cap. Verifies HMAC-SHA256 signatures and a 300 s time window, then
  deduplicates nonces only within the lifetime of one Worker isolate.
- **Ceiling**: single-process / local-test only. Under multi-edge production every isolate
  keeps its own nonce set, so a replayed webhook message can be accepted by isolate B after
  isolate A already consumed it.
- **Upgrade trigger**: expose the webhook to public production traffic. Replace with Cloudflare
  KV, a Durable Object, or a PostgreSQL table keyed by nonce hash.
- **Tag**: names an upgrade path → **has-trigger**.

---

## Markers that name no upgrade path or trigger

- **`lib/offers/storage/memory-adapter.ts`** — the in-memory WORM adapter emulates Object Lock
  Compliance (730 d hot, extend to 5 y, no delete, 409 on collision) but carries no
  `shortcut:`/`ponytail:` marker of its own. The deferral lives one layer up, in the curated
  convention `lib/offers/AGENTS.md:30` (convention 5): the webhook exposure to public
  production traffic stays blocked until migration to a shared distributed cache (KV /
  Durable Objects / PostgreSQL). That line names a migration destination but **no concrete
  trigger** — it is gated on a state ("exposição do webhook em produção"), not an event
  anyone fires. **no-trigger**.
- **`lib/offers/AGENTS.md:30`** — same convention, counted once.

---

## Totals

- **Markers harvested**: 2
- **With an upgrade path or trigger**: 2
- **Without a trigger (rot silently)**: 1 (the WORM-in-memory deferral, surfaced through
  `lib/offers/AGENTS.md:30`)

No `ponytail:` markers in tracked code. The `pnpm-lock.yaml:210` and `workflow/STATE.md:685`
hits from the earlier sweep are not deferrals (a dependency alias and a history row), so they
are excluded under the "skip hits that are not a deferral" rule.
