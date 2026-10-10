# Matrícula MFA explícita, implementação local

Aceite do proprietário em 2026-10-09: “Aceitar e implementar localmente”. Spec `docs/specs/2026-10-09-0842-endurecimento-auth-admin.md` marcada Accepted com fonte explícita. Alterações preexistentes, inclusive rate limiting, preservadas. Sem commit, merge, deploy ou execução de recuperação real.

## Comportamento implementado

- AC-01: GET setup consulta estado, sem enroll ou desafio. A folha client faz POST somente em ação explícita.
- AC-02: endpoint de matrícula verifica origem, UUID e usuário antes de consumir corpo, com cliente SSR por requisição.
- AC-03: TOTP existente recebe 409 sem segredo; nome fixo preservado, falha de enroll relê o vencedor sem excluir ou repetir. Deadline de 10000 ms impede iniciar chamada posterior após timeout. Atomicidade real depende do índice do Supabase e continua UNVERIFIABLE até prova conectada.
- AC-04: segredo/QR somente em estado React transitório; imagem usa data URL local. Confirmação apaga o payload preservando factorId para formulário nativo. Saída de página, histórico, ocultação da aba e logout apagam estado e cancelam espera. Região sensível marcada para bloqueio/máscara Sentry; replay já está desabilitado na configuração atual. Proxy impõe private, no-store e noindex nas páginas e APIs MFA. Prova completa de telemetria e headers pela rede continua pendente.
- AC-05: escada usa currentLevel, falha de consulta não autoriza. Verificação exige que factorId pertença ao usuário e confirma currentLevel AAL2 depois de challengeAndVerify, aplicando os cookies pelo finalizador SSR. Fator perdido não é recriado automaticamente.
- AC-06: procedimento em `docs/operations/2026-10-09-1515-recuperacao-mfa-manual.md`, com operação global nomeada e pré-requisitos conferidos no SDK local. Não foi executado; recuperação conectada permanece UNVERIFIABLE.
- AC-07: não foram alterados binding/migration, quotas, leitura editorial ou regras de preview nesta rodada. Proxy apenas acrescenta headers em caminhos MFA. Suíte de regressão local abaixo; provas no Worker/Supabase reais e cadastro público permanecem pendentes.

## Validação

| Verificação                                                  | Resultado                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| TypeScript global                                            | PASS, exit 0                                                             |
| ESLint global com --max-warnings 0                           | PASS, exit 0                                                             |
| Prettier nos arquivos desta rodada e git diff --check        | PASS                                                                     |
| Cinco arquivos administrativos incluindo nova matrícula      | 81/81 PASS                                                               |
| Duas novas suítes, matrícula e interface, primeira execução  | 19/19 PASS                                                               |
| Suíte completa no sandbox antes de ampliar testes de limpeza | 243 PASS, 18 bloqueados por spawnSync git EPERM, exit 1                  |
| Reexecução ampliada da suíte                                 | Permissão solicitada, resultado pendente                                 |
| Build Next Turbopack                                         | Bloqueado por bind de porta interna, Operation not permitted, não é PASS |
| Reexecução ampliada do build                                 | Permissão solicitada, resultado pendente                                 |
| OpenNext, dry-run, E2E e Worker real                         | Não executados nesta rodada                                              |

Os testes usam fixtures sintéticas e SDK simulado, não provam concorrência persistente, revogação remota ou estado real do Auth. Não foi declarado check:all integral PASS nem aprovação de produção.

## Continuidade

`/check verify` deve concluir build Next/OpenNext e dry-run, medir cache/cookies/HTTP e UI no navegador, provar duas sessões concorrentes no Auth controlado e testar recuperação com sessões antigas. Registrar versão/referência imutável e resultados por AC sem transportar PASS históricos. Não manipular o fator real do proprietário. A correção editorial da spec 0006 é frente distinta e permanece com seu bastão próprio.
