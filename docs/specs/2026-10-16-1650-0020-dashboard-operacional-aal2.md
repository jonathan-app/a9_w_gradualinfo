# 0020. Dashboard Operacional de Administração em /admin-dashboard sob Sessão AAL2

**Date**: 2026-10-16
**Status**: Accepted
**Decision source**: Aceite formal do proprietário em 2026-10-16 para a Phase 3 do escopo de backend

## Summary

Esta especificação define o painel administrativo operacional interativo em `/admin-dashboard`, acessível estritamente sob autenticação de dois fatores no nível AAL2. A solução centraliza a inspeção de publicações e rascunhos com disparo de preview seguro, o monitoramento de saúde do sistema com sondagens reais (banco de dados PostgreSQL, Supabase Auth e Sanity CMS), o acompanhamento do módulo de ofertas com histórico de preços e regras estritas de outliers da Spec 0017, e uma central de rotinas operacionais (Action Hub) delimitada para ações seguras de inspeção e diagnóstico, eliminando comandos manuais no terminal sem antecipar mutações complexas de concessão de selo reservadas para a Phase 4.

## Context

Com o encerramento da Spec 0018 (ambiente local reproduzível e autenticação real com MFA) e da Spec 0019 (recuperação administrativa e contingência de segundo fator), a fundação de segurança da área administrativa está estabelecida e testada. O acesso a `/admin-dashboard` está blindado no servidor, exigindo que o operador possua o identificador único administrativo configurado e cumpra o desafio de segundo fator TOTP para atingir o nível AAL2.

Contudo, a página interna atual de `/admin-dashboard` contém apenas cartões estáticos de resumo herdados da casca inicial. O operador do portal necessita de visibilidade contínua sobre a saúde das dependências, capacidade de inspecionar artigos e rascunhos para acionar links de preview autenticado, acompanhamento das ofertas comerciais com suas medianas de preços e status do selo verificado, além de uma central de rotinas operacionais para disparar verificações e diagnósticos sem necessidade de acessar o terminal.

Todas as ações e exibições devem manter a postura defensiva estabelecida no projeto: proteção contra falsificação de requisições entre sites (CSRF), isolamento absoluto de rotas sem expor detalhes internos de banco em falhas, conformidade visual com os tokens em `DESIGN.md` e respeito integral aos portões de qualidade.

## Requirements

**User stories**:

- Como administrador único do portal autenticado em AAL2, quero visualizar a lista completa de artigos publicados e rascunhos editoriais para inspecionar seu estado e gerar links de prévia autenticada sem precisar abrir o banco de dados ou ferramentas de linha de comando.
- Como administrador único, quero acompanhar a saúde operacional das integrações (PostgreSQL, Supabase Auth e Sanity CMS) em um painel unificado com indicadores visuais claros e carimbo de data e hora para diagnosticar eventuais falhas ou degradações de serviço.
- Como administrador único, quero inspecionar as ofertas comerciais ativas, suas medianas calculadas de preços, status do selo e ocorrência de outliers para garantir a integridade das informações exibidas aos leitores.
- Como administrador único, quero acionar rotinas operacionais administrativas seguras com confirmação visual para atualizar diagnósticos de saúde e emitir prévias sem intervenção manual no servidor.

**Acceptance criteria**:

- **admin-dashboard/AC-01**: Acesso restrito exclusivo sob sessão AAL2. Qualquer tentativa de carregar o painel ou suas APIs de suporte sob sessão em AAL1, anônima ou com identificador de usuário divergente de `ADMIN_USER_ID` deve ser sumariamente bloqueada no servidor, redirecionando páginas para o desafio TOTP em `/admin-dashboard/mfa/verify` ou devolvendo HTTP 403 em requisições de API.
- **admin-dashboard/AC-02**: Mesa editorial com consulta autenticada ao Sanity e paginação. O dashboard deve carregar artigos publicados e rascunhos do Sanity Content Lake via consulta GROQ autenticada no servidor utilizando token de leitura quando o Sanity estiver configurado, suportando paginação parametrizada e exibindo título, slug, status editorial, editoria e data de atualização. Deve fornecer estados explícitos para lista vazia e para indisponibilidade da fonte com mensagem sanitizada. O catálogo local fica estritamente restrito ao modo editorial local (`isLocalEditorialMode`).
- **admin-dashboard/AC-03**: Emissão de preview seguro via contrato existente. A listagem editorial deve fornecer acionamento de prévia que consome o endpoint `POST /api/admin/preview`, o qual cria o registro da sessão no Durable Object (`store.createSession`) e assina criptograficamente o cookie `PREVIEW_COOKIE` na resposta de redirecionamento HTTP 303 para `/artigos/[slug]`, sem transferir a responsabilidade de assinatura criptográfica para o Durable Object.
- **admin-dashboard/AC-04**: Monitoramento de saúde operacional com sondagens reais e distinção de falha. O painel deve apresentar indicadores com sondagem real para três componentes fundamentais: banco de dados PostgreSQL (query de verificação), Supabase Auth (`supabase.auth.getUser()`) e Sanity CMS (sondagem GROQ leve via `probeSanityAvailability`). A sondagem do Auth deve distinguir categoricamente sessão inválida/inexistente (retorno sem usuário) de indisponibilidade do serviço Auth (falha de rede/5xx do provedor). Cada indicador deve exibir status explícito (`healthy`, `degraded`, `unavailable` ou `unconfigured`), carimbo de data e hora UTC da última verificação e latência ou mensagem sanitizada, sem incluir métricas não mensuráveis de quotas do Durable Object.
- **admin-dashboard/AC-05**: Painel de ofertas comerciais e histórico de preços via leitura autorizada no servidor. O dashboard deve consultar as ofertas e suas métricas exclusivamente no servidor através de cliente com privilégio de serviço (`service_role`), executado estritamente após a autorização da sessão AAL2 do operador (`ADMIN_USER_ID`), sem repassar chaves privilegiadas ao cliente navegador e projetando apenas os campos permitidos (`id`, `title`, lojista, `price_cents`, mediana histórica calculada e status do selo). O módulo `lib/services/commercial-dashboard.ts` deve conter `import 'server-only'`, usar cliente isolado sem persistência de sessão nem cookies, paginar ofertas/histórico e deduplicar o cálculo da mediana para uma única invocação por combinação de produto, lojista e meio de pagamento. Mediana `null` deve ser tratada como histórico insuficiente, nunca como preço zero. Com chave de serviço ausente, o bloco comercial assume estado `unconfigured`, preservando o restante do painel. A consulta de mediana executa a função SQL `calculate_offer_median` (cujo grant de execução pertence a `service_role`). As RPCs de concessão de selo e operações de mutação de auditoria WORM permanecem inacessíveis pelo navegador nesta fase.
- **admin-dashboard/AC-06**: Detecção e apresentação de outliers conforme regras da Spec 0017. O painel deve consultar no servidor as observações anômalas de `public.price_history` (`is_anomalous = true`) via cliente de serviço (contornando a política restritiva de RLS `price_history_select_non_anomalous` que oculta anomalias para roles anônimos e autenticados), refletindo integralmente a Regra 3 da Spec 0017: corte para queda relativa superior a 50% em relação à mediana prévia (tolerando desconto exatamente igual a 50%), salvaguarda cumulativa de baixo valor para medianas inferiores a R$ 50,00 (exigindo queda superior a 50% e desvio absoluto superior a R$ 25,00 para caracterizar anomalia), e exigência de ao menos 5 amostras diárias UTC distintas no histórico. Observações anômalas devem ser destacadas com badge de alerta visual explicando o isolamento estatístico.
- **admin-dashboard/AC-07**: Central de rotinas administrativas delimitada (Action Hub). A interface deve conter exclusivamente rotinas operacionais seguras de inspeção e suporte: emissão de prévia por slug, atualização sob demanda dos diagnósticos de saúde operacional e atalho seguro para o Sanity Studio. Concessão manual e renovação de selo de ofertas ficam explicitamente deferidas para a Phase 4. O link para o Sanity Studio é navegação direta segura (`target="_blank" rel="noopener noreferrer"`) e a atualização de diagnósticos é consulta idempotente com indicador visual de progresso, ambas sem obrigatoriedade de modal de confirmação; o diálogo modal acessível de confirmação fica estritamente reservado para ações que justifiquem confirmação (como emissão de prévia que gera sessão e cookie no servidor).
- **admin-dashboard/AC-08**: Acessibilidade e higiene defensiva de dados. Todos os elementos interativos, tabelas e diálogos devem suportar navegação completa via teclado, atributos de acessibilidade ARIA e contraste visual conforme `DESIGN.md`. A página deve manter cabeçalhos de não indexação e proibição de cache (`Cache-Control: private, no-store` e `X-Robots-Tag: noindex, nofollow`), sem imprimir credenciais, segredos de serviço ou tokens em tela ou logs.

## Options considered

### Opção 1: Dashboard genérico em Single Page Application no cliente via chamadas REST

Construir o painel como componente totalmente renderizado no cliente (`'use client'`), realizando requisições fetch diretas para APIs em cada carregamento de página e montando o estado no navegador.

**Pros**:

- Interações sem recarga completa de página.
- Menor processamento inicial no servidor do Worker.

**Cons**:

- Viola a convenção do projeto que prioriza Server Components no App Router (Server Component por padrão).
- Expõe superfície excessiva de endpoints no cliente para leitura de metadados internos de saúde.
- Risco de cascata de requisições não cacheadas sob limites estritos de CPU em Workers.

### Opção 2: Server Component com hidratação seletiva em ilhas interativas (Opção Escolhida)

A página principal `/admin-dashboard` é um Server Component que carrega os dados consolidados no servidor sob proteção direta do guard de sessão AAL2. Componentes interativos que exigem estado ou disparo assíncrono (como diálogos de confirmação de rotinas e emissão de preview) utilizam ilhas de cliente (`'use client'`) estritamente pontuais.

**Pros**:

- Máxima segurança: a leitura inicial de artigos, ofertas e saúde ocorre no servidor com credenciais restritas e sem expor rotas desnecessárias ou chaves privilegiadas ao cliente.
- Desempenho excelente: HTML inicial renderizado e pronto para exibição com zero requisições adicionais de inicialização.
- Alinhamento pleno com a arquitetura Next.js 16 do projeto e isolamento de código cliente.

### Opção 3: Painel operacional terceirizado em ferramenta externa

Utilizar um painel administrativo externo conectado diretamente ao banco de dados Supabase e APIs externas.

**Pros**:

- Não requer desenvolvimento de novos componentes de interface no repositório.

**Cons**:

- Quebra a centralização da experiência do proprietário sob o mesmo domínio protegido pelo Cloudflare Access e MFA AAL2.
- Exige expor portas ou credenciais de banco para serviços de terceiros, violando a política de privilégio mínimo.
- Impossibilita o acionamento direto do preview seguro controlado pelo Durable Object do Worker.

## Decision

**Chosen option**: Opção 2: Server Component com hidratação seletiva em ilhas interativas.

A página `app/admin-dashboard/(protegido)/page.tsx` será estruturada como um Server Component modular que obtém os dados no servidor, delegando a interatividade do Action Hub, dos diálogos de confirmação e das notificações a componentes cliente especializados e enxutos localizados em `components/admin/dashboard/`.

## Rationale

A escolha da Opção 2 respeita rigorosamente as convenções arquiteturais estabelecidas no repositório: Server Component por padrão, uso exclusivo de `auth.getUser()` para conferência de autorização no servidor, e delimitação cirúrgica de componentes de cliente apenas nas folhas interativas. Essa abordagem minimiza o tamanho do pacote JavaScript transmitido ao navegador, reduz a latência e garante que dados sensíveis de auditoria e status de infraestrutura permaneçam protegidos atrás da barreira de segundo fator do servidor.

Além disso, a integração direta com os serviços já desenvolvidos (`lib/services/posts.ts`, cliente Sanity autenticado e módulo de ofertas) permite reaproveitar a lógica de negócio e validação sem inventar abstrações desnecessárias, em conformidade com o princípio de desenvolvimento enxuto (Ponytail e YAGNI).

## Feature design

### Visão Geral da Interface

A interface do dashboard é organizada em quatro blocos visuais responsivos:

1. **Barra Superior de Contexto**: Identidade do operador, selo de segurança AAL2 verificado e atalho seguro para o Sanity Studio.
2. **Grade de Saúde Operacional**: Três cartões de diagnóstico com sondagens reais do PostgreSQL, Supabase Auth e Sanity CMS, exibindo status, carimbo UTC e tempo de resposta.
3. **Mesa Editorial de Artigos e Rascunhos**: Tabela paginada listando publicações e rascunhos, com estados de lista vazia e erro, além de botão de disparo de preview autenticado.
4. **Monitoramento Comercial de Ofertas**: Tabela de ofertas com preço corrente, mediana histórica, status do selo e indicação explicada de observações com outlier.
5. **Central de Rotinas (Action Hub)**: Grade restrita a ações seguras de diagnóstico e visualização prévia, com modal de confirmação acessível e feedback imediato.

### Contratos e Superfície de APIs

| Endpoint ou Operação                          | Método | Entradas           | Saídas                                        | Guarda de Segurança                | Tratamento de Erro                            |
| --------------------------------------------- | ------ | ------------------ | --------------------------------------------- | ---------------------------------- | --------------------------------------------- |
| `/api/admin/dashboard/health`                 | GET    | Nenhuma            | Status JSON `{ postgres, auth, sanity, at }`  | `assertAdminApiAuth` (AAL2)        | 503 fail closed                               |
| `/api/admin/preview`                          | POST   | `{ slug: string }` | HTTP 303 Redirect com cookie `PREVIEW_COOKIE` | `assertAdminApiAuth` (AAL2) + CSRF | 400 slug inválido, 403 não autorizado, 503 DO |
| `/api/admin/dashboard/rotinas/refresh-health` | POST   | Nenhuma            | `{ ok: true, health: {...} }`                 | `assertAdminApiAuth` (AAL2) + CSRF | 503 erro de sondagem                          |

### Rastreabilidade de Valores (Value Sourcing)

| Campo Exibido           | Origem do Valor                                              | Regra de Apresentação e Restrição                     |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Artigos e rascunhos     | Consulta GROQ autenticada no Sanity (`executeSanityQuery`)   | Paginada; catálogo local restrito a modo editorial    |
| Status editorial        | Campo `status` (`publicado` ou `rascunho`)                   | Badge âmbar para rascunho, verde para publicado       |
| Status do PostgreSQL    | Sondagem direta de conectividade executada no servidor       | `healthy`, `degraded` ou `unavailable` com latência   |
| Status do Supabase Auth | Execução de `supabase.auth.getUser()` no servidor            | `healthy` ou `unavailable` com carimbo UTC            |
| Status do Sanity CMS    | Execução de `probeSanityAvailability()` com timeout de 800ms | `healthy`, `unavailable` ou `unconfigured`            |
| Preço da oferta         | Tabela `public.offers` (coluna `price_cents`)                | Formatado em reais (`R$ XX,XX`)                       |
| Mediana histórica       | Função `calculate_offer_median` no servidor                  | Formatado em reais ou aviso de amostras insuficientes |
| Alerta de outlier       | Coluna `is_anomalous` em `public.price_history`              | Badge com justificativa da Spec 0017 Regra 3          |
| Selo verificado         | Coluna `badge_status` em `public.offers`                     | Status textual (`unverified`, `verified`, etc.)       |

### Detalhamento das Regras de Negócio e Contratos

#### 1. Mesa Editorial e Consulta Sanity Autenticada

- Quando o Sanity estiver configurado (`isSanityConfigured === true`), a consulta deve usar o token de leitura (`readToken`) para obter documentos publicados e rascunhos em um único conjunto ordenado por data de atualização decrescente (`_updatedAt desc`).
- A consulta aplica fatiamento GROQ com base em `$start` e `$end` para paginação determinística.
- Caso o Sanity retorne erro ou estoure o timeout, o componente exibe um estado de erro contido e amigável, sem impedir o carregamento do restante do painel.
- Caso o dataset não contenha documentos, exibe estado vazio estruturado.
- O catálogo local (`getLocalPosts`) só é acionado se `isLocalEditorialMode` estiver ativo, nunca como fallback silencioso de produção.

#### 2. Monitoramento de Saúde Operacional e Distinção de Falhas

- **Sondagem PostgreSQL**: executa teste de conectividade simples via cliente servidor (`select 1` ou contagem leve).
- **Sondagem Supabase Auth**: invoca `supabase.auth.getUser()` no servidor e avalia categoricamente o resultado:
  - _Sessão ausente ou inválida_: não indica falha de infraestrutura; o subsistema de autenticação está operacional (`healthy`) e apto a processar requisições.
  - _Falha de rede, timeout ou HTTP 5xx do Supabase Auth_: indica falha do serviço (`unavailable` ou `degraded`), capturando a latência e registrando mensagem técnica sanitizada.
  - Essa distinção impede que ausência transitória de cookie ou sondagens desautenticadas emitam alarmes falsos de indisponibilidade da infraestrutura de autenticação.
- **Sondagem Sanity CMS**: invoca `probeSanityAvailability()` com limite estrito de 800ms; caso as variáveis de projeto não estejam preenchidas, assume estado `unconfigured`.
- Cada cartão apresenta título, badge semafórico com contraste acessível conforme `DESIGN.md`, carimbo UTC legível da última consulta e detalhes técnicos sanitizados.

#### 3. Emissão de Preview Seguro

- O disparo de prévia aciona o endpoint existente `POST /api/admin/preview`.
- O endpoint valida a autorização AAL2 e CSRF, registra a sessão no `PreviewSessionDO` para garantir consistência de revogação, e o próprio endpoint emite e assina o cookie `PREVIEW_COOKIE` criptografado com `previewSigningKey`.
- A resposta é um redirecionamento HTTP 303 que define o cookie no navegador do operador, conduzindo diretamente para `/artigos/[slug]` (ou para a página inicial quando o slug não for especificado).
- Por se tratar de operação com geração de estado e emissão de credencial transitória, o acionamento pelo Action Hub exige confirmação em diálogo modal acessível.

#### 4. Leitura Autorizada de Ofertas e Histórico (Contrato Comercial)

- **Cliente e Fronteira de Execução**:
  - A consulta dos dados comerciais é encapsulada em serviço de servidor (`lib/services/commercial-dashboard.ts`) marcado com `import 'server-only'`.
  - Utiliza cliente Supabase dedicado com chave de privilégio de serviço (`service_role`), configurado sem cookies e com persistência de sessão explicitamente desativada (`auth: { persistSession: false, autoRefreshToken: false }`).
  - O privilégio de serviço opera **exclusivamente no servidor** (Server Component ou Route Handler interno) e é invocado **estritamente após a verificação de autorização** via `checkAdminUser()` comprovando identidade do administrador único (`user.id === ADMIN_USER_ID`) e nível de garantia `aal === 'aal2'`.
  - Sob nenhuma circunstância a chave `service_role` é exposta em variáveis públicas (`NEXT_PUBLIC_`), injetada no bundle do cliente ou acessível via navegador.
  - Caso a chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`) não esteja configurada no ambiente, o bloco comercial se degrada defensivamente para o estado `unconfigured` com mensagem amigável de orientação técnica, sem derrubar ou impedir a renderização das demais áreas do painel (mesa editorial, saúde das integrações e Action Hub).
- **Queries, Views e RPCs de Leitura**:
  - _Ofertas Ativas e Lojistas_: Consulta paginada à view `public.active_offers_view` (ou join entre `public.offers`, `public.merchants` e `public.products`), recuperando os campos canônicos da oferta: `id`, `product_id`, `merchant_id`, `title`, `price_cents`, `original_price_cents`, `currency`, `payment_method`, `badge_status`, `badge_expires_at`, `status` e nome do lojista (`merchants.name`).
  - _Mediana Histórica (30 dias)_: O serviço de servidor invoca a função SQL estável `public.calculate_offer_median(product_id, merchant_id, payment_method)` para as ofertas paginadas em exibição. Para evitar chamadas repetidas na mesma requisição, o cálculo da mediana é deduplicado em cache de execução em memória por combinação única de produto, lojista e meio de pagamento (`${product_id}:${merchant_id}:${payment_method}`).
  - _Tratamento de Mediana_: O retorno `null` da função `calculate_offer_median` (gerado quando há menos de 5 amostras diárias UTC distintas nos últimos 30 dias) é tratado categoricamente como **histórico insuficiente**, sendo exibido como tal na interface e nunca interpretado ou formatado como preço zero (`R$ 0,00`).
  - _Observações Anômalas e Histórico de Preços_: Consulta limitada a `public.price_history` filtrando pelos produtos das ofertas ativas, projetando estritamente: `id`, `product_id`, `merchant_id`, `price_cents`, `payment_method`, `captured_at` e `is_anomalous`.
- **Grants, RLS e Projeção Restrita (Safe DTO)**:
  - _No PostgreSQL_: As tabelas comerciais mantêm RLS ativado e forçado (`force row level security`). A política `price_history_select_non_anomalous` oculta anomalias para papéis `anon` e `authenticated`; a permissão de execução de `calculate_offer_median` permanece revogada de `public`, `anon` e `authenticated`. O cliente com `service_role` no servidor é o único autorizado a ler anomalias e executar a mediana, garantindo que nenhum grant excessivo seja concedido no banco.
  - _Sanitização no Servidor_: O serviço mapeia os resultados brutos em um DTO restrito (`CommercialDashboardData`), devolvendo apenas as colunas estritamente necessárias para a interface, sem expor URLs internas de banco, dados brutos de auditoria ou chaves de serviço.
  - Mutações comerciais (como a concessão e renovação de selo e gravação de logs imutáveis WORM) permanecem bloqueadas e deferidas para a Phase 4.

#### 5. Isolamento e Apresentação de Outliers

- Consome a marcação `is_anomalous` gerada pelas rotinas da Spec 0017 e lida pelo cliente de serviço autorizado no servidor.
- A regra de classificação segue estritamente a Regra 3 da Spec 0017:
  - Queda relativa estritamente superior a 50% em relação à mediana histórica prévia (queda exatamente igual a 50% é lícita).
  - Salvaguarda para itens com mediana prévia inferior a R$ 50,00 (5000 centavos): a anomalia só se configura se a queda relativa for superior a 50% E o desvio absoluto for superior a R$ 25,00 (2500 centavos).
  - Amostras insuficientes: produtos com menos de 5 dias UTC de coleta nos últimos 30 dias não possuem mediana consolidada e não sofrem descarte por anomalia.
- A interface exibe badge visual explicativo para observações marcadas como anômalas, indicando que foram expurgadas do cômputo da mediana para evitar fraudes ou erros de digitação de parceiros.

#### 6. Central de Rotinas (Action Hub) Delimitada

- As ações disponibilizadas na interface limitam-se a:
  - _Atalho para o Sanity Studio_: Link de navegação direta segura (`<a href={env.sanityStudioUrl} target="_blank" rel="noopener noreferrer">`), sem necessidade de confirmação em modal.
  - _Atualização de Diagnósticos sob Demanda_: Chamada assíncrona ao endpoint `/api/admin/dashboard/rotinas/refresh-health` (ou revalidação de Server Action). Por ser uma consulta de diagnóstico idempotente sem mutação de estado, é acionada diretamente pelo botão correspondente com feedback de carregamento visual (spinner/desabilitação temporária), sem modal de confirmação.
  - _Emissão de Prévia de Artigo_: Geração de preview por seleção na tabela ou digitação de slug. Por envolver emissão de credencial em cookie e registro no Durable Object, mantém a exigência de confirmação em diálogo modal acessível.
- Ações de concessão manual ou alteração de regras do selo permanecem fora desta fase.

### Modelo de Segurança e Invariantes

1. **AAL2 Obrigatório**: A renderização da página `/admin-dashboard` e a invocação de qualquer endpoint administrativo dependem da resolução satisfatória de `checkAdminUser()` com `aal === 'aal2'`. Sessões em AAL1 são redirecionadas ou recusadas.
2. **Defesa CSRF**: Todas as rotinas acionadas via POST exigem validação de cabeçalhos de origem através de `validateAdminRequestOrigin`.
3. **Privilégio Mínimo e Sanitização**: A chave de serviço reside unicamente no servidor; dados de ofertas são projetados em DTO sanitizado antes da renderização; respostas de erro nunca expõem nomes de colunas ou mensagens cruas de exceção do Postgres.
4. **Isolamento de Produção**: Em ambiente local, as rotinas operam sobre instâncias descartáveis sem impactar recursos remotos.

### Cenários Críticos de Teste

- **Cenário Feliz (Visualização, Saúde e Preview)**: Administrador autenticado com AAL2 acessa `/admin-dashboard`, visualiza a lista de artigos (com paginação e status), as sondagens de saúde com carimbo e latência, a lista de ofertas com medianas e badges, e aciona a geração de preview seguro recebendo redirecionamento com cookie assinado, verificando **admin-dashboard/AC-01**, **AC-02**, **AC-03**, **AC-04** e **AC-05**.
- **Cenário de Segurança (Bloqueio AAL1 e Não Autenticado)**: Usuário com sessão restrita em AAL1 tenta acessar `/admin-dashboard` e é imediatamente redirecionado para a verificação TOTP em `/admin-dashboard/mfa/verify`. Requisição direta para `/api/admin/dashboard/health` em AAL1 recebe HTTP 403, verificando **admin-dashboard/AC-01**.
- **Cenário Editorial (Paginação, Vazio e Falha Sanity)**: Verificação do comportamento da mesa editorial em três condições: listagem com paginação ativa, dataset vazio com mensagem amigável, e simulação de indisponibilidade do Sanity exibindo alerta contido sem quebrar a página, verificando **admin-dashboard/AC-02**.
- **Cenário de Diagnóstico de Falha (Health e Distinção de Auth)**: Em simulação de indisponibilidade de conexão com o banco ou CMS, o cartão de saúde operacional exibe o indicador visual de alerta com carimbo UTC e mensagem sanitizada; sob falha 5xx do Supabase Auth, o cartão exibe `unavailable` sem reportar deslogamento incorreto, verificando **admin-dashboard/AC-04**.
- **Cenário Comercial (Leitura Restrita, Outliers e Salvaguarda da Spec 0017)**: Tabela de ofertas exibe produtos com preços e medianas computadas via `service_role` no servidor; para observação anômala com queda superior a 50%, exibe badge de outlier lido com privilégio de serviço (invisível para anônimos via RLS); para produto com mediana inferior a R$ 50,00 e queda de R$ 20,00, comprova a aplicação da salvaguarda mantendo a observação como válida, verificando **admin-dashboard/AC-05** e **AC-06**.
- **Cenário de Ação (Action Hub)**: Operador clica em link direto para o Sanity Studio (abre nova aba sem modal); aciona atualização de diagnósticos e recebe feedback direto com indicador de carregamento; e aciona emissão de preview confirmando o diálogo modal com sucesso, verificando **admin-dashboard/AC-07**.

## Build plan

1. Criar os componentes visuais do dashboard em `components/admin/dashboard/` (cartões de integridade com sondagens reais, mesa editorial paginada com estados de vazio e erro, tabela de ofertas com indicação de outliers e central de rotinas com modal acessível), satisfazendo **admin-dashboard/AC-02**, **AC-04**, **AC-05**, **AC-06** e **AC-08**.
2. Implementar a rota de API de diagnóstico administrativo em `app/api/admin/dashboard/health/route.ts` sob o guard `assertAdminApiAuth`, executando as sondagens reais de PostgreSQL, Supabase Auth e Sanity CMS, satisfazendo **admin-dashboard/AC-01** e **AC-04**.
3. Implementar a rota de atualização de diagnósticos em `app/api/admin/dashboard/rotinas/refresh-health/route.ts` sob validação de origem e `assertAdminApiAuth`, satisfazendo **admin-dashboard/AC-01**, **AC-04** e **AC-07**.
4. Integrar a página principal `app/admin-dashboard/(protegido)/page.tsx` como Server Component consumindo dados de artigos autenticados no Sanity e ofertas consolidadas no servidor, satisfazendo **admin-dashboard/AC-01**, **AC-02**, **AC-03**, **AC-05** e **AC-08**.
5. Desenvolver a suíte de testes de integração e unitários no Vitest para os componentes e rotas da Phase 3, satisfazendo todos os critérios de aceite.
6. Desenvolver testes ponta a ponta no Playwright (`e2e/admin-dashboard-operations.spec.ts`) validando a navegação real sob AAL2, inspeção de tabelas, sondagens de saúde e emissão de preview.

## Consequences

- O dashboard se torna a central unificada para inspeção operacional do portal, sem necessidade de consultas manuais no terminal.
- O contrato de segurança AAL2 permanece inviolável: nenhum operador ou rotina acessa dados sem segundo fator ativo.
- A edição editorial de conteúdo permanece sob controle exclusivo do Sanity Studio, mantendo o desacoplamento e a fonte editorial única.
- As mutações de selo e gravação de logs probatórios WORM permanecem seguramente desacopladas para a Phase 4, evitando a exposição prematura de privilégios de serviço ao navegador.
- O código respeita a proibição de complexidade excessiva, reusando padrões já testados nas specs 0007, 0017, 0018 e 0019.

## Follow-up

Após o aceite desta spec pelo proprietário, a execução avançará para o `/develop` da Phase 3, seguido da suíte `/test` e verificação formal via `/check verify` e `/check review`.
