# 0007. Painel administrativo /admin-dashboard adaptado do TailAdmin com Supabase Auth

**Date**: 2026-10-08
**Status**: Accepted
**Decision source**: Instrução explícita do proprietário em 2026-10-08 via chat do projeto

## Summary

Esta decisão aprova a implementação de um painel administrativo exclusivo para o proprietário em `/admin-dashboard`. A interface utiliza componentes visuais adaptados do template TailAdmin 2.4.0 com licença MIT preservada. O controle de acesso é gerido pelo Supabase Auth através de validação estrita no servidor com base no identificador único (UUID) fixo da conta do proprietário, sem permitir cadastro de leitores nem login público. A edição editorial de artigos permanece exclusivamente no Sanity Studio, funcionando o painel como centro de navegação operacional e atalho para o preview seguro.

## Context

A decisão anterior do projeto estabelecia a ausência total de painel administrativo dentro da aplicação Next.js, mantendo todo o fluxo operacional dividido entre o Sanity Studio e o repositório de código. Contudo, a necessidade de centralizar a navegação operacional, atalhos de produção, links para o Sanity Studio e acionamento seguro do preview motivou a decisão de introduzir uma casca administrativa sob `/admin-dashboard`.

O repositório recebeu o pacote de template TailAdmin 2.4.0 (baseado em Next.js, React, TypeScript e Tailwind CSS), que oferece layout visual e formulário de login, mas não contém infraestrutura de autenticação funcional ou regras de autorização reais. Mover o template inteiro de forma monolítica para dentro da pasta `app/` traria complexidade desnecessária, código morto (telas de comércio eletrônico, mapas, calendários e gráficos fictícios), potenciais conflitos de dependências com o portal de leitura e riscos de segurança.

Adicionalmente, o portal não possui e não terá cadastro ou login para leitores. Logo, a camada de autenticação deve ser estritamente unária, voltada exclusivamente para a conta do administrador (`a3qua96@gmail.com`). O acesso deve ser conferido com validações no servidor através de `auth.getUser()` do Supabase, sem nunca confiar em dados do cliente ou apenas em `getSession()`.

## Requirements

**User stories**:

- Como administrador único do portal, quero acessar uma interface administrativa moderna em `/admin-dashboard` para navegar por atalhos operacionais, acessar o Sanity Studio e acionar o preview seguro de artigos sem misturar o painel com as páginas públicas de leitura.
- Como administrador único, quero autenticar minha conta no Supabase Auth com proteção no servidor e segundo fator para que usuários anônimos ou invasores sejam impedidos de visualizar telas e disparar ações internas.

**Acceptance criteria**:

- **admin/AC-01**: Requisições anônimas para qualquer rota sob `/admin-dashboard/(protegido)/*` devem ser interceptadas no servidor e redirecionadas para `/admin-dashboard/login` com status HTTP 307 ou 303.
- **admin/AC-02**: A autorização deve exigir obrigatoriamente a configuração do UUID administrativo no servidor (variável `ADMIN_USER_ID`). Se a configuração estiver ausente ou vazia, o sistema deve falhar fechado negando o acesso com erro de configuração no servidor. A autorização deve validar a sessão com `auth.getUser()` e exigir correspondência estrita com o UUID administrativo configurado, **nunca autorizando apenas pelo endereço de e-mail** nem aceitando dados mutáveis pelo cliente (`user_metadata`). Qualquer outro usuário autenticado com UUID divergente deve ser sumariamente negado com status HTTP 403.
- **admin/AC-03**: A proteção por layout em `app/admin-dashboard/(protegido)/layout.tsx` protege apenas a renderização visual das páginas e **não substitui** a guarda de autorização em Route Handlers, Server Actions, mutações de dados e ativação de preview. Cada endpoint ou ação sob `/api/admin/*` ou acessada pelo painel deve invocar independentemente a guarda no servidor, retornando 401 ou 403 em caso de falha de autorização.
- **admin/AC-04**: O segundo fator de autenticação (MFA) é mandatória e estritamente exigido em camadas:
  a) **Sem fator cadastrado:** Sessão autenticada apenas com senha tem permissão restrita e exclusiva para acessar o fluxo de configuração e registro de TOTP (`/admin-dashboard/mfa/setup`), sendo bloqueada de acessar o dashboard ou disparar operações administrativas;
  b) **Com sessão AAL1 (fator já cadastrado):** Permissão restrita unicamente à tela de desafio e verificação do segundo fator (`/admin-dashboard/mfa/verify`) e ao encerramento de sessão (logout);
  c) **Acesso pleno ao dashboard, APIs e emissão de preview:** Exige cumulativamente UUID administrativo autorizado (`user.id === ADMIN_USER_ID`) **e nível AAL2** (`aal === 'aal2'`).
- **admin/AC-05**: As operações de login e logout via POST devem validar estritamente a origem da requisição (`Origin` e `Referer` contra `SITE_ORIGIN`), aplicar limitação de taxa (rate limiting) contra tentativas de força bruta no login, e aceitar exclusivamente redirecionamentos para `/admin-dashboard` ou rotas filhas iniciadas com `/admin-dashboard/` (`target === '/admin-dashboard' || target.startsWith('/admin-dashboard/')`), rejeitando terminantemente prefixos colidentes (como `/admin-dashboard-falso`) ou URLs externas contra open redirect.
- **admin/AC-06**: Cadastro público de usuários deve permanecer expressamente desabilitado no Supabase. O formulário de login não deve conter link para registro e qualquer tentativa de inscrição direta via API deve ser recusada.
- **admin/AC-07**: O template original TailAdmin 2.4.0 deve ser preservado integralmente na pasta de referências (`referencias/template-admin-dashboard/`) mantendo seus avisos de copyright e licença MIT. Componentes adaptados devem ser isolados em `components/admin/`, `lib/admin/`, `public/admin/` e `app/admin-dashboard/`, sem importar arquivos de configuração raiz ou dependências legadas do template.
- **admin/AC-08**: Recursos não relacionados ao propósito administrativo do portal (comércio eletrônico, gráficos analíticos simulados, mapas interativos, calendários de eventos e login social) devem ser excluídos da árvore compilada. Todos os textos da interface administrativa ativa devem estar em português do Brasil (pt-BR).
- **admin/AC-09**: Nenhuma senha em texto puro deve ser armazenada no código fonte, fixtures, migrations, seeds, repositório Git ou relatórios. A definição inicial e redefinições de senha devem utilizar o fluxo de convite ou recuperação oficial do Supabase Auth enviado diretamente ao e-mail do proprietário.
- **admin/AC-10**: O painel inicial em `/admin-dashboard` deve fornecer atalhos operacionais válidos para o Sanity Studio e link para emissão de preview seguro conforme o contrato da spec 0006. O painel administrativo não deve criar um segundo editor de artigos nem duplicar a interface de edição do Sanity.
- **admin/AC-11**: Todas as rotas sob `/admin-dashboard` devem emitir cabeçalhos HTTP com `Cache-Control: private, no-store` e proteção contra indexação (`X-Robots-Tag: noindex, nofollow`). O arquivo `app/robots.ts` deve conter regra explícita de `Disallow: /admin-dashboard/`.
- **admin/AC-12**: O botão de encerramento de sessão (logout) deve disparar requisição POST com validação de origem, encerrar a sessão no Supabase Auth no servidor, remover todos os cookies de sessão associados e redirecionar para `/admin-dashboard/login`.
- **admin/AC-13**: Os elementos de interface adaptados (menu lateral retrátil, cabeçalho de navegação e formulário de login) devem suportar navegação completa via teclado e atender aos critérios de contraste e semântica de acessibilidade WCAG AA.
- **admin/AC-14**: Cláusula de Delimitação de Verificação — Os testes locais automatizados comprovam a lógica do código da aplicação, redirecionamentos, guards de rota e rejeição de credenciais inválidas. **A desativação efetiva de cadastro público no console do Supabase e as proteções perimetrais do Cloudflare Worker não devem ser declaradas como verificadas unicamente por testes locais com mocks**, permanecendo como itens de verificação na infraestrutura real.

## Options considered

### Opção 1: Sem painel próprio (manter apenas o Sanity Studio)

Manter a regra anterior estipulando que o portal não possui nenhuma tela administrativa própria no Next.js e que qualquer atividade é conduzida diretamente no Sanity Studio ou na linha de comando.

**Pros**:

- Menor superfície de código na aplicação Next.js.
- Zero rotas adicionais a proteger com autenticação.

**Cons**:

- Ausência de um ponto centralizado para links rápidos de status, disparadores de preview e atalhos de monitoramento no domínio do portal.
- Dependência de múltiplos favoritos ou URLs dispersas para o operador.

### Opção 2: Painel administrativo adaptado do TailAdmin 2.4.0 sob /admin-dashboard (Opção Escolhida)

Adaptar cirurgicamente componentes de layout, sidebar, cabeçalho e formulário de acesso do TailAdmin 2.4.0, descartando telas de comércio e gráficos fictícios. Implementar a autenticação sobre o Supabase Auth com verificação no servidor baseada no UUID do administrador único com exigência de MFA e guarda em cada operação.

**Pros**:

- Interface visual moderna, responsiva e profissional sem custo de desenhar componentes do zero.
- Isolamento arquitetural completo em relação ao blog público através do grupo de rotas `(protegido)`.
- Segurança robusta com defesa em profundidade: checagem de UUID fixo (fail-closed), validação de origem, rate limit, sanitização de redirect e verificação de MFA (AAL2).
- Respeito à licença MIT e arquivamento limpo em pasta de referências.

**Cons**:

- Necessidade de isolar estilos e classes Tailwind para evitar vazamentos de regras cosméticas para o leitor do blog.
- Exige suíte de testes de autenticação e proteção de rotas dedicada.

### Opção 3: Importação direta e monolítica do template TailAdmin na raiz da aplicação

Copiar a pasta inteira do template para dentro de `app/` e adicionar todas as dependências do `package.json` do TailAdmin ao projeto principal.

**Pros**:

- Rápida exibição de todas as telas demonstrativas do template original.

**Cons**:

- Poluição severa do projeto com dezenas de bibliotecas desnecessárias (ApexCharts, jsvectormap, Flatpickr).
- Criação de conflitos de dependências e quebra dos portões de qualidade (`check:all` e `audit`).
- Alto risco de exposição acidental de rotas não protegidas ou vulneráveis.

## Decision

**Chosen option**: Opção 2: Painel administrativo adaptado do TailAdmin 2.4.0 sob /admin-dashboard.

O portal adotará uma área administrativa dedicada em `/admin-dashboard`, reaproveitando a biblioteca de componentes visuais do TailAdmin 2.4.0 de forma seletiva e limpa, sob proteção estrita do Supabase Auth com autorização restrita ao UUID do proprietário, MFA efetivamente exigido e guarda independente em cada operação.

## Rationale

A Opção 2 concilia a conveniência de uma interface visual pronta e agradável com o rigor de engenharia exigido pelo projeto. Em vez de inflar o `package.json` com dependências de terceiros para gráficos e mapas inexistentes no domínio do portal, são importados apenas os blocos estruturais necessários (sidebar, header, breadcrumbs, inputs e cards operacionais).

O modelo de segurança é reforçado com garantias mandatórias:

1. **Falha fechada sem UUID**: A ausência da variável com o UUID do administrador impede qualquer acesso administrativo, evitando que bugs de mock ou checagens parciais de e-mail abram o painel.
2. **Defesa em profundidade**: Proteger o layout é apenas a primeira camada; cada Route Handler e Server Action invoca a mesma guarda, impedindo que requisições diretas burlem a casca visual.
3. **MFA ativo**: Não basta permitir MFA; a sessão deve estar no nível AAL2 para que mutações e páginas administrativas sejam acessíveis.
4. **Proteção contra Open Redirect e Força Bruta**: O fluxo de login valida a origem e restringe o redirecionamento a caminhos internos `/admin-dashboard`.

## Feature design

**Estrutura de diretórios e arquivos**:

```text
referencias/template-admin-dashboard/    <- Cópia integral do template original com licença MIT
app/
  admin-dashboard/
    layout.tsx                          <- Contexto de tema e estilos da casca administrativa
    login/
      page.tsx                          <- Formulário de acesso visual TailAdmin
    (protegido)/
      layout.tsx                        <- Guard visual no servidor (requireAdminAuth)
      page.tsx                          <- Dashboard principal com atalhos operacionais
components/admin/                       <- Sidebar, Header, Breadcrumb adaptados
lib/admin/
  auth.ts                               <- Helper central de autorização no servidor (requireAdminAuth)
public/admin/                           <- Ícones e ilustrações necessárias do template
```

**API surface**:

| Endpoint                  | Método   | Entrada                     | Saída                | Autorização                                          | Erros                   |
| ------------------------- | -------- | --------------------------- | -------------------- | ---------------------------------------------------- | ----------------------- |
| `/admin-dashboard/login`  | GET      | Nenhuma                     | Página HTML          | Pública                                              | 200                     |
| `/admin-dashboard`        | GET      | Cookie de sessão            | Página HTML          | Exclusivo admin (`UUID` conferido + MFA)             | 307 (redireciona login) |
| `/api/admin/auth/login`   | POST     | email, password, redirectTo | Redirecionamento 303 | Pública com rate limit e validação de origem         | 400, 401, 429           |
| `/api/admin/auth/logout`  | POST     | Cookie de sessão            | Redirecionamento 303 | Autenticado com validação de origem                  | 400, 401, 500           |
| `/api/admin/*` (handlers) | Qualquer | Dados da operação           | JSON                 | Guarda individual no servidor via `requireAdminAuth` | 401, 403, 500           |

**Value sourcing**:

| Ação                      | Valor produzido ou exibido          | Origem do valor                                                        |
| ------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Renderização do Dashboard | Nome e e-mail do operador           | `user.email` retornado por `supabase.auth.getUser()`                   |
| Verificação de Acesso     | Autorização de entrada              | Comparação entre `user.id` e `ADMIN_USER_ID` do servidor (fail-closed) |
| Verificação de MFA        | Nível de garantia da sessão         | `user.app_metadata.aal` ou `authenticator_assurance_level` no token    |
| Atalho do Sanity Studio   | URL do Studio                       | Variável de ambiente `NEXT_PUBLIC_SANITY_STUDIO_URL` ou link oficial   |
| Disparo de Preview Seguro | Sessão de visualização de rascunhos | Endpoint `/api/preview` gerando sessão no Durable Object               |

**Key invariants**:

- Se `ADMIN_USER_ID` não estiver configurado no servidor, todas as rotas e handlers administrativos devem rejeitar a requisição com erro seguro (fail-closed).
- A correspondência de autorização é feita exclusivamente por `user.id === ADMIN_USER_ID`; nunca autorizar por e-mail, domínio ou metadados de usuário (`user_metadata`).
- Cada Route Handler e Server Action administrativo deve chamar explicitamente `requireAdminAuth()`, independentemente da existência do layout protegido.
- O MFA é exigido em camadas restritivas: sem fator cadastrado permite apenas o fluxo protegido de setup (`/admin-dashboard/mfa/setup`); com sessão AAL1 e fator registrado permite apenas o desafio (`/admin-dashboard/mfa/verify`) e logout; acesso ao dashboard, APIs e preview exige cumulativamente UUID autorizado e nível AAL2.
- Redirecionamentos pós-login e de retorno só aceitam destinos internos sanitizados que correspondam exatamente a `/admin-dashboard` ou iniciem com `/admin-dashboard/` (`target === '/admin-dashboard' || target.startsWith('/admin-dashboard/')`), rejeitando terminantemente prefixos colidentes (como `/admin-dashboard-falso`) ou esquemas externos contra open redirect.
- O portal não permite criação de conta pública de leitor; tentativas de disparo de `signUp` são rejeitadas.

**Security model**:

- O painel é reservado exclusivamente para o UUID da conta `a3qua96@gmail.com`.
- Todas as respostas de páginas e endpoints administrativos emitem `Cache-Control: private, no-store` e `X-Robots-Tag: noindex, nofollow`.
- Nenhuma senha em texto puro trafega pelo repositório. O cadastro da senha é efetuado pelo próprio administrador via convite por e-mail ou link de recuperação gerado pelo Supabase.

**Critical test scenarios**:

- Tentativa de acesso anônimo a `/admin-dashboard` deve redirecionar para `/admin-dashboard/login`, verificando **admin/AC-01**.
- Tentativa de acesso com usuário autenticado cujo UUID seja diferente de `ADMIN_USER_ID` deve ser sumariamente negada com 403, verificando **admin/AC-02**.
- Tentativa de acesso quando `ADMIN_USER_ID` está ausente do servidor deve falhar fechado com erro 500/403, verificando **admin/AC-02**.
- Acesso direto a Route Handler em `/api/admin/*` sem sessão administrativa válida deve retornar 401 ou 403, verificando **admin/AC-03**.
- Sessão de administrador sem o segundo fator de autenticação concluído (AAL1 quando MFA registrado) deve ser impedida de acessar área protegida, verificando **admin/AC-04**.
- Tentativa de login com `redirectTo` externo (`https://evil.com` ou `//evil.com`) deve ser neutralizada redirecionando apenas para `/admin-dashboard`, verificando **admin/AC-05**.
- Tentativa de POST de login ou logout com cabeçalho `Origin` fraudulento deve ser rejeitada com 403, verificando **admin/AC-05**.
- Tentativa de login sob taxa excessiva deve responder 429, verificando **admin/AC-05**.
- Execução de logout legítimo deve invalidar cookies de sessão e redirecionar para a tela de login, verificando **admin/AC-12**.
- Acessibilidade do formulário de login e sidebar retrátil deve passar em testes de navegação por teclado e leitor de tela sem erros de acessibilidade, verificando **admin/AC-13**.

## Build plan

1. Arquivar o template integral em `referencias/template-admin-dashboard/`, preservando licença MIT e créditos originais, satisfazendo **admin/AC-07**.
2. Implementar módulo de autorização e proteção no servidor em `lib/admin/auth.ts` utilizando `auth.getUser()`, checagem de UUID fixo (fail-closed) e verificação de AAL2 para MFA, satisfazendo **admin/AC-02**, **admin/AC-03** e **admin/AC-04**.
3. Construir layout administrativo e casca em `app/admin-dashboard/(protegido)/layout.tsx` e componentes em `components/admin/` adaptando sidebar e header em português com suporte completo a teclado, satisfazendo **admin/AC-07**, **admin/AC-08** e **admin/AC-13**.
4. Implementar formulário de login seguro em `app/admin-dashboard/login/page.tsx` e rota de autenticação em `app/api/admin/auth/login/route.ts` com validação de origem, rate limiting e sanitização de redirect, satisfazendo **admin/AC-01**, **admin/AC-05**, **admin/AC-06** e **admin/AC-09**.
5. Desenvolver a página principal em `app/admin-dashboard/(protegido)/page.tsx` contendo atalhos para Sanity Studio e preview seguro, satisfazendo **admin/AC-10** e **admin/AC-11**.
6. Implementar rota de encerramento de sessão em `app/api/admin/auth/logout/route.ts` com validação de origem e limpeza completa de cookies, satisfazendo **admin/AC-05** e **admin/AC-12**.
7. Configurar proteções de cabeçalhos de resposta (`private, no-store`, `noindex`) e atualizar `app/robots.ts`, satisfazendo **admin/AC-11**.
8. Implementar suíte de testes unitários e de integração validando os cenários críticos: acesso anônimo, administrador válido com MFA, outro usuário autenticado (UUID divergente), sessão expirada, ausência de variável administrativa e requisições diretas às APIs, satisfazendo **admin/AC-01** a **admin/AC-14**.

## Consequences

**Positive**:

- Central de comando administrativo elegante e funcional para o proprietário sob `/admin-dashboard`.
- Eliminação de código morto ao selecionar cirurgicamente apenas os componentes de layout necessários.
- Segurança reforçada através de autenticação validada no servidor com Supabase Auth, UUID fixo, MFA exigido e proteção em profundidade em cada operação.
- Manutenção da separação de responsabilidades: Sanity segue como CMS editorial único e Supabase como guardião da autenticação administrativa.

**Negative / tradeoffs**:

- Acréscimo de rotas adicionais que demandam validação contínua na CI e suíte de testes.
- Cuidado adicional necessário para assegurar que estilos e temas do painel administrativo não causem conflito com as folhas de estilo do portal de artigos.

**Neutral**:

- Nenhuma dependência externa pesada adicionada ao `package.json` principal.
- Não há alteração no fluxo público de leitura de artigos.
