# /check verify do plano de atualização

Data: 2026-10-07. Estado: execução parcial, REPROVADO por ausência de prova.
Não houve aprovação de merge ou publicação. Este é modo verify, não revisão
independente por outro modelo.

## Revisão avaliada

- Branch: `feat/md-0002-casca-editorial-home`.
- HEAD: `d4f81f3e142a7797eeb2ef60ce1a1103fbf0a0bf`.
- Árvore HEAD: `b0f22fc7a8eac71245f7803d1cc7fbfc778b921e`.
- Checkout sujo, com arquivos staged, unstaged e untracked. HEAD sozinho
  não representa o código local. Manifesto de conteúdo: 345 arquivos,
  captura anterior à escrita deste relatório e à atualização do STATE.
- Manifesto SHA-256 (lista canônica ordenada):
  `6d40a465b06b1b79b96ceb15a01ee2f60f0723c475396063b720c8ed3517628c`.
- Spec esperada: `docs/specs/md-0002-casca-editorial-home.md`, Accepted,
  hash registrado no resultado JSON. Specs 0003 e 0004 complementam preview
  e gate, mas seus ACs não são substitutos para os 13 editoriais.

## Execuções reais desta rodada

| Comando                                  | Resultado                         | Interpretação                                                                                                              |
| ---------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| vitest run                               | exit 1, 70 passaram e 18 falharam | Todos os 18 falham no beforeEach, spawnSync git EPERM. Negativos do gate não comprovados.                                  |
| tsc --noEmit                             | exit 0                            | Tipos app passam                                                                                                           |
| tsc --project tsconfig.e2e.json --noEmit | exit 0                            | Tipos E2E passam                                                                                                           |
| eslint .                                 | exit 0, 21 avisos                 | Sem erros, avisos de console nos hooks e audit                                                                             |
| prettier --check .                       | exit 0 antes dos novos artefatos  | Formatação da árvore inicial passa                                                                                         |
| next build --turbopack                   | exit 1                            | EPERM criando processo e porta na compilação CSS. Build não concluído                                                      |
| docker ps                                | exit 1                            | Docker é Podman local; configuração em /run/user/1000/libpod protegida                                                     |
| node scripts/run-semgrep.mjs             | exit 1                            | spawnSync semgrep EPERM, scan não executado                                                                                |
| node scripts/run-gitleaks.mjs            | exit 1                            | fetch failed, scan não executado                                                                                           |
| pnpm audit --audit-level=high            | exit 1 no launcher                | ERR_PNPM_PNPM_ENGINE_IDENTITY_UNVERIFIABLE; registro npm inacessível, audit não iniciou. Verificação de identidade mantida |

Execuções fora do sandbox foram solicitadas para gate, build, containers
e Semgrep. Gitleaks já tem pedido de execução escalada pendente. Auditoria pnpm também teve execução escalada solicitada após o erro de registro. Nenhuma
permissão pendente equivale a resultado de execução. Não houve reset de banco
local existente, quarentena de skills, commit, merge ou publicação.

Sem banco descartável e build atual comprovados, pgTAP, E2E, Lighthouse,
scans, export e execução CI ficam Not run/Blocked, nunca PASS. Resultados
históricos em outro SHA, dev ou servidor compilado anterior não são reciclados.

## Matriz dos ACs

| AC            | Status       | Evidência                                                                                           |
| ------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| md-0002/AC-01 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-02 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-03 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-04 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-05 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-06 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-07 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-08 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-09 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-10 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-11 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-12 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |
| md-0002/AC-13 | UNVERIFIABLE | [Logs do bloqueio](evidence/2026-10-07-plano-verificacao/execution.json), sem prova funcional do AC |

## Os 12 cenários

| Cenário | Caso                                     | Status       |
| ------- | ---------------------------------------- | ------------ |
| S01     | HTTP artigo público                      | UNVERIFIABLE |
| S02     | HTTP artigo inexistente                  | UNVERIFIABLE |
| S03     | HTTP rascunho sem preview                | UNVERIFIABLE |
| S04     | HTTP rascunho com preview                | UNVERIFIABLE |
| S05     | Secure no Set-Cookie de produção         | UNVERIFIABLE |
| S06     | no-store no artigo protegido             | UNVERIFIABLE |
| S07     | Sessão realmente expirada                | UNVERIFIABLE |
| S08     | Usuário autenticado sem claim            | UNVERIFIABLE |
| S09     | Identidade diferente da dedicada         | UNVERIFIABLE |
| S10     | Logout com falha e tentativa de rascunho | UNVERIFIABLE |
| S11     | Axe home                                 | UNVERIFIABLE |
| S12     | Axe artigo                               | UNVERIFIABLE |

## Autoridade da decisão

Comando executado: `node scripts/check-decision.mjs
 docs/reviews/2026-10-07-plano-verificacao-final-resultado.json`.
Exit 1, approved=false, verdict=REPROVADO, 0 PASS, 0 FAIL funcionais,
13 UNVERIFIABLE, 0 hashes de evidência inválidos, 1 BLOCKER e 2 WARNING.
As falhas ambientais dos comandos não foram transformadas em falhas
funcionais de AC nem em aprovação.

Reasons transcritas do script:

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
- BLOCKER: Build e gate bloqueados com EPERM; containers inacessíveis. Prova empírica dos ACs e dos 12 cenários não executada.

## Como destravar

1. Concluir as autorizações de execução fora do sandbox já solicitadas.
2. Gate: executar os 18 testes em repositórios descartáveis e registrar cada
   negativo, incluindo decisão incompleta/FAIL, SHA e árvore divergentes.
3. Banco: inspecionar containers e preparar stack descartável, com configuração
   JWT curta somente para testes, três contas e fixtures do CI. Não resetar o
   banco existente sem identificar seu uso.
4. Compilar novamente a árvore atual e executar os 34 E2E em HTTPS, pgTAP,
   Semgrep, Gitleaks, auditoria de dependências, Lighthouse e export.
5. Atualizar matriz com provas específicas de cada AC/cenário, apontando SHA,
   árvore e hash da spec correspondentes. Aprovação do gate por SHA exige
   checkout limpo; esta árvore suja não pode ser declarada aprovada por HEAD.
6. Verificar skills e proteção remota conforme plano, sem inventar origem,
   CODEOWNERS aplicado ou configuração de branch protection.

Arquivos de evidência: `evidence/2026-10-07-plano-verificacao/execution.json`
e `source-manifest.json`. Resultado e decisão ficam ao lado deste relatório.
