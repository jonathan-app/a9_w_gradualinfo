# 0019. Procedimento controlado de recuperacao administrativa

**Date**: 2026-10-16
**Status**: Accepted
**Decision source**: Aprovado pelo proprietario para a Phase 2 do escopo docs/scope/2026-10-14-2135-backend-auth-operacoes.md apos refinamento das rotas sem sessao sob Access, ciclo PKCE completo com propagacao de cookies e ramificacao de MFA ativo na atualizacao de credencial

## Summary

Esta decisao formaliza a contingencia e recuperacao administrativa do portal com dois fluxos distintos (redefinicao de senha e contingencia de autenticador TOTP). A solicitacao de recuperacao (`POST /api/admin/auth/recovery`) e o callback de retorno (`GET /api/admin/auth/recovery/callback`) operam antes de haver sessao Supabase autenticada, mantendo estritamente a admissao de borda do Cloudflare Access; a validacao de origem aplica se a mutacoes (`POST`), enquanto o callback `GET` vindo do link de e mail possui tratamento dedicado sem exigir cabecalho `Origin`. O fluxo PKCE completo armazena o verificador de codigo (`code_verifier`) em cookie SSR repassado ao navegador na solicitacao (`setAll`), permitindo a troca de codigo por sessao no callback e garantindo tratamento gracioso de falha caso o link seja aberto em outro navegador sem o verificador. A atualizacao de senha (`POST /api/admin/auth/recovery/update-password`) valida que a sessao pertence ao administrador unico e avalia a exigencia do GoTrue: se o GoTrue exigir AAL2 quando ha fator TOTP ativo, o fluxo conduz ao desafio TOTP antes da atualizacao; caso contrario, atualiza a credencial e imediatamente bloqueia o acesso ao painel ate o cumprimento do AAL2. A guarda principal `assertAdminApiAuth` permanece restrita a AAL2 para operacoes de negocio, sem excecoes amplas. A perda ou avaria do aplicativo TOTP e tratada exclusivamente por procedimento privilegiado fora do painel administrativo via API administrativa oficial do Supabase (`auth.admin.mfa.deleteFactor`), com confirmacao do UUID fixo do administrador, encerramento de sessoes, observancia da validade residual dos JWTs emitidos e reinicio seguro de matricula sem codigos de backup caseiros.

## Context

A conclusao da Spec 0018 blindou o acesso administrativo cotidiano com login por senha e segundo fator mandatorio em AAL2 contra o GoTrue local sob admissao Access no Worker. Contudo, em operacoes reais de producao e testes integrados, falhas de credencial primaria (esquecimento de senha) e incidentes de segundo fator (perda, furto, troca de celular ou desconfiguracao do aplicativo autenticador) podem interromper a administracao do portal.

Criar mecanismos paralelos de contingencia dentro da aplicacao, como perguntas de seguranca ou geracao de codigos de backup caseiros em tabela de aplicacao, costuma introduzir serias vulnerabilidades de contorno de MFA e vazamento de chaves. Por outro lado, deixar a recuperacao sem contrato claro cria o risco de intervencoes manuais ad hoc no banco de dados que quebrem os invariantes de sessao ou deixem tokens residuais ativos.

Link de recuperacao e sessao sao etapas distintas. O link encaminhado pelo GoTrue fornece um codigo de autorizacao temporario que deve ser trocado por cookies de sessao SSR em rota de callback dedicada. Essa troca depende do verificador PKCE gerado no momento da solicitacao e mantido em cookie no navegador. Caso o link seja aberto em outro navegador ou janela anonima, a troca falha e deve redirecionar o operador de forma clara para reiniciar o procedimento. Alem disso, sob MFA ativo, a exigencia do GoTrue em relacao ao nivel de assurance para `updateUser` deve ser testada: se o GoTrue exigir AAL2 para alterar a senha de conta com TOTP ativo, o desafio do segundo fator deve preceder a mutacao da senha. Para o incidente de perda de autenticador, a intervencao utiliza exclusivamente as APIs administrativas oficiais suportadas pelo Supabase Auth, assegurando rastreabilidade, desvinculacao correta e encerramento de sessoes associadas.

Este documento estabelece o contrato formal aceito da Phase 2 do escopo, detalhando o comportamento nativo de redefinicao de senha, o ciclo PKCE completo, a checagem obrigatoria de identidade, a guarda granular isolada por rota, o procedimento operacional auditado para reset de TOTP via API administrativa e a metodologia de testes em ambiente isolado sem exposicao de credenciais.

## Requirements

**User stories**:

- Como administrador unico do portal, quero solicitar redefinicao de senha esquecida via email e definir nova credencial por link de uso unico com troca de codigo PKCE no callback SSR, para retomar o acesso primario com seguranca.
- Como engenheiro de seguranca, quero assegurar que a redefinicao de senha nao conceda passe livre ao painel administrativo nem as APIs de negocio sem o cumprimento do segundo fator TOTP em AAL2, para manter o principio de autenticacao multifator inegociavel.
- Como operador do sistema, quero dispor de um procedimento operacional auditado e documentado utilizando a API administrativa suportada para desvincular um fator TOTP perdido sem expor credenciais nem manter sessoes antigas vivas, para poder realizar nova matricula em dispositivo confiavel.

**Acceptance criteria**:

- **admin-recovery/AC-01**: A solicitacao de redefinicao de senha em `/api/admin/auth/recovery` opera sem sessao Supabase previa sob admissao de borda Cloudflare Access, aplica rate limit dedicado e validacao estrita de origem (`validateAdminRequestOrigin`), emitindo chamada nativa `supabase.auth.resetPasswordForEmail(email, { redirectTo })` com `redirectTo` apontando estritamente para o callback autorizado `/api/admin/auth/recovery/callback`. A resposta repassa os headers de cookie do cliente Supabase (`setAll`) contendo o verificador PKCE (`code_verifier`) para o navegador e devolve status HTTP 200 com mensagem uniforme de sucesso para e-mails autorizados ou nao autorizados, prevenindo enumeracao de contas.
- **admin-recovery/AC-02**: A expiracao do token/OTP de recuperacao e fixada em 15 minutos (900 segundos) na configuracao do Auth (`otp_expiry = 900` em `supabase/config.toml` sob `[auth.email]`), sendo comprovada a rejeicao de tokens expirados no ambiente local.
- **admin-recovery/AC-03**: A rota de callback SSR `/api/admin/auth/recovery/callback` (GET) opera sem sessao Supabase previa e sem exigir cabecalho `Origin`, validando a admissao Access na borda. Recebe o codigo temporario via query string, le o cookie do verificador PKCE gerado na solicitacao e executa a troca por sessao SSR (`exchangeCodeForSession`), gravando os cookies de sessao de recuperacao e redirecionando com status 303. Na ausencia do cookie verificador (abertura em outro navegador ou janela anonima) ou sob codigo invalido, expirado ou reutilizado, a rota rejeita a troca e redireciona de forma limpa para a tela de login (`/admin-dashboard/login?error=recovery_verifier_missing` ou `recovery_link_invalid`).
- **admin-recovery/AC-04**: O endpoint `/api/admin/auth/recovery/update-password` valida a origem da requisicao (POST), o rate limit e confere que a sessao ativa pertence estritamente ao administrador unico (`user.id === env.adminUserId`) atraves de guard dedicado de rota (`assertRecoverySessionAuth`), preservando `assertAdminApiAuth` restrito a AAL2 para operacoes de negocio. O endpoint testa a exigencia do GoTrue: se o usuario possui fator TOTP ativo e o GoTrue exigir AAL2 para atualizar a senha, o fluxo conduz primeiro ao desafio TOTP `/admin-dashboard/mfa/verify` antes de invocar `supabase.auth.updateUser({ password })`.
- **admin-recovery/AC-05**: Preservacao absoluta da guarda de APIs de negocio: `assertAdminApiAuth` nao contem excecoes amplas para rotas administrativas, exigindo rigorosamente AAL2 para todas as operacoes de negocio (`/api/admin/ofertas/*`, etc.). Apos a conclusao da atualizacao de senha, tentativas de navegar para `/admin-dashboard` ou acionar APIs de negocio sob nivel AAL1 sao barradas: se o usuario possui fator TOTP ativo, o servidor forca redirecionamento para `/admin-dashboard/mfa/verify`; se nao possui fator ativo, forca redirecionamento para `/admin-dashboard/mfa/setup`. APIs administrativas de negocio recusam chamadas em AAL1 com HTTP 403.
- **admin-recovery/AC-06**: O incidente de perda de autenticador TOTP nao possui endpoint publico ou botao na interface web comum, sendo atendido exclusivamente por script operacional auditado (`scripts/admin-reset-mfa.mjs`) que utiliza a API administrativa suportada `supabase.auth.admin.mfa.deleteFactor({ id: factorId, userId: env.adminUserId })` com confirmacao do UUID fixo do administrador antes da exclusao.
- **admin-recovery/AC-07**: O procedimento de contingencia registra que a exclusao administrativa do fator verificado encerra as sessoes ativas no Supabase Auth, formaliza a janela de validade residual dos tokens JWT de acesso ja emitidos (ate `jwt_expiry`) como horizonte temporal de contencao, e comprova que a proxima autenticacao bem sucedida por senha identifica ausencia de fator e direciona o administrador para `/admin-dashboard/mfa/setup` para nova matricula.
- **admin-recovery/AC-08**: A suite de testes e o script operacional executam o ciclo completo em ambiente local isolado e registram evidencias auditaveis sem jamais incluir senhas em texto plano, tokens de sessao, links de recuperacao com hash/code ou segredos TOTP nos logs de teste, relatorios ou artefatos de review. Sob indisponibilidade do Auth, respostas de erro respondem fail closed com HTTP 503 sanitizado.

- **admin-recovery/AC-09**: O fluxo de recuperação opera sob uma permissão de escada separada da sessão de trabalho diário: a solicitação (`POST /api/admin/auth/recovery`) e o callback (`GET /api/admin/auth/recovery/callback`) não exigem sessão Supabase prévia e não dependem de `assertAdminApiAuth`, que permanece restrito a AAL2 para operações de negócio. A atualização de senha (`POST /api/admin/auth/recovery/update-password`) utiliza o guard dedicado `assertRecoverySessionAuth` — nunca `assertAdminApiAuth` — de modo que o ato de redefinir a credencial primária não seja barrado pela exigência de AAL2 das APIs de negócio, preservando o princípio de que cada etapa do fluxo de recuperação possui seu próprio permissionamento e que nenhuma etapa contorna o segundo fator para acessar o painel.

## Options considered

### Option 1: Implementar codigos de backup gerados e armazenados pela aplicacao

Consistiria em gerar 8 a 10 codigos alfanumericos de uso unico gravados em tabela adicional no Supabase durante a matricula inicial de TOTP, permitindo ao usuario digitar um desses codigos caso perca o celular.

**Pros**:

- Autoatendimento completo para o operador sem necessidade de acionar comando administrativo ou CLI.

**Cons**:

- Introduz tabela adicional com dados sensíveis de autenticacao que precisam de hash criptografico e gerenciamento de ciclo de vida.
- Cria canal alternativo de bypass permanente do aplicativo autenticador, enfraquecendo a postura de seguranca de administrador unico.
- Contraria a decisao previa aprovada na Spec 0007 e no escopo de operacoes.

### Option 2: Fluxo nativo de senha pelo Supabase Auth + API administrativa suportada para TOTP

Consistiria em utilizar estritamente o mecanismo padrao `resetPasswordForEmail` do Supabase para redefinicao de senha, com troca PKCE no callback SSR, mantendo a regra de que a recuperacao de senha nao contorna o MFA, e resolver perda de segundo fator por procedimento privilegiado documentado utilizando a API oficial `supabase.auth.admin.mfa.deleteFactor`, com confirmacao de UUID e auditoria.

**Pros**:

- Nenhuma criacao de mecanismos frageis de backup caseiro ou tabelas extras no banco de dados.
- Aproveitamento total dos contratos nativos do Supabase Auth e GoTrue.
- Preservacao absoluta da escada MFA AAL2 (redefinicao de senha nao pula TOTP).
- Procedimento claro e auditavel utilizando metodos suportados pelo SDK.

**Cons**:

- A perda do TOTP requer acesso privilegiado a CLI/estacao do operador para rearmar o fator.

## Decision

**Chosen option**: Option 2: Fluxo nativo de senha pelo Supabase Auth + API administrativa suportada para TOTP.

A aplicacao confia nos fluxos padrao do Supabase Auth para redefinicao de senha e mantem a barreira AAL2 intacta. Para perda de dispositivo TOTP, a resolucao ocorre por intervencao operacional privilegiada via API administrativa oficial sem exposicao de chaves.

**Implementation skills**: `architect` (`JavaScript-Mastery-Pro/skills`, `.agents/skills/architect/`) · `ponytail` (`local`, `~/.gemini/config/skills/ponytail/`)

## Rationale

A Opcao 2 e a unica compativel com a premissa de minima complexidade e maxima seguranca para um operador unico. O Supabase Auth ja implementa nativamente a geracao de links de recuperacao com validade configuravel e uso unico via email. Como o portal protege apenas uma identidade administrativa autorizada (`ADMIN_USER_ID`), implementar geradores de backup codes na aplicacao geraria debito tecnico de manutencao e risco de brechas sem ganho real.

Ao mesmo tempo, ao desacoplar a recuperacao de senha da dispensa de MFA, garantimos que um atacante que porventura intercepte uma caixa de email ainda seja terminantemente bloqueado na escada TOTP. A remocao via API administrativa oficial `deleteFactor`, acompanhada do encerramento de sessoes e do registro da janela residual dos JWTs emitidos, e o padrao recomendado pela industria para identidades privilegiadas.

## Feature design

### Data model sketch

Nenhuma nova tabela ou coluna e adicionada na camada de aplicacao. O fluxo reaproveita as estruturas nativas do Supabase:

- `auth.users`: atualizacao de `encrypted_password`, atualizacao de `recovery_sent_at` e verificacao de `email_confirmed_at`.
- `auth.mfa_factors`: inspecao e exclusao do fator atraves da API administrativa `auth.admin.mfa.deleteFactor`.
- `auth.sessions`: encerramento automatico das sessoes pelo GoTrue na remocao de fator verificado.

### State transitions

1. **Estado Normal (Autenticado ou Deslogado):**
   - Se o administrador esquecer a senha, acessa `/admin-dashboard/recovery/request`.
2. **Solicitacao de Redefinicao (Sem sessao previa):**
   - Submissao de email em `/api/admin/auth/recovery` (POST) sob protecao de rate limit, admissao Access e validacao estrita de origem (`validateAdminRequestOrigin`).
   - Se o email for igual a `env.adminEmail`, o servidor invoca `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_ORIGIN}/api/admin/auth/recovery/callback` })`.
   - O SDK `@supabase/ssr` gera o `code_verifier` PKCE e o emite via cookies (`setAll`); o route handler propaga esses cookies para o navegador na resposta HTTP.
   - Independentemente de o email coincidir com o administrador, a resposta HTTP 200 devolve mensagem uniforme: "Se o e-mail informado corresponder ao administrador, as instruções foram enviadas".
3. **Recebimento e Troca de Codigo PKCE no Callback SSR (Sem sessao previa):**
   - O GoTrue envia email contendo link de acao com codigo temporario (expiracao de 15 minutos definida por `otp_expiry = 900` no `config.toml`).
   - O clique no link direciona o navegador para `GET /api/admin/auth/recovery/callback?code=...`.
   - A rota opera sob admissao Access na borda, sem exigir sessao Supabase e sem exigir header `Origin` (navegacao GET a partir de email).
   - O route handler do callback recupera o cookie do verificador PKCE no navegador e invoca `supabase.auth.exchangeCodeForSession(code)`.
   - Se o codigo for valido e o verificador estiver presente, converte o codigo temporario em cookies de sessao SSR (`sb-*-auth-token`), e redireciona com status 303 para `/admin-dashboard/recovery/update-password`.
   - Se o link for aberto em outro navegador (sem o cookie do verificador PKCE), a chamada lida com o erro especifico de PKCE e redireciona de forma limpa para `/admin-dashboard/login?error=recovery_verifier_missing`.
   - Codigo expirado, forjado ou reutilizado falha na troca e resulta em redirecionamento para `/admin-dashboard/login?error=recovery_link_invalid`.
4. **Atualizacao de Senha sob Sessao de Recuperacao e Ramificacao de MFA:**
   - A pagina `/admin-dashboard/recovery/update-password` valida que ha sessao autenticada e exibe o formulario de nova senha.
   - O formulario submete POST para `/api/admin/auth/recovery/update-password`.
   - O endpoint valida a origem (`Origin`), valida o rate limit, confirma que `user.id === env.adminUserId` via guard de rota `assertRecoverySessionAuth`, mantendo `assertAdminApiAuth` isolado para regras de negocio.
   - O fluxo avalia a politica do GoTrue:
     - Se o usuario possuir fator TOTP ativo e o GoTrue exigir AAL2 para trocar a senha, o endpoint orienta o redirecionamento para `/admin-dashboard/mfa/verify?redirectTo=/admin-dashboard/recovery/update-password` para cumprir o desafio antes de chamar `updateUser`.
     - Caso o GoTrue aceite a atualizacao sob sessao de recuperacao em AAL1, invoca `supabase.auth.updateUser({ password })`.
5. **Checagem de Segundo Fator Obrigatoria e Bloqueio de AAL1:**
   - Apos a conclusao da atualizacao da senha, se a sessao estiver em nivel AAL1:
     - Havendo fator TOTP ativo: redireciona obrigatoriamente para `/admin-dashboard/mfa/verify`. Acesso ao painel sem o codigo de 6 digitos permanece bloqueado.
     - Nao havendo fator TOTP cadastrado: redireciona para `/admin-dashboard/mfa/setup` para matricula inicial.
   - Toda API de negocio sob `assertAdminApiAuth` recusa chamadas em AAL1 com HTTP 403, comprovando empiricamente que a recuperacao de senha nao contorna o MFA.
6. **Contingencia por Perda de TOTP (Fluxo Privilegiado Fora do Painel):**
   - Caso o operador tenha perdido o aplicativo autenticador e nao consiga superar o AAL1:
     - O operador executa o script local documentado `scripts/admin-reset-mfa.mjs` utilizando credencial administrativa oficial (service role restrita ao processo local).
     - O script consulta os fatores do usuario atraves de `supabase.auth.admin.mfa.listFactors({ userId: env.adminUserId })`, confirmando a identidade e localizando o fator TOTP a remover.
     - O script invoca `supabase.auth.admin.mfa.deleteFactor({ id: factorId, userId: env.adminUserId })`. Conforme documentacao do GoTrue, a remocao de fator verificado encerra automaticamente as sessoes ativas.
     - O runbook registra o timestamp da operacao e a janela residual de tolerancia dos tokens de acesso JWT emitidos (maximo igual a `jwt_expiry`).
     - No proximo login por senha, o operador tem sua credencial aceita, a avaliacao da escada detecta ausencia de fatores e direciona para `/admin-dashboard/mfa/setup`, onde cadastra seu novo aparelho e eleva para AAL2.

### API surface

| Endpoint                                   | Metodo | Entradas chave        | Saidas chave                         | Autenticacao               | Erros chave        |
| ------------------------------------------ | ------ | --------------------- | ------------------------------------ | -------------------------- | ------------------ |
| `/api/admin/auth/recovery`                 | POST   | `email`               | `{ ok: true, message: string }`      | Sem sessao (sob Access)    | 400, 403, 429, 500 |
| `/api/admin/auth/recovery/callback`        | GET    | `code` (query)        | Redirecionamento 303 com cookies SSR | Sem sessao (sob Access)    | 303 (login erro)   |
| `/api/admin/auth/recovery/update-password` | POST   | `password`, `confirm` | Redirecionamento 303 para MFA        | Sessao recuperacao (guard) | 400, 401, 403, 500 |

### Permissoes e Isolamento de Guards

Para evitar que uma excecao ampla enfraqueca a protecao das operacoes de negocio, a guarda principal `assertAdminApiAuth` permanece dedicada exclusivamente a exigir AAL2 nas APIs de negocio (`/api/admin/ofertas/*`, `/api/admin/artigos/*`, etc.):

- **Rotas sem sessao Supabase (admitidas pelo Access na borda):**
  - `/api/admin/auth/login` (POST com validacao de origem)
  - `/api/admin/auth/recovery` (POST com validacao de origem e rate limit)
  - `/api/admin/auth/recovery/callback` (GET sem exigencia de `Origin`, com troca de codigo PKCE)
- **Rotas com verificacoes granulares dedicadas do fluxo de autenticacao:**
  - `/api/admin/auth/recovery/update-password` utiliza `assertRecoverySessionAuth` (valida sessao ativa do administrador unico, conferindo o nivel exigido pelo GoTrue).
  - `/api/admin/auth/mfa/enroll` e `/api/admin/auth/mfa/verify` utilizam guards especificos da escada MFA sob AAL1.
  - `/api/admin/auth/logout` admite qualquer sessao autenticada (AAL1 ou AAL2) para destruicao de cookies.
- **APIs de negocio sob `assertAdminApiAuth`:**
  - Exigem inegociavelmente AAL2 e identidade do administrador unico. Chamadas sob AAL1 recebem HTTP 403 ("Autenticação de segundo fator (MFA/AAL2) obrigatória").

### Value sourcing

| Acao                       | Valor produzido / verificado | Origem                                                              |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Solicitacao de recuperacao | Disparo de email com codigo  | GoTrue nativo via `supabase.auth.resetPasswordForEmail`             |
| Verificador PKCE           | Cookie `sb-*-code-verifier`  | Gerado pelo `@supabase/ssr` e propagado via headers `setAll`        |
| Validacao de email         | Comparacao de email          | Comparado estritamente com `env.adminEmail` de `lib/env.ts`         |
| Origem da requisicao       | Confirmacao de origem        | `validateAdminRequestOrigin` em mutacoes POST                       |
| Troca de codigo PKCE       | Sessao SSR emitida           | `supabase.auth.exchangeCodeForSession(code)` no callback SSR        |
| Atualizacao de senha       | Hash atualizado da senha     | `supabase.auth.updateUser({ password })`                            |
| Validacao de identidade    | Confirmacao do operador      | Checagem estrita de `user.id === env.adminUserId`                   |
| Nivel resultante de sessao | `currentAal === 'aal1'`      | Avaliado por `getAuthenticatorAssuranceLevel` no cliente SSR        |
| Redefinicao de TOTP        | Fator excluido e sessao off  | API administrativa suportada `supabase.auth.admin.mfa.deleteFactor` |

### Key invariants

- As rotas `/api/admin/auth/recovery` e `/api/admin/auth/recovery/callback` funcionam sem sessao Supabase previa, sob a barreira de borda do Cloudflare Access.
- A rota `/api/admin/auth/recovery` responde com mensagem rigorosamente uniforme de sucesso mesmo que o email fornecido nao coincida, prevenindo enumeracao de contas de administrador.
- O verificador PKCE e persistido em cookie de resposta na solicitacao e exigido no callback; acessos em navegadores diferentes ou janelas anonimas falham graciosamente sem 500.
- O link de recuperacao encaminhado por email transporta um codigo de uso unico que so pode ser trocado por sessao uma unica vez; reutilizacao e rejeitada com redirecionamento de erro.
- A conclusao da redefinicao de senha nunca promove a sessao para AAL2 diretamente. A sessao resultante e AAL1 e nao tem permissao para carregar o painel ou disparar chamadas a APIs protegidas de negocio.
- O guard `assertAdminApiAuth` permanece estrito a AAL2 sem excecoes genericas; rotas de autenticacao possuem seus proprios guards especificos.
- O procedimento de contingencia para perda de TOTP jamais roda a partir de acoes publicas ou botoes desprotegidos na web, exigindo comando deliberado via API administrativa oficial em estacao confiavel.
- O encerramento de sessoes via `deleteFactor` deve considerar o tempo de vida residual dos JWTs de acesso ja emitidos antes de considerar a sessao antiga completamente extinta na borda.

### Security model

- Dupla barreira preservada: todas as requisicoes de recuperacao continuam exigindo admissao valida no Cloudflare Access na borda antes de alcancar a aplicacao Next.js.
- Protecao contra sequestro de conta: mesmo com controle temporario da caixa de entrada de email, o invasor nao consegue acessar informacoes administrativas sem o segredo TOTP em maos.
- Isolamento de segredos: nenhum link de redefinicao gerado em testes ou em operacao e persistido em arquivos de log, relatorios de verificacao ou repositorios de codigo.
- Rate limiting dedicado para prevencao de ataques de forca bruta em solicitacao de recuperacao e atualizacao de senha.

### Configuration required

- Diretiva `otp_expiry = 900` em `supabase/config.toml` sob `[auth.email]`, definindo o tempo maximo de 15 minutos para consumo do codigo/link de recuperacao.

### Critical test scenarios

- **Cenario 1: Solicitacao com resposta uniforme e envio de email (admin-recovery/AC-01)**: Solicitacao com o email correto dispara o fluxo nativo e propaga cookie do verificador PKCE; solicitacao com email desconhecido responde exatamente com o mesmo status 200 e mesma mensagem, sem vazamento de informacao.
- **Cenario 2: Troca de codigo no callback e consumo unico (admin-recovery/AC-02, AC-03)**: Consumo do codigo valido com o cookie PKCE estabelece sessao SSR; tentativa subsequente de reutilizar o mesmo codigo e rejeitada com redirecionamento de erro.
- **Cenario 3: Callback sem verificador PKCE / navegador distinto (admin-recovery/AC-03)**: Acesso ao link de callback em sessao/navegador sem o cookie `code_verifier` intercepta o erro graciosamente e redireciona para login com erro `recovery_verifier_missing` sem crash da aplicacao.
- **Cenario 4: Bloqueio estrito de AAL1 apos redefinicao com TOTP ja ativo (admin-recovery/AC-04, AC-05)**: Apos atualizar a senha, o administrador com TOTP ativo tenta acessar `/admin-dashboard` e e barrado com redirecionamento para o desafio TOTP `/admin-dashboard/mfa/verify`, enquanto chamada a API protegida de negocio `/api/admin/ofertas` retorna HTTP 403 via `assertAdminApiAuth`.
- **Cenario 5: Bifurcacao GoTrue para updateUser com TOTP ativo (admin-recovery/AC-04)**: Se o GoTrue local exigir AAL2 para trocar senha sob MFA ativo, o fluxo conduz primeiro ao desafio TOTP antes de executar a mutacao.
- **Cenario 6: Contingencia de perda de TOTP via API administrativa (admin-recovery/AC-06, AC-07)**: Execucao do script operacional invoca `deleteFactor` na API administrativa do Supabase com o UUID correto, remove o fator verificado, encerra sessoes e direciona o proximo login para `/admin-dashboard/mfa/setup` para nova matricula limpa.
- **Cenario 7: Higiene absoluta de evidencias (admin-recovery/AC-08)**: A suite de testes executa todo o ciclo em contêiner descartavel e valida que nenhum token, link com codigo ou segredo TOTP foi impresso em stdout ou gravado em artefatos rastreados.
- **Cenario 8: Isolamento de guards por etapa (admin-recovery/AC-09)**: Comprova que `POST /api/admin/auth/recovery` e `GET /api/admin/auth/recovery/callback` operam sem depender de `assertAdminApiAuth` (que exige AAL2) e que `POST /api/admin/auth/recovery/update-password` utiliza exclusivamente `assertRecoverySessionAuth`, nunca `assertAdminApiAuth` — ou seja, o ato de redefinir a senha não fica bloqueado pela exigência de segundo fator das APIs de negócio, e cada etapa possui seu próprio permissionamento.

## Build plan

1. Configurar `otp_expiry = 900` em `supabase/config.toml` sob `[auth.email]` e adicionar `/api/admin/auth/recovery/callback` na lista de rotas autorizadas, satisfaz **admin-recovery/AC-01**, **admin-recovery/AC-02**.
2. Criar tela de solicitacao de recuperacao em `app/admin-dashboard/recovery/request/page.tsx` e endpoint em `app/api/admin/auth/recovery/route.ts` sem sessao previa, com rate limit, validacao de origem e propagacao dos cookies do verificador PKCE (`setAll`), satisfaz **admin-recovery/AC-01**, **admin-recovery/AC-08**.
3. Implementar route handler de callback SSR em `app/api/admin/auth/recovery/callback/route.ts` sem sessao previa e sem checagem de Origin em GET, com leitura do verificador PKCE, tratamento de erro para verificador ausente (cross-browser) e codigo invalido/expirado, satisfaz **admin-recovery/AC-03**.
4. Criar tela `app/admin-dashboard/recovery/update-password/page.tsx` e endpoint `app/api/admin/auth/recovery/update-password/route.ts` com validacao de `user.id === env.adminUserId`, guard isolado `assertRecoverySessionAuth` e suporte a ramificacao de AAL2 previa se exigida pelo GoTrue, satisfaz **admin-recovery/AC-04**.
5. Manter a guarda de rotas de negocio `assertAdminApiAuth` restrita estritamente a AAL2, sem excecoes amplas para rotas administrativas, satisfaz **admin-recovery/AC-05**.
6. Criar script operacional auditado `scripts/admin-reset-mfa.mjs` utilizando `supabase.auth.admin.mfa.deleteFactor` com verificacao de UUID para contingencia de perda de TOTP, satisfaz **admin-recovery/AC-06**, **admin-recovery/AC-07**.
7. Implementar testes automatizados de integracao e E2E Playwright cobrindo os cenarios criticos de recuperacao e contingencia com verificacao de higienizacao de logs e de isolamento de guards por etapa, satisfaz **admin-recovery/AC-01** a **admin-recovery/AC-09**.

## Consequences

**Positive**:

- Capacidade formal de recuperacao de credencial esquecida sem abrir mao da barreira inegociavel do segundo fator.
- Procedimento operacional seguro, suportado e auditado para o pior cenario de perda de autenticador, sem exclusoes arriscadas via SQL direto.
- Zero adicao de tabelas ou esquemas proprietarios na aplicacao.

**Negative / tradeoffs**:

- A perda de TOTP continua exigindo intervencao privilegiada via terminal/script pelo operador responsavel.
- Tokens JWT de acesso previamente emitidos possuem janela de validade residual ate a expiracao natural.

**Neutral**:

- Exige teste de envio/captura de email em ambiente local via servidor de desenvolvimento do GoTrue (Inbucket local na porta 54324).

## Follow-up

- [ ] Submeter spec 0019 para aceite do proprietario antes de iniciar a construcao em `/develop`.
- [ ] Conectar os novos endpoints ao roteamento do painel administrativo e atualizar o mapa do escopo.

## References

**Project sources**:

- `AGENTS.md`: regras de seguranca e convencoes de autenticacao administrativa.
- `docs/specs/2026-10-14-2150-0018-ambiente-local-login-mfa.md`: base da arquitetura de login, MFA e isolamento de testes.
- `docs/specs/2026-10-09-0842-endurecimento-auth-admin.md`: decisao previa sobre recuperacao manual sem endpoint publico.
- `docs/scope/2026-10-14-2135-backend-auth-operacoes.md`: planejamento ordenado da Phase 2.

**Practices & standards**:

- OWASP Authentication and Password Management Cheat Sheet.
- NIST SP 800-63B: Digital Identity Guidelines (Authentication and Lifecycle Management).
- Supabase Auth Native Recovery Flow with OTP Expiration and PKCE Code Exchange.
- Supabase Auth Admin API: deleteFactor and session revocation semantics.
