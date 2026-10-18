# Shortcut Debt Ledger

Harvested 2026-10-16 17:32 UTC. One row per deferral marker, grouped by file.
Scope: `git grep` over tracked `*.ts/tsx/mjs/js/py/md` (skipping `.git`, `pnpm-lock.yaml`,
and the four meta-files that only _quote_ the convention: `AGENTS.md:152`,
`docs/audits/2026-10-15-2048-auditoria-completa.md:96`,
`docs/reviews/2026-10-14-1225-0017-fatia4-retencao-worm-verify.md:19`,
`workflow/STATE.md:685`).

---

## lib/offers/webhook-auth.ts:13-14

- **What was simplified**: `MemoryNonceCache` — an in-process `Map` with a 60 s auto-sweep and a 5 000-entry FIFO cap. Verifies HMAC-SHA256 signatures and a 300 s time window, then deduplicates nonces only within the lifetime of one Worker isolate.
- **Ceiling**: single-process / local-test only. Under multi-edge production every isolate keeps its own nonce set, so a replayed webhook message can be accepted by isolate B after isolate A already consumed it.
- **Upgrade trigger**: expose the webhook to public production traffic. Replace with Cloudflare KV, a Durable Object, or a PostgreSQL table keyed by nonce hash.
- **Tag**: names an upgrade path → **has-trigger**.

## app/api/out/\[id\]/route.ts:49

- **What was simplified**: `validateAffiliateUrl` matches the destination hostname against the merchant domain with an exact match or a single subdomain suffix (`endsWith('.' + domain)`). Credentials, non-standard ports, and `https:` are already rejected above it.
- **Ceiling**: one merchant domain per redirect. Intermediate affiliate networks (Lomadee, Awin, …) that rewrite or proxy the final URL are silently rejected with `merchant_domain_boundary_mismatch` / 403.
- **Upgrade trigger**: onboard an affiliate aggregator whose redirect chain lands on a host that is neither the merchant nor a direct subdomain. Add an explicit allowlist of trusted intermediate hosts, validated per-merchant.
- **Tag**: names the trigger scenario → **has-trigger**.

---

## Markers that name no upgrade path or trigger

- **`lib/offers/storage/memory-adapter.ts`** — the in-memory WORM adapter emulates Object Lock Compliance (730 d hot, extend to 5 y, no delete, 409 on collision) but carries no `shortcut:`/`ponytail:` marker of its own. The deferral lives one layer up, in the curated convention `lib/offers/AGENTS.md:30` (convention 5): _"A exposicao do webhook a trafego publico de producao permanece bloqueada ate migracao para cache compartilhado distribuido (KV / Durable Objects / PostgreSQL)."_ That line names a migration destination but **no concrete trigger** — it is gated on "exposicao do webhook em producao", which is a state, not an event anyone fires. **no-trigger**.
- **`lib/offers/AGENTS.md:30`** (same convention, counted once) — see above.

---

## Totals

- **Markers harvested**: 2
- **With an upgrade path or trigger**: 2
- **Without a trigger (rot silently)**: 1 (the WORM-in-memory deferral, surfaced through `lib/offers/AGENTS.md:30`)

No `ponytail:` markers in tracked code. The two hits in `pnpm-lock.yaml:210` and
`workflow/STATE.md:685` are not deferrals (a dependency alias and a history row),
excluded by the "skip hits that are not a deferral" rule.
