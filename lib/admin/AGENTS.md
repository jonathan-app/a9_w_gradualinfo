# lib/admin — admissão e autorização administrativa

## Overview

Esta área protege `/admin-dashboard` e `/api/admin`. A admissão começa no Worker
(Cloudflare Access JWT e JWKS), depois o app confere o contexto interno, a
conta raiz (`ADMIN_USER_ID`) ou o papel em `admin_user_roles`, e MFA em AAL2.
Rate limit usa Durable Object. Respostas de recusa montadas à mão passam por
`lib/security-headers.ts`.

## Key files

| File                                 | Owns                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `access.ts`                          | Classifica path, valida JWT/JWKS, monta `accessFailureResponse`                                                                   |
| `access-worker.ts`                   | Gate no entrypoint Worker antes do OpenNext                                                                                       |
| `access-guard.ts`                    | Guarda interna: exige contexto Access congelado no env                                                                            |
| `auth.ts`                            | Conta raiz e papéis de `admin_user_roles`; escada MFA (AAL2); `assertAdminApiAuth(request, requiredRole)` e `requireAdminSession` |
| `roles.ts`                           | Atribuição e revogação de papéis pelas RPCs `assign_admin_role` e `revoke_admin_role`, com auditoria na mesma transação           |
| `audit-service.ts`                   | Trilha `admin_audit_log`, sanitização de metadados, operações em duas fases e falha fechada em eventos críticos                   |
| `service-client.ts`                  | Cliente com `service_role` e sem cookies para RPCs privilegiadas                                                                  |
| `rate-limit.ts` / `rate-limit-do.ts` | Quota administrativa via Durable Object                                                                                           |
| `rate-limit-protocol.ts`             | Contrato JSON limitado entre app e DO                                                                                             |
| `session-response.ts`                | Formatação de respostas de sessão admin                                                                                           |

## Commands

Herdados do root. Helper local (não é script `package.json`):

```bash
node scripts/config-admin-access.mjs --dry-run
```

Valida `ADMIN_ACCESS_*` com paridade a `readAdminAccessConfig` e, sem `--dry-run`,
publica secrets via `wrangler secret put` (stdin; valores nunca impressos).

## Conventions

- Fail closed: config ausente, path ambíguo ou contexto inválido vira 503/403
  privado, nunca vazamento de detalhe.
- Access no Worker não substitui a conta raiz, o papel em `admin_user_roles` nem AAL2 em `auth.ts`.
- A hierarquia é cumulativa: `admin` atende tudo, `editor` atende `editor` e `revisor`, `revisor` atende só `revisor`.
- `jwt-validate` (skill) complementa checagens JWT; a autorização de produto
  continua em `auth.ts`.
- Respostas manuais de falha usam `securityHeaders` / `accessFailureResponse`.
- Recuperação de senha opera sob o guard `assertRecoverySessionAuth` sem afrouxar `assertAdminApiAuth` das APIs de negócio.
- Operações críticas gravam `intent` antes da mutação e `success` ou `failure` depois; falha crítica vira `AdminAuditUnavailableError`.
- Leitura comercial (`lib/services/commercial-dashboard.ts`) opera com `server-only`, cliente privilegiado isolado sem cookies, cálculo único de medianas e fallback seguro sem expor `service_role` ao cliente.

## Gotchas

- Sem issuer, AUD e hosts válidos, guards devolvem 403/503 mesmo com login
  Supabase ok.
- JWK com chave privada (`d`, `p`, `q`, …) é recusada em `validKeys()`.
- Rate limit e Access dependem de bindings no Worker; `wrangler.dev` local sem
  binding não reproduz produção.
- `ADMIN_ACCESS_KEY_PAIR` e `isTestAccessHarnessAllowed` em `access.ts` servem
  apenas ao harness local (`scripts/e2e-server.mjs`) e ficam desativados em
  produção (`NODE_ENV=production` ou domínio `gradualinfo.com.br`).

## Related specs

- `docs/specs/2026-10-09-1632-0009-admissao-admin-access.md`
- `docs/specs/2026-10-09-0842-endurecimento-auth-admin.md`
- `docs/specs/2026-10-09-0852-rate-limiting-admin.md`
- `docs/specs/2026-10-08-2228-0007-painel-administrativo-tailadmin.md`
- `docs/specs/2026-10-14-2150-0018-ambiente-local-login-mfa.md`
- `docs/specs/2026-10-16-1115-0019-recuperacao-administrativa.md`
- `docs/specs/2026-10-16-1650-0020-dashboard-operacional-aal2.md`
- `docs/specs/2026-10-19-2050-0032-backend-administrativo-rbac-auditoria.md`
- `docs/specs/2026-10-19-2140-0033-dashboard-profissional-visual.md`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
