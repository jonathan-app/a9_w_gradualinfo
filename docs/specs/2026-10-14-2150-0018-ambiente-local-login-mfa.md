# 0018. Ambiente local reproduzivel e login administrativo real com MFA

**Date**: 2026-10-14  
**Status**: Accepted  
**Decision source**: Aprovado pelo proprietário após correções de Access, logout e diferenciação AAL1

## Summary

Esta decisao formaliza a execucao local reproduzivel e a cadeia de autenticacao real do painel administrativo. O ambiente local passa a ser executado pelo entrypoint do Cloudflare Worker com validacao criptografica da admissao Access em chaves dedicadas de teste. O acesso ao painel exige autenticacao real no servidor contra o Supabase local com primeiro degrau por senha e segundo degrau obrigatorio por TOTP ate o estado AAL2, eliminando atalhos em tempo de execucao normal. O cadastro publico fica desativado, o mock de sessao fica restrito a testes pontuais com bloqueio permanente em producao, e o logout encerra a sessao no Supabase com remocao dos cookies de autenticacao geridos pelo SDK Supabase SSR.

## Context

A auditoria recente do repositorio identificou fragilidades no isolamento de seguranca local e divergencias entre o ambiente de desenvolvimento e o comportamento de producao. A criacao do cliente Supabase no servidor aceitava um cookie de teste para simular perfil de administrador sem exigir credenciais reais em qualquer ambiente fora de producao. Ao mesmo tempo, o arquivo de configuracao do Supabase local mantinha cadastros publicos abertos, e os testes locais de ponta a ponta executavam sob o servidor padrao do Next sem validar o entrypoint do Worker nem o guard do Cloudflare Access.

Alem disso, a operacao administrativa do portal foi desenhada para uma unica identidade autorizada com exigencia estrita de segundo fator (MFA AAL2). Para que essa garantia seja verdadeira, a stack local precisa permitir o ciclo completo de matricula, desafio TOTP, renovacao de sessao e logout seguro sem depender de mocks que mascarem falhas de permissao ou integracao. O escopo aprovado em `docs/scope/2026-10-14-2135-backend-auth-operacoes.md` estabeleceu como prioridade maxima fechar essas lacunas antes de qualquer expansao funcional de dashboard ou pipeline comercial.

## Requirements

**User stories**:

- Como administrador unico do portal, quero autenticar me com email, senha e codigo TOTP valido em ambiente local reproduzivel, para que nenhuma sessao administrativa seja concedida sem a comprovacao dos dois fatores.
- Como engenheiro responsavel pela seguranca, quero que os testes de admissao Access e autenticacao executem contra o entrypoint do Worker com chaves dedicadas, para que falhas de assinatura, expiracao e audiencia sejam detectadas antes do deploy.
- Como administrador do sistema, quero encerrar minha sessao a qualquer momento com a revogacao dos registros no servidor e remocao dos cookies da aplicacao, para que sessoes encerradas nao permaneçam ativas.

**Acceptance criteria**:

- **admin-auth/AC-01**: O servidor local e o harness de testes executam atraves do entrypoint do Worker (`scripts/cloudflare-worker.ts`). O harness envia JWTs de teste pelo fluxo real de validacao do Worker (`Cf-Access-Jwt-Assertion`), garantindo que o contexto `ADMIN_ACCESS_REQUEST_CONTEXT` seja gerado estritamente apos a validacao criptografica bem sucedida do token contra o JWKS de teste, sem qualquer injecao direta que contorne essa etapa.
- **admin-auth/AC-02**: A admissao local valida tokens JWT contra par de chaves e configuracoes exclusivas do ambiente de teste, rejeitando comprovadamente assinaturas forjadas, tokens expirados, emissores invalidos e audiencias divergentes de `ADMIN_ACCESS_AUD`.
- **admin-auth/AC-03**: A diretiva `enable_signup` e definida como `false` nas secoes `[auth]` e `[auth.email]` do arquivo `supabase/config.toml`, e a simulacao por cookie em `lib/supabase/server.ts` exige a flag explicita `E2E_TEST=1` com bloqueio incondicional caso `NODE_ENV === 'production'`.
- **admin-auth/AC-04**: O endpoint `/api/admin/auth/login` autentica o primeiro degrau (email e senha) contra a API oficial do Supabase Auth no servidor, retornando redirecionamento com erro sanitizado sob credenciais invalidas (senha incorreta) e rejeitando imediatamente qualquer identidade cujo UUID seja divergente de `ADMIN_USER_ID`.
- **admin-auth/AC-05**: A escada de MFA suporta tanto a matrícula inicial de fator TOTP via geração de segredo quanto o desafio subsequente por código de seis dígitos, elevando o contexto para AAL2 somente após confirmação bem-sucedida, e rejeitando códigos incorretos ou reutilizados. Requisições sob nível AAL1 têm tratamento estrito diferenciado por camada: páginas administrativas (`/admin-dashboard` e sub-rotas) são barradas no servidor e redirecionadas para `/admin-dashboard/mfa/verify` (ou `/admin-dashboard/mfa/setup` se não houver TOTP matriculado); requisições a APIs administrativas (`/api/admin/*`) são sumariamente recusadas com HTTP 403 sem executar a operação.
- **admin-auth/AC-06**: A sessao mantem renovacao controlada via refresh token em chamadas autenticadas do proxy, expirando naturalmente quando o tempo de concessao se esgota sem renovacao valida.
- **admin-auth/AC-07**: O endpoint `/api/admin/auth/logout` invoca a revogacao de sessao no Supabase e remove os cookies de autenticacao geridos pelo SDK Supabase SSR (`sb-*-auth-token` e eventuais fragmentos numerados), utilizando os nomes e atributos fornecidos pelo SDK, sem interferir em cookies de outros dominios ou no cookie de identidade de borda do Cloudflare Access.
- **admin-auth/AC-08**: Caso o servico de autenticacao Supabase esteja indisponivel, o sistema opera em modo fail closed, retornando status 503 com mensagem sanitizada e sem expor detalhes internos de conexao.

## Options considered

### Option 1: Manter mocks amplos em desenvolvimento e testar fluxo real apenas em staging

Consistiria em preservar a injecao de cookies de teste para agilizar a navegacao interna em desenvolvimento, deixando a validacao de senha e TOTP para ambientes remotos.

**Pros**:

- Nenhum esforco necessario para configurar credenciais locais no Supabase.
- Fluxo de trabalho rapido para edicoes visuais.

**Cons**:

- Risco permanente de bypass de autenticacao em qualquer maquina de desenvolvimento ou homologacao exposta.
- Impossibilidade de validar bugs de integracao do Supabase SSR e da escada de MFA antes do ambiente remoto.

### Option 2: Inicializacao unificada via Worker entrypoint com login real no Supabase local e isolamento estrito de mocks

Configurar o harness local para rodar sobre o entrypoint do Worker com chaves Access de teste, desativar cadastros publicos no Supabase, restringir mocks a execucoes isoladas de E2E sob flag explicita com bloqueio em producao, e implementar a maquina de estados real de login por senha e TOTP.

**Pros**:

- Paridade estrita entre a execucao local e o comportamento na Cloudflare.
- Validacao real de todo o ciclo de vida da sessao administrativa (senha, TOTP, renovacao, logout).
- Blindagem contra criacao indevida de contas e fechamento de brechas de contorno de sessao.

**Cons**:

- Exige que o Supabase local esteja rodando e com o usuario administrador criado na base de autenticacao.

## Decision

**Chosen option**: Option 2: Inicializacao unificada via Worker entrypoint com login real no Supabase local e isolamento estrito de mocks.

A aplicacao passa a exigir credenciais e fatores reais em todas as execucoes de desenvolvimento normais. A simulação por cookie fica confinada a testes automatizados especificos, sendo terminantemente bloqueada caso a aplicacao esteja em producao.

## Rationale

A opcao 2 elimina a falsa sensacao de seguranca proporcionada por mocks permissivos. Como o Cloudflare Access e o Supabase Auth operam em camadas distintas, confiar em headers estaticos ou cookies injetados mascara defeitos reais de renovacao de token e manipulacao de estado AAL2.

Ao utilizar o proprio entrypoint do Worker (`scripts/cloudflare-worker.ts`) e o cliente oficial do Supabase Auth no servidor, garantimos que cada requisicao administrativa passe pela validacao criptografica do JWT de admissao e pela verificacao estrita dos fatores de autenticacao. Isso protege o projeto contra acessos indevidos e assegura que as futuras telas do dashboard operem sobre uma base solida e confiavel.

## Feature design

### Data model sketch

Nao ha tabelas novas na camada de aplicacao nesta fatia. A autenticacao utiliza as tabelas nativas do schema `auth` do Supabase:

- `auth.users`: registro da identidade do administrador contendo `id` identico ao valor configurado em `ADMIN_USER_ID`, `email` correspondente a `ADMIN_EMAIL`, senha com hash seguro e flag `confirmed_at` preenchida.
- `auth.mfa_factors`: armazena o fator TOTP associado ao usuario, contendo tipo (`totp`), status (`verified` ou `unverified`), segredo em base32 e contador de desafios.
- `auth.sessions`: sessao ativa contendo identificador, refresh token e nivel de garantia de autenticacao (`aal1` ou `aal2`).

### State transitions

O fluxo de autenticacao do administrador obedece a seguinte maquina de estados:

1. **Nao autenticado:** requisicao sem cookies validos. Acesso a `/admin-dashboard/*` redireciona para `/admin-dashboard/login`.
2. **Admissao de Borda:** a requisicao passa pelo Worker entrypoint (`scripts/cloudflare-worker.ts`) com o cabecalho `Cf-Access-Jwt-Assertion`. O token JWT e validado criptograficamente contra o par de chaves de teste; somente apos a confirmacao da assinatura, expiracao e audiencia o contexto `ADMIN_ACCESS_REQUEST_CONTEXT` e anexado aos bindings, sem qualquer atalho ou injecao direta.
3. **Primeiro degrau (AAL1):** usuario submete email e senha em `/api/admin/auth/login`. O servidor invoca `supabase.auth.signInWithPassword`. Senha incorreta devolve redirecionamento com `error=invalid_credentials` sem emitir sessao. Se o UUID diferir de `ADMIN_USER_ID`, a sessao e revogada imediatamente. Se coincidir e a senha for valida, a sessao e iniciada em nivel AAL1.
4. **Verificação de MFA:**
   - Se o usuário ainda não possui TOTP matriculado, redireciona para `/admin-dashboard/mfa/setup` para matrícula inicial e leitura do segredo/QR code.
   - Se o usuário já possui TOTP ativo, redireciona para `/admin-dashboard/mfa/verify` para submissão do desafio de seis dígitos.
5. **Segundo degrau (AAL2) e bloqueio sob AAL1:**
   - Sob nível AAL1, tentativas de carregar páginas protegidas no navegador (`/admin-dashboard` e sub-rotas) são interceptadas pelo layout do servidor e redirecionadas para `/admin-dashboard/mfa/verify` (ou `/admin-dashboard/mfa/setup` conforme o estado do fator).
   - Sob nível AAL1, chamadas a APIs administrativas (`/api/admin/*`) são terminantemente recusadas por `assertAdminApiAuth` com HTTP 403 ("Autenticação de segundo fator (MFA/AAL2) obrigatória") sem executar nenhuma operação ou mutação.
   - O endpoint `/api/admin/auth/mfa/verify` valida o código via `supabase.auth.mfa.challengeAndVerify`. Código incorreto ou reutilizado é rejeitado mantendo o nível AAL1. Sob sucesso, a sessão é promovida ao estado AAL2 e os cookies de autenticação são atualizados, liberando o acesso completo às páginas do dashboard (`/admin-dashboard`) e às APIs protegidas.
6. **Encerramento de sessao (Logout):** ao acionar `/api/admin/auth/logout`, o servidor executa `supabase.auth.signOut` e remove os cookies de autenticacao geridos pelo SDK Supabase SSR (`sb-*-auth-token` e eventuais fragmentos numerados `sb-*-auth-token.*`), aplicando os nomes e atributos fornecidos pelo proprio SDK, retornando para a tela de login.

### API surface

| Endpoint                     | Metodo | Entradas chave                    | Saidas chave                                | Autenticacao            | Erros chave        |
| ---------------------------- | ------ | --------------------------------- | ------------------------------------------- | ----------------------- | ------------------ |
| `/api/admin/auth/login`      | POST   | `email`, `password`, `redirectTo` | Redirecionamento 303 com cookies            | Publica sob Access      | 400, 403, 415, 500 |
| `/api/admin/auth/mfa/verify` | POST   | `code`, `factorId`, `challengeId` | Redirecionamento 303 para dashboard         | Sessao AAL1 sob Access  | 400, 401, 500      |
| `/api/admin/auth/mfa/enroll` | POST   | vazio                             | `qr_code`, `secret`, `factor_id`            | Sessao AAL1 sob Access  | 401, 500           |
| `/api/admin/auth/logout`     | POST   | vazio                             | Redirecionamento 303 com limpeza de cookies | Sessao ativa sob Access | 500                |

### Value sourcing

| Acao                  | Valor produzido / verificado   | Origem                                                                                                   |
| --------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Validacao de admissao | `ADMIN_ACCESS_REQUEST_CONTEXT` | Gerado estritamente apos validacao criptografica bem sucedida do JWT do Access via JWKS no Worker        |
| Login primeiro degrau | Nivel AAL1 e usuario           | Retorno de `supabase.auth.signInWithPassword` validando contra `ADMIN_USER_ID` de `env.ts`               |
| Verificacao TOTP      | Nivel AAL2                     | Retorno de `supabase.auth.mfa.challengeAndVerify`                                                        |
| Emissao de cookies    | Cookies de autenticacao        | Metodos nativos de captura de cookies em `createAdminSessionResponse`                                    |
| Logout                | Expiracao de cookies           | Diretivas `Max-Age=0` nos cookies `sb-*-auth-token` e fragmentos numerados geridos pelo SDK Supabase SSR |

### Key invariants

- O cookie `__e2e_session_role` so e lido quando a variavel de ambiente `E2E_TEST === '1'` estiver presente. Caso `NODE_ENV === 'production'`, o cookie e ignorado mesmo que a variavel esteja ativa.
- A sessão administrativa nunca concede nível AAL2 diretamente pelo primeiro degrau de login. O segundo fator TOTP é mandatório: páginas administrativas (`/admin-dashboard` e sub-rotas) redirecionam para `/admin-dashboard/mfa/verify` (ou `/admin-dashboard/mfa/setup`), enquanto endpoints de API administrativa (`/api/admin/*`) recusam chamadas sob nível AAL1 com HTTP 403.
- Se um usuario valido autenticar com email e senha mas seu identificador interno nao for igual a `env.adminUserId`, o sistema executa `supabase.auth.signOut` imediatamente e recusa a sessao com mensagem generica de credenciais invalidas.
- O logout da aplicacao invalida a sessao no Supabase e remove os cookies de autenticacao geridos pelo SDK Supabase SSR (`sb-*-auth-token` e eventuais fragmentos numerados), utilizando nomes e atributos fornecidos pelo proprio SDK, reconhecendo que a sessao externa do Cloudflare Access pertence a camada de identidade de borda.

### Security model

- O acesso a qualquer rota administrativa exige dupla barreira: admissao valida do Cloudflare Access na borda e sessao autenticada com AAL2 no Supabase.
- A aplicacao nunca expoe chaves de servico (`service_role`) para o navegador. Todas as chamadas de autenticacao administrativa trafegam exclusivamente via Server Components e Route Handlers.
- O rate limiting existente contra forca bruta em login e verificacao de codigo permanece preservado.

### Configuration required

- `E2E_TEST`: flag indicativa de execucao da suite de testes automatizados locais (valor `1`). Opcional em desenvolvimento comum, obrigatoria apenas quando testes simulados isolados forem necessarios.
- `ADMIN_ACCESS_KEY_PAIR`: chaves criptograficas assimetricas em formato JWK utilizadas pelo harness de teste para assinar e validar tokens de teste do Access em ambiente local.

### Critical test scenarios

- **Cenario 1: Sucesso completo de login com MFA (admin-auth/AC-01, AC-04, AC-05)**: O administrador realiza requisicao pelo entrypoint do Worker com admissao valida, fornece credenciais corretas, conclui desafio TOTP com codigo valido de seis digitos e recebe acesso ao painel com sessao AAL2.
- **Cenario 2: Rejeicao de tokens de admissao forjados, expirados ou audiencia incorreta (admin-auth/AC-02)**: Requisicoes com token assinado por chave desconhecida, com timestamp expirado ou com audiencia divergente sao barradas na borda antes de qualquer consulta a aplicacao.
- **Cenario 3: Senha incorreta no primeiro degrau (admin-auth/AC-04)**: Submissao de senha errada em `/api/admin/auth/login` retorna redirecionamento 303 com `error=invalid_credentials`, sem emitir qualquer cookie de sessao.
- **Cenario 4: Codigo TOTP incorreto ou reutilizado (admin-auth/AC-05)**: Submissao de codigo de seis digitos invalido ou ja consumido em `/api/admin/auth/mfa/verify` e rejeitada, impedindo elevacao para AAL2 e mantendo o usuario no desafio.
- **Cenário 5: Bloqueio de sessão AAL1 em páginas e APIs protegidas (admin-auth/AC-05)**: Requisição para páginas administrativas (`/admin-dashboard` e sub-rotas) com sessão em nível AAL1 é interceptada no servidor e redirecionada para `/admin-dashboard/mfa/verify` (ou `/admin-dashboard/mfa/setup` se não houver TOTP matriculado); chamada a endpoints de API administrativa (`/api/admin/*`) sob nível AAL1 é sumariamente recusada com HTTP 403 sem executar a operação.
- **Cenario 6: Identidade autenticada com UUID nao autorizado (admin-auth/AC-04)**: Usuario com conta valida no Supabase mas com identificador diferente de `env.adminUserId` tem a sessao imediatamente revogada via `signOut` e recebe erro de credenciais invalidas.
- **Cenario 7: Logout seguro com remocao de cookies do SDK (admin-auth/AC-07)**: Disparo da rota `/api/admin/auth/logout` invoca `signOut` no Supabase e remove os cookies `sb-*-auth-token` e fragmentos numerados usando nomes e atributos fornecidos pelo SDK Supabase SSR.
- **Cenario 8: Blindagem de mock em producao (admin-auth/AC-03)**: Presenca do cookie `__e2e_session_role` com `NODE_ENV=production` e incondicionalmente ignorada, exigindo autenticacao normal.
- **Cenario 9: Indisponibilidade de servicos fail closed (admin-auth/AC-08)**: Indisponibilidade da API Supabase Auth resulta em resposta padronizada HTTP 503 com erro sanitizado sem expor detalhes internos.

## Build plan

<!-- Slicing Tracer Bullet: implementacao de ponta a ponta da cadeia de autenticacao real -->

1. Ajustar configuracao local do Supabase em `supabase/config.toml` definindo `enable_signup = false` em `[auth]` e `[auth.email]`, satisfazendo **admin-auth/AC-03**.
2. Atualizar `lib/supabase/server.ts` para restringir a leitura de `__e2e_session_role` exclusivamente a presenca de `process.env.E2E_TEST === '1'` mantendo o bloqueio fail closed em producao, satisfazendo **admin-auth/AC-03**.
3. Construir o harness local de teste para admissao Access com gerador de tokens e validador JWKS em chaves isoladas, enviando os JWTs pelo fluxo real do Worker e gerando `ADMIN_ACCESS_REQUEST_CONTEXT` apenas apos a validacao criptografica bem sucedida, satisfazendo **admin-auth/AC-01**, **admin-auth/AC-02**.
4. Validar e refinar o fluxo de submissao de login em `/api/admin/auth/login` e `/api/admin/auth/mfa/verify` para execucao real contra o Supabase local com suporte a matricula inicial e desafio TOTP, satisfazendo **admin-auth/AC-04**, **admin-auth/AC-05**, **admin-auth/AC-08**.
5. Garantir o encerramento seguro em `/api/admin/auth/logout` com limpeza dos cookies de autenticacao gerenciados pelo SDK Supabase SSR (`sb-*-auth-token` e fragmentos numerados) e revogacao de sessao no servidor, satisfazendo **admin-auth/AC-07**.
6. Implementar suíte de testes cobrindo todo o caminho crítico: sucesso com MFA, rejeição de tokens de admissão, senha incorreta, TOTP incorreto ou reutilizado, bloqueio de sessão AAL1 diferenciado entre páginas (redirecionamento para `/admin-dashboard/mfa/verify` ou `/admin-dashboard/mfa/setup`) e APIs (recusa HTTP 403 em `/api/admin/*`), UUID não autorizado, logout seguro e fail closed sob indisponibilidade, satisfazendo **admin-auth/AC-01** a **admin-auth/AC-08**.

## Consequences

**Positive**:

- O sistema elimina qualquer vulnerabilidade de contorno de autenticacao em ambientes de homologacao ou desenvolvimento compartilhado.
- A integracao com Supabase Auth e comprovada empiricamente em maquina real com MFA TOTP.
- A stack local opera em estrita conformidade com o modelo de defesa em profundidade da Cloudflare.

**Negative / tradeoffs**:

- Testes automatizados que dependiam da injecao direta de cookie precisarao executar a autenticacao real ou declarar explicitamente `E2E_TEST=1` no ambiente de teste.

**Neutral**:

- O portal publico (Home e leitor de artigos) permanece 100% inalterado e preservado.

## Follow-up

- [ ] Executar o reset e restart do Supabase local para validar a nova diretiva de bloqueio de cadastros.
- [ ] Criar o script de seed inicial para provisionar a credencial do administrador unico no banco local caso ainda nao exista.

## References

**Project sources**:

- `AGENTS.md` (regras de autenticacao por `ADMIN_USER_ID`, AAL2 e isolamento local)
- `docs/scope/2026-10-14-2135-backend-auth-operacoes.md` (escopo estruturante de backend e login real)
- `docs/specs/2026-10-09-1632-0009-admissao-admin-access.md` (especificacao de admissao Cloudflare Access)
- `docs/audits/2026-10-14-2115-ponytail-audit-backend-admin-ofertas.md` (achados da auditoria Ponytail)

**Practices & standards**:

- OWASP Top 10:2025 A07 (Authentication Failures) e A01 (Broken Access Control)
- RFC 6238 (TOTP: Time Based One Time Password Algorithm)
- Supabase SSR Auth Ladder Guidance (AAL1 vs AAL2)
