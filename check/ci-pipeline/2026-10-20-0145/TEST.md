# /test ci-pipeline · 0 failed

## Identidade da execução

| Campo             | Valor                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HEAD              | `fd97f11556b4afa738028eaf7715b299b20bb16d`                                                                                                                                                                                                |
| Alvo              | commit `e646207dac0f0fd6935529d31178fd171e088fb5`, `ci: estabiliza jobs de qualidade e e2e no runner remoto`                                                                                                                              |
| Arquivos testados | `lib/admin/access-guard.ts`, `scripts/ci-fixtures.mjs`; página de artigo e `scripts/e2e-server.mjs` avaliados                                                                                                                             |
| Testes alterados  | `__tests__/unit/access-guard.test.ts`, `__tests__/integration/ci-fixtures.test.ts`                                                                                                                                                        |
| Correção aplicada | `lib/admin/access-guard.ts:51-69` — substring `includes('localhost')` substituída por `new URL(siteUrl).hostname` comparado estritamente contra `localhost`, `127.0.0.1` e `[::1]`; URL malformada recusada. Correção de sessão paralela. |
| Executado         | 2026-10-20 01:49, America/Sao_Paulo                                                                                                                                                                                                       |
| Comando           | `pnpm exec vitest run __tests__/unit/access-guard.test.ts __tests__/integration/ci-fixtures.test.ts --reporter=dot`                                                                                                                       |
| Resultado         | exit 0, 30 testes, 30 passando                                                                                                                                                                                                            |

## Portão de segurança

`security-reports/semgrep.json` foi gerado em 2026-10-20 01:25, depois do HEAD `fd97f11`, com Semgrep 1.179.0, 325 caminhos lidos, incluindo `lib/admin/access-guard.ts`, `scripts/ci-fixtures.mjs` e `scripts/e2e-server.mjs`, e 0 resultados. `security-reports/gitleaks.json` está vazio. Nenhum achado Critical ou High aberto para o alvo.

## Portões locais

`pnpm typecheck` passou. ESLint passou nos três arquivos alterados (`lib/admin/access-guard.ts`, `__tests__/unit/access-guard.test.ts`, `__tests__/integration/ci-fixtures.test.ts`). Prettier passou nos arquivos de teste, no `workflow/STATE.md` e neste relatório.

## Cobertura

| Comportamento                                                               | Teste                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Fallback do guard aceita `localhost`, `127.0.0.1` e `[::1]`                 | `access-guard.test.ts`, três casos de loopback                            |
| Fallback do guard recusa host remoto, domínio de produção e ausência de URL | `access-guard.test.ts`, três casos de recusa                              |
| Fallback do guard exige `E2E_PRODUCTION=1`                                  | `access-guard.test.ts`, caso sem a variável                               |
| Fallback do guard recusa URL malformada                                     | `access-guard.test.ts`, caso `nao-e-uma-url`                              |
| Fallback do guard recusa `localhost` dentro de host remoto                  | `access-guard.test.ts`, caso `https://localhost.evil.example` (CORRIGIDO) |
| `ci-fixtures` exporta `SUPABASE_SERVICE_ROLE_KEY`                           | `ci-fixtures.test.ts`, primeiro caso                                      |
| `ci-fixtures` gera e mascara `OFFERS_INGEST_SECRET`                         | `ci-fixtures.test.ts`, primeiro caso                                      |
| `ci-fixtures` reutiliza `OFFERS_INGEST_SECRET` fornecido e o mascara        | `ci-fixtures.test.ts`, caso dedicado                                      |
| `ci-fixtures` recusa host remoto e execução sem `GITHUB_ENV`                | `ci-fixtures.test.ts`, dois casos de recusa                               |

## Diagnóstico da falha anterior e correção

A versão anterior falhou no caso `retorna 503 quando localhost aparece em um host remoto`: `lib/admin/access-guard.ts:52` decidia loopback por `siteUrl.includes('localhost')`, então `https://localhost.evil.example` passava como loopback e `guardAdminAccess()` retornava `null`, admitindo a requisição. O teste não foi enfraquecido.

Correção aplicada em `lib/admin/access-guard.ts:51-69`: o hostname é extraído com `new URL(siteUrl).hostname` e comparado de forma estrita (`===`) contra `localhost`, `127.0.0.1` e `[::1]`. URLs malformadas caem no `catch` e são tratadas como não-loopback, recusando a admissão. O domínio de produção continua recusado pelo mesmo caminho. A correção foi feita por uma sessão paralela durante a execução; o `/test` não alterou o código de aplicação.

## Não coberto

- `app/artigos/[slug]/page.tsx`: a mudança de contraste é visual. A suíte axe existente não força o tema escuro. Deferir para revisão de design ou `/check verify`.
- `scripts/e2e-server.mjs`: a propagação de `OFFERS_INGEST_SECRET` para o processo Next exige o servidor completo. A suíte E2E `e2e/offers-ingest-worker.spec.ts` cobre o caminho quando executada.
- `scripts/ci-fixtures.mjs`: o Supabase simulado não prova criação real de usuários, RLS ou upsert real.
- `e2e/home.spec.ts` e `e2e/verify-header-public.spec.ts`: mudanças de seletor são test only e não foram executadas nesta rodada.
- Sem spec de produto para esta fatia de CI; não há AC-N para rastrear.

## Irmãos com o mesmo padrão (não corrigidos, só observados)

`scripts/admin-bootstrap.mjs:31` e `scripts/admin-reset-mfa.mjs:39` usam `supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')` para decidir se usam a service key local hardcoded. A mesma fraqueza de substring está lá: `http://localhost.evil.example:54321` passaria. A diferença de contexto é que esses são scripts operacionais que só entram em ação com uma URL local explícita, e o valor de fallback é uma service key do stack local, não uma admissão de requisição. Nenhum teste falha por isso e o escopo pedido não os cobre. Deferir: se o `/develop` ou `/audit` quiser fechar a raiz em toda a base, é uma troca idêntica (`new URL(supabaseUrl).hostname` contra `127.0.0.1` e `localhost`).
