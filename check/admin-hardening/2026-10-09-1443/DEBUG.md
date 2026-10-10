# Reconciliação dos cinco P0 administrativos

Data: 2026-10-09 14:43, America/Sao_Paulo. HEAD `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`, árvore com alterações locais preexistentes. Investigação pela skill `/debug`, sem mudanças na aplicação nesta rodada.

## Evidência atual

| P0            | Estado observado                                                                                                                                          | Limite da prova                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Identidade    | Login confere ADMIN_USER_ID antes de MFA, encerra sessão divergente e limpa cookies mesmo se signOut falhar. Testes negativos PASS.                       | Execução em processo com SDK simulado.                                                   |
| Origem        | Ausência de Origin e Referer é rejeitada, origem maliciosa não recebe confiança da URL ou Host recebidos. Testes PASS.                                    | Não prova WAF ou configuração remota.                                                    |
| Rate limiting | Spec de 08:52 Accepted com aceite explícito registrado; DO, adaptador, export e migration SQLite existem na árvore. Testes de quota e falha fechada PASS. | Armazenamento e bindings simulados nos testes, não comprova persistência de Worker real. |
| Cookies       | Finalizador SSR mantém as opções do SDK. Login, MFA e logout cobertos pelos testes administrativos.                                                       | Headers serializados em processo, sem inspeção nova pela rede.                           |
| Matrícula MFA | P0 ainda reproduzido: duas renderizações de setup com lista vazia e erro sintético chamam enroll duas vezes.                                              | Não comprova dois fatores persistidos no Supabase real.                                  |

Comando de regressão: `node node_modules/vitest/vitest.mjs run __tests__/unit/admin-hardening.test.ts __tests__/unit/admin-auth.test.ts __tests__/unit/admin-login.test.ts __tests__/unit/admin-logout.test.ts __tests__/unit/admin-rate-limit.test.ts __tests__/unit/admin-mfa-verify.test.ts`. Foram encontrados quatro arquivos existentes, 65/65 testes PASS. Os nomes admin-login e admin-mfa-verify não correspondem a arquivos existentes nesta árvore, portanto não alegar execução de seis arquivos.

Typecheck: `node node_modules/typescript/bin/tsc --noEmit`, exit 0.

## Reprodução isolada do P0 de matrícula

Harness histórico reconstruído em `/tmp/admin-hardening-probe` a partir de `../2026-10-09-0842/baseline-probe.txt` e `baseline-config.txt`, acrescentando aliases locais para next/server, next/navigation e react/jsx-runtime. A aplicação não foi modificada.

Comando: `node node_modules/vitest/vitest.mjs run --config /tmp/admin-hardening-probe/vitest.config.mts -t P0-5`. Resultado: 1 PASS, 4 ignorados, exit 0. O PASS confirma o comportamento indesejado previsto pelo harness, não aprovação de segurança.

Causa: `app/admin-dashboard/mfa/setup/page.tsx` chama `supabase.auth.mfa.enroll()` durante renderização quando a escada MFA indica setup. GET não exige a validação CSRF do endpoint POST. Já existe `app/api/admin/auth/mfa/enroll/route.ts`, mas esse endpoint não substitui a chamada de renderização e ainda não tem contrato completo de idempotência/concorrência.

A página já redireciona quando detecta fator pendente. Não afirmar que todo refresh cria duplicatas. O caso reproduzido usa lista sem fatores e matrícula com erro sintético.

## Prescrição e decisões necessárias

`/architect` deve completar o contrato de matrícula e recuperação em `docs/specs/2026-10-09-0842-endurecimento-auth-admin.md`, ainda Proposed. Definir POST explícito com origem validada e UUID autorizado, renderização GET sem escrita, tratamento de fator pendente cujo segredo já não está disponível, concorrência e repetição da matrícula, proteção de segredo/QR em cache e telemetria. A recuperação da conta única depende de escolha do proprietário, não inferir que reset de senha elimina MFA.

Pergunta enviada ao proprietário: “Para a recuperação do MFA da conta única, posso especificar um procedimento manual pelo proprietário no Supabase, com revogação de sessões e nova matrícula, sem endpoint público de recuperação?” Resposta ainda pendente neste registro.

Depois do contrato aceito, `/develop` deve usar a operação POST existente como ponto de partida, remover matrícula do GET e preservar SSR e preview. `/test` deve cobrir GET repetido sem enroll, POST sem origem/identidade recusado, matrícula concorrente, fator pendente, retomada e proteção do segredo. `/check` deve medir HTTP e cookies, fluxo AAL1/AAL2, Worker com binding real e configuração de cadastro público no Supabase.

O `STATE.md` estava atrasado ao tratar a spec de rate limiting como Proposed. A fonte documental atual registra Accepted e implementação local já existe. Isso não constitui aprovação do gate, nem prova remota. As pendências editoriais da spec 0006 permanecem separadas.

## Delimitações

Não foram executados novos scans, build, dry-run, E2E conectado, alterações remotas, commit, merge ou deploy nesta investigação. Resultados de segredos ou do gate anteriores não foram transportados para esta árvore. O texto do ZIP serve como lista de hipóteses, não como estado atual confirmado.
