# Scope: Reestruturacao de Backend, Autenticacao Administrativa e Operacoes

Plano ordenado para endurecimento do ambiente local, autenticacao administrativa real com segundo fator, fluxo controlado de recuperacao, painel operacional e integracao duravel do modulo de ofertas.

**Build approach:** Tracer Bullet (fatias verticais completas de ponta a ponta atraves de cada camada).  
**Workflow:** GA, profundidade de validacao rigorosa para autenticacao, seguranca e operacoes.

As regras locais em AGENTS.md e docs/workflow/governance.md continuam mandatorias. O nivel GA nao dispensa etapas locais, e a conclusao de cada item exige evidencias de execucao comprovadas.

---

## At a glance

| #   | Feature                                                                | Phase   | Status  |
| --- | ---------------------------------------------------------------------- | ------- | ------- |
| 1   | Ambiente local reproduzivel e isolamento de testes                     | Phase 1 | done    |
| 2   | Login administrativo real com MFA e logout                             | Phase 1 | done    |
| 3   | Validar bloqueio de cadastros no Supabase local                        | Phase 1 | done    |
| 4   | Script de seed da credencial do administrador unico                    | Phase 1 | done    |
| 5   | Procedimento controlado de recuperacao administrativa                  | Phase 2 | done    |
| 6   | Dashboard operacional de administracao                                 | Phase 3 | done    |
| 7   | Pipeline de ofertas com permissao de servico e persistencia probatoria | Phase 4 | done    |
| 8   | Defesa de borda, sanitizacao publica e ciclo de vida de nonces         | Phase 5 | planned |
| 9   | Concorrencia transacional, isolamento de privilegios e reconciliacao   | Phase 5 | planned |

---

## Phase 1: Ambiente Local e Acesso Administrativo Real

### 1. Ambiente local reproduzivel e isolamento de testes

Configurar execucao local consistente pelo entrypoint do Worker com validacao criptografica de admissao, desativar cadastros publicos no Supabase e isolar mocks de sessao exclusivamente para testes declarados.  
**Done when:** o servidor local e executado respeitando o entrypoint do Worker, a admissao do Cloudflare Access e validada sem aceitar headers estaticos cegos, cadastros publicos ficam desativados no `config.toml`, e a simulacao de sessao em `lib/supabase/server.ts` exige a variavel explicita `E2E_TEST=1` sem dependencia de `NODE_ENV=test`.

- [x] Desenhar o contrato e ambiente local: `/architect ambiente local reproduzivel`
      Spec 0018 · code in scripts/cloudflare-worker.ts, scripts/e2e-server.mjs, lib/admin/access.ts, lib/supabase/server.ts, supabase/config.toml · verified in docs/reviews/2026-10-15-2030-0018-login-mfa.md

### 2. Login administrativo real com MFA e logout

Substituir o atalho de sessao por fluxo de autenticacao real no servidor contra o Supabase local, exigindo primeiro fator por senha, segundo fator TOTP no navegador e encerramento seguro com destruicao de cookies.  
**Done when:** o administrador unico autentica com credenciais validas, conclui o desafio TOTP atingindo o nivel AAL2, acessa a rota protegida do painel, e a acao de logout encerra a sessao no Supabase e remove os cookies locais.

- [x] Desenhar a maquina de estados de login e MFA: `/architect login real e mfa`
      Spec 0018 · code in app/api/admin/auth/, lib/admin/ · verified in docs/reviews/2026-10-15-2030-0018-login-mfa.md

### 3. Validar bloqueio de cadastros no Supabase local

Confirmar que o cadastro publico permanece rejeitado no Supabase local, com reset limpo e tentativa real de cadastro bloqueada.  
**Done when:** apos o reset local, uma tentativa real de cadastro contra o GoTrue local e rejeitada e o bloqueio fica registrado em evidencia.

- [x] Comprovar o bloqueio na verificacao da Spec 0018: `/check verify ambiente local reproduzivel`
      Spec 0018 · code in supabase/config.toml · verified in docs/reviews/2026-10-15-2030-0018-login-mfa.md (admin-auth/AC-03)

### 4. Script de seed da credencial do administrador unico

Provisionar a credencial do administrador unico de forma reproduzivel no banco local, para o login real funcionar sem criacao manual.  
**Done when:** apos o reset local a credencial do administrador existe e o mesmo caminho de provisionamento alimenta a copia descartavel de E2E.

- [x] Provisionar e comprovar na verificacao da Spec 0018: `/check verify login real e mfa`
      Spec 0018 · code in supabase/seed.sql, scripts/e2e-server.mjs · verified in docs/reviews/2026-10-15-2030-0018-login-mfa.md

---

## Phase 2: Continuidade e Recuperacao Operacional

### 5. Procedimento controlado de recuperacao administrativa

Estabelecer mecanismo de redefinicao de senha e contingencia para perda do aplicativo TOTP utilizando exclusivamente ferramentas padrao do Supabase Auth e operacao administrativa documentada, sem criar codigos de backup caseiros.  
**Done when:** a redefinicao de senha ocorre pelo fluxo nativo do Supabase com tempo de vida curto, e o procedimento para recuperacao de perda de TOTP e formalizado e testado via CLI ou API administrativa em ambiente local isolado.

- [x] Desenhar o procedimento de contingencia administrativa: `/architect recuperacao administrativa`
      Spec 0019 Accepted · docs/specs/2026-10-16-1115-0019-recuperacao-administrativa.md · verified in docs/reviews/2026-10-16-1605-0019-recuperacao-administrativa.md

---

## Phase 3: Gestao Operacional

### 6. Dashboard operacional de administracao

Construir os componentes interativos do painel administrativo sob sessao AAL2 para inspecao de publicacoes, monitoramento de integridade e gestao operacional das ofertas comerciais.  
**Done when:** a interface protegida sob sessao AAL2 lista artigos e ofertas ativas, exibe historico e indicadores de precos com clareza, e permite acionar rotinas operacionais sem necessidade de comandos diretos no terminal.

- [x] Desenhar a interface e integracao do painel: `/architect dashboard operacional`
- [x] Construir e validar localmente o painel: `/develop dashboard operacional`
- [x] Consolidar evidencias por criterio de aceite (AC-01 a AC-08): `/check verify dashboard operacional` (check:all 765 PASS + e2e 1/1 + units; conferencia visual do agente concluida; aceite visual do proprietario aprovado; consulta autenticada Sanity comprovada empiricamente em 2026-10-16 com token real: 6 publicados + 7 rascunhos)
- [x] Revisar o diff de forma imparcial: `/check review dashboard operacional` (docs/reviews/2026-10-16-1805-0020-dashboard-operacional-aal2.md, scripts/check-decision.mjs exit 0 APROVADO)
- [x] Encerrar e sincronizar o ciclo: `/sync` (AGENTS.md, INDICE.md, escopo e STATE.md sincronizados; leitura autenticada Sanity validada em 2026-10-16T23:02Z; zero push/merge/deploy)
      Spec 0020 Accepted · docs/specs/2026-10-16-1650-0020-dashboard-operacional-aal2.md · verified in docs/reviews/2026-10-16-1805-0020-dashboard-operacional-aal2.md · aceite visual do proprietário concedido em 2026-10-16 e leitura remota Sanity comprovada no Worker (evidência em docs/reviews/evidence/2026-10-16-1930-sanity-authenticated-read/)

---

## Phase 4: Integridade Comercial e Persistibilidade Duravel

### 7. Pipeline de ofertas com permissao de servico e persistencia probatoria

Corrigir a permissao de execucao da RPC de avaliacao de selo, substituir o adaptador efemero em memoria por armazenamento imutavel que resista a reinicios, e sanitizar as mensagens de erro na API publica de ofertas.  
**Done when:** a rota administrativa invoca a RPC `evaluate_and_set_verified_price` utilizando cliente autenticado com a chave de servico (`service_role`), o armazenamento fisico de provas impede sobrescrita e exclusao permanecendo acessivel apos reinicio da aplicacao, e o endpoint publico `/api/ofertas` devolve mensagens sanitizadas sem expor detalhes internos do banco.

- [x] Desenhar a integracao de servico e persistencia WORM: `/architect ofertas pipeline e worm duravel`
- [x] Construir a integração de serviço e o adaptador persistente: `/develop ofertas pipeline e worm duravel`
  - [x] Cliente de serviço `server-only` com a RPC exclusiva e o adaptador de arquivos durável (AC-01, AC-02, AC-07)
  - [x] Fábrica de storage com falha fechada em produção, sem fallback para memória (AC-03)
  - [x] Rota administrativa sobre os dois clientes, com reuso idempotente sob reenvio (AC-01, AC-04)
  - [x] Sanitização fail closed e validação estrita de parâmetros na API pública `/api/ofertas` (AC-05, AC-06)
  - [x] Suíte de integração local: reinício, falha fechada, idempotência e sanitização (AC-08)
- [x] Validar e revisar de forma imparcial: `/check verify ofertas pipeline e worm duravel` e `/check review ofertas pipeline e worm duravel` (concorrência real de nonces distintos na RPC comprovada, anti-replay e idempotência no banco de dados local; `scripts/check-decision.mjs` exit 0; docs/reviews/2026-10-17-1330-0021-pipeline-ofertas-worm-duravel.md)
- [ ] Auditar segurança: `pnpm security:secrets` e `pnpm security:sast`
- [x] Testar: `/test ofertas pipeline e worm duravel` (123 testes PASS no módulo de ofertas, 795 testes Vitest em 78 suítes, 171 testes pgTAP em 6 arquivos no banco local)
- [ ] Documentar: `/document pr`
- [x] Sincronizar o ciclo: `/sync` (pipeline local validado; retenção no provedor remoto pendente; AGENTS.md, lib/offers/AGENTS.md, escopo e STATE.md sincronizados)
      Spec 0021 Accepted · docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md · pipeline local validado com concorrência real (dois nonces diferentes com mesma operation_key na RPC produzindo efeito único), hash canônico RFC 8785 incluindo action e parâmetros de resultado com rejeição 409 em divergência, rota de ingestão com HMAC prévio ao nonce e banco PostgreSQL local; retenção no provedor remoto pendente (Cloudflare R2 com Bucket Locks requer homologação em infraestrutura real; provisionamento de credenciais e bucket, sozinho, não equivale à homologação do WORM)

---

## Phase 5: Endurecimento do Pipeline de Ingestao de Ofertas e Idempotencia

### 8. Defesa de borda, sanitizacao publica e ciclo de vida de nonces · needs a decision

Impor limite de corpo durante a leitura do stream antes de alocar memoria, sanitizar respostas publicas de erro ocultando detalhes internos e estabelecer politica operacional de expurgo de nonces com unificacao anti replay.  
**Done when:** requisicoes com corpo excedendo 512 KB sao rejeitadas durante a leitura do stream sem alocacao integral, falhas da RPC e do servidor retornam codigos publicos genericos com identificador de correlacao sem vazar mensagens do PostgreSQL ou detalhes de constraints, e a tabela de nonces possui validacao estrita de formato e rotina segura de expurgo fora da janela de protecao.

- [ ] Design it (spec): `/architect defesa de borda e ciclo de vida de nonces`

### 9. Concorrencia transacional, isolamento de privilegios e reconciliacao · needs a decision

Garantir idempotencia deterministica e bloqueios concorrentes na RPC de avaliacao, auditar o escopo da credencial de servico, segregar credenciais por coletor e prever reconciliacao entre storage e banco de dados.  
**Done when:** testes de concorrencia comprovam bloqueio FOR UPDATE deterministico para a mesma chave de operacao sem renovacao indevida de validade, coletores possuem credenciais segregadas com rotatividade, o cliente com chave de servico tem escopo estrito auditado, e falhas entre gravacao de evidencia e commit SQL sao reconciliadas sem corrupcao.

- [ ] Design it (spec): `/architect concorrencia transacional e reconciliacao`

---

## Registro de Evidencias e Execucao

A contagem historica de assercoes pgTAP referia se a execucoes anteriores sob versoes passadas de migrations e testes. Nenhuma assercao foi revalidada nesta rodada de auditoria. Cada entrega deste plano devera executar a sua propria suite limpa e registrar formalmente os testes, commits e tempos de execucao em relatorio dedicado.
