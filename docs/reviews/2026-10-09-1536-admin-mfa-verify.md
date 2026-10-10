# /check verify, matrícula e recuperação MFA

Execução em 2026-10-09, America/Sao_Paulo. Spec Accepted: `docs/specs/2026-10-09-0842-endurecimento-auth-admin.md`. HEAD `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`, árvore com alterações locais identificadas por manifesto SHA-256.

**Veredito: REPROVADO**, autoridade `node scripts/check-decision.mjs`, exit 1. Contagens: 0 PASS, 0 FAIL, 7 UNVERIFIABLE, 0 BLOCKER, 1 WARNING. Não é revisão imparcial do diff e não aprova merge ou deploy.

## Checks

TypeScript global, ESLint global com zero avisos, Prettier dos arquivos da feature e diff check passaram. Vitest atual: 246 PASS e 18 bloqueados por spawnSync git EPERM. Não declarar check:all integral PASS.

Servidor local não iniciou: listen EPERM. Build atual indisponível, BUILD_ID ausente. Permissões ampliadas para build, servidor e testes solicitadas, sem resultado no fechamento desta rodada. Não houve navegação real, axe, E2E conectado, build OpenNext, dry-run ou validação no Worker real. Nenhum fator da conta real foi manipulado.

## Critérios

| Critério        | Estado       | Evidência                                                                               |
| --------------- | ------------ | --------------------------------------------------------------------------------------- |
| admin-mfa/AC-01 | UNVERIFIABLE | [2026-10-09-1536-AC-01.md](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-AC-01.md) |
| admin-mfa/AC-02 | UNVERIFIABLE | [2026-10-09-1536-AC-02.md](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-AC-02.md) |
| admin-mfa/AC-03 | UNVERIFIABLE | [2026-10-09-1536-AC-03.md](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-AC-03.md) |
| admin-mfa/AC-04 | UNVERIFIABLE | [2026-10-09-1536-AC-04.md](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-AC-04.md) |
| admin-mfa/AC-05 | UNVERIFIABLE | [2026-10-09-1536-AC-05.md](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-AC-05.md) |
| admin-mfa/AC-06 | UNVERIFIABLE | [2026-10-09-1536-AC-06.md](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-AC-06.md) |
| admin-mfa/AC-07 | UNVERIFIABLE | [2026-10-09-1536-AC-07.md](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-AC-07.md) |

## Reasons da autoridade

- `AC sem PASS: admin-mfa/AC-01`
- `AC sem PASS: admin-mfa/AC-02`
- `AC sem PASS: admin-mfa/AC-03`
- `AC sem PASS: admin-mfa/AC-04`
- `AC sem PASS: admin-mfa/AC-05`
- `AC sem PASS: admin-mfa/AC-06`
- `AC sem PASS: admin-mfa/AC-07`

## Ações necessárias

Concluir execução fora das restrições que impediram build/listen/Git e medir HTTP, cookies e UI autenticada da mesma árvore. Provar matrícula concorrente em Supabase controlado, com versão imutável e um único fator final. Exercitar recuperação em conta de teste com recusa de refresh antigo e validade residual comprovada. Inspecionar telemetria sem capturar segredo. Verificar leitura pública, preview e cadastro público separadamente.

Não prescrever mudança de aplicação apenas para contornar o sandbox. Próxima etapa permanece /check verify com runtime exercitável. Se alguma prova revelar falha, entregar cenário e evidência para /develop. A correção editorial da spec 0006 é outra frente, seu bastão foi preservado.

## Rastreabilidade

[Results](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-results.json), [decisão](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-decision.json), [manifesto do código](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-source-hashes.json), [checks](evidence/2026-10-09-1536-admin-mfa/2026-10-09-1536-checks.md).
