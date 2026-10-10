# /check verify — Painel Administrativo TailAdmin (spec 0007)

**Data**: 2026-10-09 21:50 (America/Sao_Paulo)
**Modo**: verify
**Spec**: `docs/specs/2026-10-08-2228-0007-painel-administrativo-tailadmin.md`
**Commit**: `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`
**Tree**: `9ef0f628b6eef85ca97ae9295b33e4f13343efee`
**Veredito**: **REPROVADO** (exit 1, autoridade `scripts/check-decision.mjs`)

## Resumo

A spec 0007 está Accepted e o código de admin está implementado e coberto por 326 testes automatizados (todos verdes). O bloqueio da verificação empírica é o guard de Access (`lib/admin/access-guard.ts`), que exige o binding do Cloudflare Worker: sob `next start` puro, toda rota admin retorna 503 antes de qualquer lógica de login, MFA, rate limit ou logout executar. Portanto, 7 ACs que exigem interação real com a aplicação ficaram UNVERIFIABLE localmente.

## O que foi verificado

### Prova empírica (runtime local)

- `next start` na porta 3101, build de produção.
- `GET /admin-dashboard`, `/admin-dashboard/login`, `/api/admin/auth/login`, `/api/admin/preview` → **503** com `Cache-Control: private, no-store` e `X-Robots-Tag: noindex, nofollow`.
- `GET /robots.txt` → contém `Disallow: /admin-dashboard/`.
- Nenhuma senha em texto puro em `supabase/`, `lib/admin/`, `app/admin-dashboard/`, `app/api/admin/`.
- Template TailAdmin preservado em `referencias/template-admin-dashboard/` com LICENSE.
- Sem dependências de ApexCharts, jsvectormap ou Flatpickr no `package.json`.
- Textos da interface em pt-BR (`Entrar`, `Senha`, `Painel Administrativo`, `Sair`).
- Painel com atalhos para Sanity Studio (`env.sanityStudioUrl`) e preview (`/api/admin/preview`).

### Prova por testes automatizados

326 testes verdes, incluindo:

- `admin-access.test.ts` (33 testes): classificação de rotas, fail-closed, UUID.
- `admin-auth.test.ts` (29 testes): `requireAdminAuth`, AAL2, redirect.
- `admin-hardening.test.ts` (12 testes): origem, rate limit, redirectTo.
- `admin-logout.test.ts` (3 testes): limpeza de cookies.
- `admin-rate-limit.test.ts` (15 testes): 429, Retry-After.
- `admin-mfa-enrollment.test.ts` (10 testes): fluxo TOTP.

### Limitação do ambiente

O Access guard (`lib/admin/access-guard.ts:21`) chama `getCloudflareContext()` do OpenNext. Sem o binding do Worker, `guardAdminAccess()` sempre retorna 503. Não há bypass local documentado. Portanto, ACs que exigem passar pelo Access para testar login, MFA, rate limit e logout são UNVERIFIABLE sob `next start`.

## Resultado por AC

| AC          | Status       | Evidência                         | Nota                                                                                     |
| ----------- | ------------ | --------------------------------- | ---------------------------------------------------------------------------------------- |
| admin/AC-01 | UNVERIFIABLE | `2026-10-09-2145-ac-01-ac-11.log` | Exige interação real; Access bloqueia. Testes cobrem lógica de redirect.                 |
| admin/AC-02 | UNVERIFIABLE | `2026-10-09-2145-ac-01-ac-11.log` | Exige autenticação real; Access bloqueia. Testes cobrem UUID e fail-closed.              |
| admin/AC-03 | UNVERIFIABLE | `2026-10-09-2145-ac-01-ac-11.log` | Exige POST real em `/api/admin/*`; Access bloqueia.                                      |
| admin/AC-04 | UNVERIFIABLE | `2026-10-09-2145-ac-01-ac-11.log` | Exige fluxo MFA real; Access bloqueia. Testes cobrem camadas AAL.                        |
| admin/AC-05 | UNVERIFIABLE | `2026-10-09-2145-ac-01-ac-11.log` | Exige POST de login com rate limit; Access bloqueia. Testes cobrem validação.            |
| admin/AC-06 | PASS         | `2026-10-09-2145-ac-01-ac-11.log` | Sem link de registro no login; sem API de signUp.                                        |
| admin/AC-07 | PASS         | `2026-10-09-2145-ac-01-ac-11.log` | Template preservado em `referencias/template-admin-dashboard/`.                          |
| admin/AC-08 | PASS         | `2026-10-09-2145-ac-01-ac-11.log` | Sem ApexCharts/jsvectormap/Flatpickr; textos pt-BR.                                      |
| admin/AC-09 | PASS         | `2026-10-09-2145-ac-01-ac-11.log` | Nenhuma senha em texto puro no código.                                                   |
| admin/AC-10 | PASS         | `2026-10-09-2145-ac-01-ac-11.log` | Painel tem atalhos para Sanity Studio e preview.                                         |
| admin/AC-11 | PASS         | `2026-10-09-2145-ac-01-ac-11.log` | `robots.txt` tem `Disallow: /admin-dashboard/`; headers `private, no-store` + `noindex`. |
| admin/AC-12 | UNVERIFIABLE | `2026-10-09-2145-ac-01-ac-11.log` | Exige POST de logout com sessão real; Access bloqueia.                                   |
| admin/AC-13 | UNVERIFIABLE | `2026-10-09-2145-ac-01-ac-11.log` | Exige teste de acessibilidade com leitor de teclado; sem suite a11y específica.          |
| admin/AC-14 | PASS         | `2026-10-09-2145-ac-01-ac-11.log` | Cláusula de delimitação respeitada: itens não declarados como verificados.               |

Contagem do gate: 7 PASS, 0 FAIL, 7 UNVERIFIABLE, 0 BLOCKER.

## Findings

**INFO.** O Access guard torna 7 das 14 ACs da spec 0007 UNVERIFIABLE sob `next start` puro. Os testes automatizados cobrem a lógica, mas o modo verify exige interação com a aplicação real. Recomenda-se rodar `/check verify` novamente em ambiente com o binding do Worker (Cloudflare) para fechar as ACs de login, MFA, rate limit e logout.

## Saída da autoridade

```json
{
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 14,
    "PASS": 7,
    "FAIL": 0,
    "UNVERIFIABLE": 7,
    "missingEvidence": 0,
    "BLOCKER": 0,
    "WARNING": 0
  },
  "reasons": [
    "AC sem PASS: admin/AC-01",
    "AC sem PASS: admin/AC-02",
    "AC sem PASS: admin/AC-03",
    "AC sem PASS: admin/AC-04",
    "AC sem PASS: admin/AC-05",
    "AC sem PASS: admin/AC-12",
    "AC sem PASS: admin/AC-13"
  ]
}
```

## Evidências

- `docs/reviews/evidence/2026-10-09-2145-0007/2026-10-09-2145-ac-01-ac-11.log`: medições HTTP, robots.txt, senhas, template, dependências.
- `docs/reviews/evidence/2026-10-09-2145-0007/2026-10-09-2145-check-result.json`: artefato completo do gate com sha256 das evidências.

## Decisão

**REPROVADO** por 7 UNVERIFIABLE, todos causados pela mesma limitação de ambiente: o Access guard exige o binding do Cloudflare Worker, indisponível sob `next start` puro. Nenhum FAIL foi encontrado. As 7 ACs PASS foram provadas empiricamente. Para aprovar, é necessário rodar a verificação em ambiente com o Worker publicado (Cloudflare) ou prover um bypass local documentado para o Access.

## Próxima etapa

`/check verify` em ambiente Cloudflare (com binding do Worker) para verificar as ACs de login, MFA, rate limit e logout. Se não houver ambiente disponível, as ACs UNVERIFIABLE devem permanecer como limite de verificação, não como aprovação.
