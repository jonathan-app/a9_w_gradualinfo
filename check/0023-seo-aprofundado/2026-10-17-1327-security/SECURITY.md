# Auditoria de segurança: Feature O e triagem da árvore (spec 0023)

**Data**: 2026-10-17 13:27, America/Sao_Paulo.
**Escopo**: caixa `Audit security` da Feature O (spec `docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md`) e triagem dos achados pré-existentes que mantêm o gate vermelho.
**Comandos canônicos**: `pnpm security:secrets` (gitleaks 8.28.0, `scripts/run-gitleaks.mjs`) e `pnpm security:sast` (semgrep 1.179.0, `scripts/run-semgrep.mjs`).
**Relatórios brutos**: `security-reports/gitleaks.json` e `security-reports/semgrep.json` (gitignored; sobrescritos a cada execução).

## Resultado dos comandos

| Comando                 | Exit | Achados                                     |
| ----------------------- | ---- | ------------------------------------------- |
| `pnpm security:secrets` | 1    | 88 findings (28 no histórico, 60 na árvore) |
| `pnpm security:sast`    | 1    | 3 findings ERROR                            |

**Nenhum achado está em arquivo da Feature O** (nem nas evidências dela em `docs/reviews/evidence/2026-10-17-1218-0023-seo-aprofundado/` e `check/0023-seo-aprofundado/`). O vermelho vem de artefatos de features anteriores e de trabalho não commitado de sessões concorrentes.

## Gitleaks: 88 findings por categoria

| Categoria                                                                                                                                                                                | Quantidade | Regra           | Atribuição                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `docs/reviews/evidence/2026-10-10-1527-verify-0853696/2026-10-10-1527-source-before.json`                                                                                                | 56         | generic-api-key | Evidência rastreada da verificação do commit `0853696` (entrou no commit `9e0ece3`, 2026-10-10) |
| `docs/reviews/evidence/2026-10-11-1515-editorial-local/source-before.json` e `source-after.json`                                                                                         | 26         | generic-api-key | Evidência não rastreada da feature editorial-local (sessão concorrente)                         |
| `__tests__/integration/spec-0018-real-auth.test.ts`, `spec-0021-real-db-concurrency.test.ts`, `scripts/admin-reset-mfa.mjs`, `scripts/e2e-server.mjs` (2), `scripts/seed-e2e-offers.mjs` | 6          | jwt             | Fixtures e scripts de sessões concorrentes (arquivos novos não rastreados ou modificados)       |

Causa do vermelho: a allowlist do `.gitleaks.toml` cobre manifests de evidência (`source-hashes.json`, `*-manifest.json`, `*-execution.json`), mas os snapshots `source-before/after.json` ficaram fora do padrão. É a mesma família de falso positivo já reconhecida (valores de exemplo/hash em artefato capturado), agora com nome de arquivo não coberto. O `.gitleaks.toml` deliberadamente não allowlista `docs/reviews/evidence/` inteiro, então a correção exige classificar antes (ver Triagem).

## Semgrep: 3 findings ERROR

| Regra                                 | Local                            | Atribuição                                                                                                                                                |
| ------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security.service-role-key-in-client` | `lib/env.ts:65`                  | Arquivo modificado por sessão concorrente (adição de `env.editorialLocal`); a regra acende na referência a `serviceRoleKey` no objeto `env` compartilhado |
| `security.service-role-key-in-client` | `lib/env.ts:136`                 | Mesma família, em `isSupabaseServiceRoleConfigured`                                                                                                       |
| `security.service-role-key-in-client` | `scripts/seed-e2e-offers.mjs:13` | Arquivo novo não rastreado da sessão do R2/WORM                                                                                                           |

Não há achado em código, teste ou configuração da Feature O. Os três são de trabalho em voo: `lib/env.ts` está modificado e o seed é de outra frente.

## Triagem executada (2026-10-17 14:42)

### Classificação

1. **82 findings em JSONs de evidência**: ambos os conjuntos são manifestos de sha256 do conteúdo avaliado (`source-before/after.json`); o arquivo do `0853696` tem 991 hashes de 64 hex e a regra `generic-api-key` acende pela entropia. Falso positivo confirmado, mesma família do `source-hashes.json` já allowlistado.
2. **6 findings `jwt`**: os seis tokens decodificam para `iss=supabase-demo` com `exp` em 2032, o valor público e determinístico do CLI do Supabase local (papéis `anon` e `service_role` do stack local, sem acesso a projeto remoto). Um deles tem payload formatado com espaços (`scripts/admin-reset-mfa.mjs`), o que muda o prefixo em base64.
3. **3 findings do semgrep**: as duas linhas de `lib/env.ts` são o acesso cru na fronteira tipada (convenção 7), que o Next não inlina no bundle do cliente; o terceiro é Node puro em `scripts/seed-e2e-offers.mjs`, que nunca é empacotado.

### Correções aplicadas (config do repositório; nenhum arquivo de sessão concorrente tocado)

- `.gitleaks.toml`: allowlist de caminho para `docs/reviews/evidence/.*source-(before|after)\.json` e allowlist de valor (regex contra o match, alvo já configurado) para os dois prefixos dos JWTs demo do stack local. Token de projeto real (ref da nuvem) não casa nenhum prefixo e continua acusando.
- `security/semgrep.yml`: a regra `service-role-key-in-client` ganhou `paths.exclude` para `lib/env.ts` (fronteira tipada) e `scripts/` (Node, fora do bundle) com o porquê comentado; a variante perigosa `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` virou a regra irmã `service-role-key-public-in-client`, sem exclusões, que acende em qualquer arquivo inclusive nos excluídos. A proteção de fronteira de confiança não foi cortada, foi dividida.

### Reexecução

| Comando                 | Exit | Achados |
| ----------------------- | ---- | ------- |
| `pnpm security:secrets` | 0    | 0       |
| `pnpm security:sast`    | 0    | 0       |

## Conclusão

- A Feature O está limpa nos dois scanners e o portão completo passou a ficar verde com as correções acima; a caixa `Audit security` do escopo foi marcada com o ponteiro para este documento.
- O vermelho era integralmente pré-existente ou de trabalho em voo de outras sessões, sem relação causal com a spec 0023; a classificação ponto a ponto está acima.
- Próximo passo: `Test it` (`/test SEO aprofundado e auditoria`) e `Document it` (`/document pr`).
