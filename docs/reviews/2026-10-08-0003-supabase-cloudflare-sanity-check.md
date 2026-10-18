# /check: Supabase, Cloudflare e estado do Sanity

**Veredito: REPROVADO**, emitido por `scripts/check-decision.mjs`, exit 1 para ambos os contratos. 13 ACs de md-0002 e 8 de preview UNVERIFIABLE; 2 bloqueadores únicos, presentes nos dois resultados. Nenhum AC recebeu PASS indevido.

## Escopo e versão

Revisão do diff atual de configuração, proxy, Supabase, segurança e atualização concorrente de dependências. Base HEAD `2bcea1ddb429c1988b211923a17eb25df9dbaa48`, tree HEAD `2ac9eb05cda26c90dd25f7925799a1c175bb9bff`; árvore de trabalho suja. O relatório é diagnóstico do conteúdo observado, não certificado de aprovação para a tree HEAD. Specs `md-0002-casca-editorial-home.md` e `0003-preview-autorizacao.md`, ambas Accepted. Specs não foram editadas.

Revisão independente por gpt-6-astra, conforme /check. [Achados e escopo](evidence/2026-10-08-0003-conexoes-check/review.md). Sanity não possui integração implementada nesta árvore: studio e web ausentes. Não há aprovação de Sanity nem de conexão remota.

## Verificação empírica

Tipos e formatação passaram. Lint falhou com erro real de compatibilidade. Vitest: 86 PASS, 18 bloqueados por `spawnSync git EPERM`. Build Turbopack bloqueado ao abrir porta no sandbox. Não houve prova de aplicação real em browser, RLS ou preview remoto. MCP Playwright indisponível. [Comandos e logs](evidence/2026-10-08-0003-conexoes-check/verify.md). Reexecução dos testes fora do sandbox rejeitada pela revisão automática de aprovação, sem motivo detalhado; reexecução do build solicitada, sem resultado comprovado ao escrever este relatório.

| AC            | Status       | Evidência da limitação                                                    |
| ------------- | ------------ | ------------------------------------------------------------------------- |
| md-0002/AC-01 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-02 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-03 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-04 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-05 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-06 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-07 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-08 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-09 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-10 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-11 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-12 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| md-0002/AC-13 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-01 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-02 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-03 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-04 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-05 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-06 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-07 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |
| preview/AC-08 | UNVERIFIABLE | [Registro de execução](evidence/2026-10-08-0003-conexoes-check/verify.md) |

## Correções acionáveis

A spec `0005-diretriz-arquitetura-evolucao-sanity-supabase.md` foi lida ao detectar atualização concorrente do STATE: Accepted para a direção futura, exige spec própria antes da migração. Não muda os resultados dos dois contratos avaliados. Fingerprints dos arquivos observados estão em `evidence/2026-10-08-0003-conexoes-check/source-hashes.json`. Registros de qualidade anteriores não cobrem automaticamente a atualização posterior para ESLint 10.

1. `scripts/run-gitleaks.mjs:146`: usar saída NUL (`git ls-files -z`) e divisão por NUL, garantindo preservação de findings em nomes Unicode e especiais. O filtro atual pode esconder segredos detectados.
2. `package.json` e `pnpm-lock.yaml`: corrigir compatibilidade de ESLint 10.12.0 com eslint-plugin-react 7.37.5. Prova: `contextOrFilename.getFilename is not a function`, rule react/display-name, exit 2. Não desativar regras para ocultar o erro.
3. Após as correções, executar segurança, qualidade, build e cenários reais das duas specs em ambiente que permita rede, portas e processos. Conferir Supabase remoto e Worker sem imprimir credenciais. Entregar prova de RLS e preview positivo/negativo, expiração, logout, HTML malicioso e acessibilidade.

## Reasons transcritas da autoridade

### md-0002

- AC sem PASS: md-0002/AC-01
- AC sem PASS: md-0002/AC-02
- AC sem PASS: md-0002/AC-03
- AC sem PASS: md-0002/AC-04
- AC sem PASS: md-0002/AC-05
- AC sem PASS: md-0002/AC-06
- AC sem PASS: md-0002/AC-07
- AC sem PASS: md-0002/AC-08
- AC sem PASS: md-0002/AC-09
- AC sem PASS: md-0002/AC-10
- AC sem PASS: md-0002/AC-11
- AC sem PASS: md-0002/AC-12
- AC sem PASS: md-0002/AC-13
- BLOCKER: scripts/run-gitleaks.mjs:146: filtro pode descartar achados em caminhos Unicode ou escapados; usar git ls-files -z e divisão por NUL.
- BLOCKER: package.json: ESLint 10.12.0 falha com eslint-plugin-react 7.37.5; corrigir compatibilidade e repetir lint completo.

### Preview

- AC sem PASS: preview/AC-01
- AC sem PASS: preview/AC-02
- AC sem PASS: preview/AC-03
- AC sem PASS: preview/AC-04
- AC sem PASS: preview/AC-05
- AC sem PASS: preview/AC-06
- AC sem PASS: preview/AC-07
- AC sem PASS: preview/AC-08
- BLOCKER: scripts/run-gitleaks.mjs:146: filtro pode descartar achados em caminhos Unicode ou escapados; usar git ls-files -z e divisão por NUL.
- BLOCKER: package.json: ESLint 10.12.0 falha com eslint-plugin-react 7.37.5; corrigir compatibilidade e repetir lint completo.

## Artefatos e encaminhamento

[Resultado md-0002](evidence/2026-10-08-0003-conexoes-check/md0002-results.json), [decisão md-0002](evidence/2026-10-08-0003-conexoes-check/md0002-decision.json), [resultado preview](evidence/2026-10-08-0003-conexoes-check/preview-results.json), [decisão preview](evidence/2026-10-08-0003-conexoes-check/preview-decision.json).

Próxima etapa: /develop corrige os dois bloqueadores, depois /check verifica novamente. Sem merge ou publicação. Fila anterior de force-push e rotação dos segredos permanece pendente, sem operação automática neste check.
