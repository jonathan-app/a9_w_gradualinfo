# Auditoria corretiva do login administrativo

Data: 2026-10-09, America/Sao_Paulo. Base: HEAD `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`, árvore suja. Mudanças preexistentes, incluindo testes, AGENTS.md, docs.zip removido e alterações de preview, foram preservadas. Não houve fetch, commit, merge, deploy, alteração de banco remoto ou de bindings do Worker.

## Diagnóstico antes de alterar código

Harness externo com mocks do Supabase SSR e execução das funções reais. Comando: `node node_modules/vitest/vitest.mjs run --config /tmp/admin-hardening-probe/vitest.config.mts`. Resultado da rodada válida anterior às correções: 5/5 casos reproduziram os comportamentos abaixo. As duas primeiras tentativas ajustaram a resolução de mocks do harness, sem alterar a aplicação. Cópias do harness e configuração estão em baseline-probe.txt e baseline-config.txt neste diretório. Para repetir em outro caminho, reconstruir a configuração com aliases locais. As asserções descrevem a falha original e devem falhar após a correção correspondente.

| Ponto | Evidência em processo                                                                                             | Causa                                                                    | Estado atual                                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| P0-1  | signIn devolvendo UUID diferente produz 303 para MFA setup e não chama signOut                                    | login não comparava identidade antes da escada MFA                       | Corrigido localmente, testes negativos PASS                    |
| P0-2  | requisição sem Origin/Referer aceita; Origin arbitrário igual à URL arbitrária também aceito                      | retorno true na ausência dos cabeçalhos e confiança em request.url       | Corrigido localmente, produção exige origem canônica           |
| P0-3  | sexta tentativa recebe 429; recarregar módulo permite nova tentativa; alterar x-forwarded-for permite outra chave | Map de módulo, identidade de rede controlável e sem descarte de entradas | ABERTO, DO dedicado aprovado, contrato incompleto              |
| P0-4  | Set-Cookie reconstruído perde Secure, HttpOnly, SameSite, Max-Age e caminho informado pelo mock                   | copiar apenas nome e valor do cookie                                     | Corrigido localmente, captura das opções do SDK                |
| P0-5  | executar renderização setup duas vezes, sem fator, chama enroll duas vezes                                        | efeito colateral na renderização de GET                                  | ABERTO, operação explícita e idempotência precisam de contrato |

P0-3 é reprodução de reinicialização de módulo, não teste de dois Workers reais. P0-5 usa matrícula com erro sintético e lista sem fatores: comprova o efeito colateral repetido, não a criação real de dois fatores. A página já detecta fatores pendentes via listFactors e redireciona para desafio, portanto não afirmar que toda atualização gera duplicação.

## Correções implementadas contra spec 0007

Login valida formato e presença de ADMIN_USER_ID antes de signIn. UUID divergente dispara signOut local, devolve o mesmo erro genérico de credenciais inválidas e remove cookies capturados mesmo se signOut lançar erro. Não executa a escada de MFA.

validateAdminRequestOrigin rejeita origem ausente. Origin tem precedência sobre Referer e não pode ser recuperado por um Referer permitido se inválido. A URL e o Host recebidos não tornam origem arbitrária confiável. A exceção local só vale fora de produção, com protocolo e porta correspondentes.

createClient mantém o adaptador SSR existente, com callback opcional para capturar setAll. createAdminSessionResponse conserva as opções e remoções emitidas pelo SDK. Login, MFA (incluindo sucesso JSON) e logout aplicam esses cookies à resposta definitiva, sem reemitir indiscriminadamente cookies recebidos. Respostas finalizadas levam private, no-store. Cookies fornecidos pelo SDK mantêm seus atributos, sem impor uma política nova que possa quebrar o cliente Supabase.

## Verificação executada

103/103 testes PASS em 11 arquivos: admin-hardening, admin-auth, admin-logout, admin-e2e-guard, preview-failure-status, preview-security, preview-durable-object, preview-logout, preview-session, lib/services/posts e sanity-client. A nova suíte admin-hardening tem 10 casos.

Typecheck: `node node_modules/typescript/bin/tsc --noEmit`, exit 0. ESLint dos arquivos administrativos alterados e da nova regressão: exit 0. Prettier dos mesmos arquivos: PASS. `git diff --check`: exit 0. Não houve execução de check:all, E2E, RLS, Semgrep ou gitleaks nesta rodada. Não transferir para este diff resultados de commits anteriores.

Set-Cookie foi inspecionado no objeto NextResponse serializado, em processo. Os testes verificam path, Secure, HttpOnly, SameSite, Max-Age e expiração. Quando Max-Age está presente, Next calcula Expires com base nele; o teste de expiração explícita cobre separadamente o caso sem Max-Age. Isso não substitui inspeção de headers pela rede.

## Prescrição pendente e handoff

/architect deve completar o rascunho `docs/specs/2026-10-09-0842-endurecimento-auth-admin.md`: DO dedicado foi aprovado pelo dono, mas faltam limites por operação, janela, chaves confiáveis, descarte de estado, abuso distribuído e resposta de formulário 429. Não inventar estes valores nem usar memória local como controle de produção.

Definir POST explícito para matrícula TOTP, validação de origem, identidade, concorrência/idempotência e recuperação de fator pendente quando o segredo já não está disponível. Definir recuperação de perda do fator sem retirar AAL2 por iniciativa da aplicação. Recuperação de senha por e-mail e remoção de MFA são processos diferentes. Preservar a sessão AAL1 necessária para matrícula e só autorizar operações administrativas finais em AAL2.

/develop deve implementar esses contratos depois do aceite. /check deve medir build, headers, cookies, interface, ausência de dados protegidos, integração Supabase, RLS, configuração de cadastro e Worker real. Leitura pública e preview tiveram regressões unitárias executadas, mas ausência de regressão em produção é UNVERIFIABLE. A validação contra build da spec 0006 continua pendente, preservada em workflow/STATE.md.

## Delimitação

GROQ conectado, armazenamento DO real, rate limiting entre isolados, matrícula e recuperação reais, cadastro público desativado no Supabase remoto, renovação de cookies pela rede, build OpenNext, dry-run Wrangler e preview local: UNVERIFIABLE nesta rodada. Nenhum gate foi aprovado. PR #24 continua em rascunho, merge e deploy sem autorização.
