# /check verify & review: Dashboard Operacional de Administração em /admin-dashboard sob Sessão AAL2 (Spec 0020)

**Data**: 2026-10-16 18:05 (America/Sao_Paulo)  
**Spec**: `docs/specs/2026-10-16-1650-0020-dashboard-operacional-aal2.md`  
**Veredito**: **APROVADO** (exit 0, autoridade `scripts/check-decision.mjs`)

## Resumo

| Métrica      | Valor |
| ------------ | ----- |
| ACs totais   | 8     |
| PASS         | 8     |
| FAIL         | 0     |
| UNVERIFIABLE | 0     |
| BLOCKER      | 0     |
| WARNING      | 0     |

## Metadados de Avaliação

- **Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`
- **Árvore avaliada**: `ee6669d1fd859e281be1c6f09050d5295caa9e8a`
- **Hash SHA-256 da Spec**: `4242aee90988a6b414a9cf9ff5518fefbb3c7ce53e8156c87ce2b68828f4922d`
- **Ambiente de teste**: Instância local isolada do Supabase (`127.0.0.1:54321`) com migrations e RPCs da Spec 0017 aplicadas, dados semeados via `scripts/seed-e2e-offers.mjs`, servidor OpenNext/Worker na porta 3101 e proxy de teste na porta 3100 com chave `SUPABASE_SERVICE_ROLE_KEY` injetada de forma efêmera em `.dev.vars`.
- **Ressalva de produção**: Produção permanece isolada e inalterada; nenhuma chave, migração remota ou segredo de produção foi manipulado.

## Manifesto SHA-256 dos Arquivos Finais Testados

| Arquivo                                                   | Hash SHA-256                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `app/admin-dashboard/(protegido)/page.tsx`                | `ac561b99b0b92daa01cb00d21236868b1f0f2c46483d1ea2b577055e0a22f4f5` |
| `components/admin/dashboard/health-cards.tsx`             | `01e7ca3d559393ae1cb5902e13a3c859e8d784f2bdf4aba56b6acf7f5bd05673` |
| `components/admin/dashboard/editorial-table.tsx`          | `f12f969904e89f24c6c4650ab4e2a7daf227368985a0a153237bf8f88bc478a1` |
| `components/admin/dashboard/offers-table.tsx`             | `978d436b098e308505c71b2ec03c7c3e172def17177532e95934bc81a9591929` |
| `components/admin/dashboard/action-hub.tsx`               | `d7f94be0c9a064af95a32dfd93e0d91e7f78b9b052836265e909ec7afa37d911` |
| `lib/services/commercial-dashboard.ts`                    | `4299a565d761446f9e20e02c446f28f9a5767a238d0030b97eca0d3e57c3ac2d` |
| `lib/services/editorial-dashboard.ts`                     | `9c0fb17a11263192fea5a255ea68be89d1a77bdbbf12eaa3de986eb84e802562` |
| `lib/services/health-dashboard.ts`                        | `846ba6f6855cf8a808b4076fd1466bd65289e8133e1ab51f34c3cc3cdde63463` |
| `app/api/admin/dashboard/health/route.ts`                 | `32d289e7d300a2988a0b5727b66ad9333951763c637b9d474fa0dea63af190cf` |
| `app/api/admin/dashboard/rotinas/refresh-health/route.ts` | `74c04fde63b22828708eabfd37e5a3b943f25d2dd41e42ecc0d027918236a985` |
| `e2e/admin-operational-dashboard.spec.ts`                 | `6eabff943c7b16ebc4c5ff934ec504ecc0e0d7f1a9f03fb0a6b189212a6b00ae` |
| `scripts/seed-e2e-offers.mjs`                             | `6978f032a0ebe8799fc63ecba746599498f0836bb7354c309067b4dc76935dd7` |
| `scripts/e2e-server.mjs`                                  | `4fce133dcfe3980cbaff75ac3a82e7146e0f6df637a91509631c7094b24497ad` |

## Critérios de Aceite

### admin-dashboard/AC-01: Acesso restrito exclusivo sob sessão AAL2

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-01-acesso-restrito-aal2.md`  
**Hash SHA-256**: `8a7f39dbdb199cebe34a2f728d897b26ea12fa185982619d64c1c2c495155d53`

**Nota**: O acesso à página `/admin-dashboard` é rigorosamente restrito no servidor pelo guard `checkAdminUser()` no Server Component. Sessões em AAL1 ou anônimas são redirecionadas para `/admin-dashboard/mfa/verify` ou `/admin-dashboard/login`. Usuário autenticado sem o identificador `ADMIN_USER_ID` tem a sessão sumariamente revogada com redirecionamento de erro. As rotinas de suporte (`/api/admin/dashboard/health` e `/api/admin/dashboard/rotinas/refresh-health`) operam sob a guarda estrita de `assertAdminApiAuth`, devolvendo HTTP 403 sob AAL1 ou desautenticação.

### admin-dashboard/AC-02: Mesa editorial com consulta autenticada ao Sanity e paginação

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-02-mesa-editorial-sanity.md`  
**Hash SHA-256**: `6514b5a02ea0b626669f80e652af174085cfec502f4393c39e9671d80948f0ee`

**Nota**: O serviço `lib/services/editorial-dashboard.ts` consulta o Sanity Content Lake via GROQ autenticado com `readToken`, recuperando documentos publicados e rascunhos (`drafts.**`) ordenados por data de atualização com fatiamento parametrizado (`[$start...$end]`). Em ambiente local (`isLocalEditorialMode`), o catálogo local paginado é servido de forma consistente. O componente de tabela trata explicitamente os estados de lista vazia e falha de conexão de forma amigável e sanitizada. **Validação empírica resolvida**: a ressalva de integração restrita a mocks foi sanada e comprovada em 2026-10-16T23:02Z via `scripts/verify-sanity-authenticated-read.mjs` com credencial válida em `SANITY_API_READ_TOKEN` no runner local com Worker real (`http://127.0.0.1:3100/admin-dashboard`). A consulta GROQ autenticada retornou HTTP 200 no Sanity (`4iipvaar`/`production`) com 6 documentos publicados e 7 documentos de rascunho (exercitando rascunhos remotos com sucesso), totalizando 13 documentos no dataset (sem assunção de 13 artigos distintos, pois rascunhos podem corresponder a versões de publicados). O Worker local sob AAL2 renderizou a mesa com `source: 'sanity'`, badge visual `✅ SANITY`, títulos reais e paginação determinística sem sobreposição (evidência em `docs/reviews/evidence/2026-10-16-1930-sanity-authenticated-read/`).

### admin-dashboard/AC-03: Emissão de preview seguro via contrato existente

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-03-emissao-preview-seguro.md`  
**Hash SHA-256**: `58cdc337e79abe6bcc8464b878d7caa50c72f35d53610d2906a164c0f6154151`

**Nota**: A geração de preview consome o endpoint `POST /api/admin/preview`, respeitando o contrato de persistência da sessão no Durable Object (`store.createSession`) e assinatura criptográfica do cookie `PREVIEW_COOKIE` diretamente pelo servidor Next.js via HMAC-SHA256, devolvendo redirecionamento HTTP 303 com o cookie assinado presente. A interface aciona essa rotina através de modal acessível com confirmação prévia do operador.

### admin-dashboard/AC-04: Monitoramento de saúde operacional com sondagens reais e distinção de falha

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-04-monitoramento-saude-sondagens-reais.md`  
**Hash SHA-256**: `ec68f2d11b9220e71c97879607306f05d2c00e5646bfdb20ee44de18354db866`

**Nota**: O monitoramento operacional implementa sondagens ativas em tempo real para o PostgreSQL (conectividade e latência), Supabase Auth (`supabase.auth.getUser()`) e Sanity CMS (`probeSanityAvailability` com timeout de 800ms). A sondagem do Auth distingue categoricamente sessão ausente/inválida (que comprova o serviço Auth ativo e respondendo normalmente) de indisponibilidade de infraestrutura (falha de rede ou HTTP 5xx). Cada indicador exibe status semafórico acessível, carimbo UTC e latência calculada.

### admin-dashboard/AC-05: Painel de ofertas comerciais e histórico de preços via leitura autorizada no servidor

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-05-painel-ofertas-leitura-servidor.md`  
**Hash SHA-256**: `275f9fa30fbd623df1180988d65d7addfe4736e111d2c6903c28a25bc5d5a9e2`

**Nota**: O módulo `lib/services/commercial-dashboard.ts` é blindado com `import 'server-only'` e consome cliente Supabase dedicado com chave de serviço `service_role` (sem cookies nem persistência de sessão), executado unicamente após autorização AAL2. A chave de serviço permanece estritamente no servidor. O cálculo da mediana é deduplicado por combinação única de produto/lojista/forma de pagamento invocando a RPC `calculate_offer_median`. Retorno `null` de mediana é tratado e exibido categoricamente como "Histórico insuficiente (< 5 dias)", nunca como preço zero. Quando a chave de serviço está ausente, o bloco degrada para o estado defensivo "não configurado" com aviso amigável. Mutações e concessões de selo permanecem inacessíveis.

### admin-dashboard/AC-06: Detecção e apresentação de outliers conforme regras da Spec 0017

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-06-deteccao-apresentacao-outliers.md`  
**Hash SHA-256**: `9a0f57235e56fa720bf9a32a8cc684a7d9b05d103ae5d5622f4a6bf82e98337f`

**Nota**: As observações marcadas com `is_anomalous = true` em `public.price_history` são consultadas no servidor via cliente com privilégio de serviço (contornando a RLS que as oculta para anônimos). Na tabela de ofertas, a ocorrência de anomalias é destacada com badge semafórico de alerta visual ("Outlier detectado") explicando o isolamento estatístico conforme a Regra 3 da Spec 0017 (queda superior a 50%, salvaguarda de baixo valor e exigência de 5 coletas diárias distintas).

### admin-dashboard/AC-07: Central de rotinas administrativas delimitada (Action Hub)

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-07-action-hub-rotinas-delimitadas.md`  
**Hash SHA-256**: `1e60a8d970a48868420a01cfa43a54e94d0dc29314a737b622f48545d1efb565`

**Nota**: O Action Hub delimita exclusivamente rotinas seguras de inspeção: atalho direto para o Sanity Studio (`target="_blank" rel="noopener noreferrer"`), atualização sob demanda de diagnósticos de saúde com feedback visual imediato de carregamento (ambos sem modal de confirmação), e geração de preview seguro por slug com diálogo modal acessível de confirmação. Concessão manual e renovação de selo foram explicitamente deferidas para a Phase 4.

### admin-dashboard/AC-08: Acessibilidade e higiene defensiva de dados

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/ac-08-acessibilidade-higiene-dados.md`  
**Hash SHA-256**: `8d5cd579691b42d291b37addc3ac43ff7937a86b416d6a057c0439e4419edf67`

**Nota**: Todos os diálogos, botões e tabelas suportam controle via teclado (incluindo fechamento com a tecla Escape), atributos ARIA semânticos e contraste visual estrito com conformidade aos temas claro e escuro de `DESIGN.md`. Cabeçalhos defensivos de proibição de cache e indexação (`Cache-Control: private, no-store` e `X-Robots-Tag: noindex, nofollow`) estão ativos. Segredos de serviço e credenciais de banco são omitidos de logs, DTOs e HTML renderizado.

---

## Esclarecimentos Técnicos Específicos

Em resposta direta aos três pontos de atenção solicitados para a consolidação desta revisão:

### 1. Bloco comercial: teste com dados reais vs estado não configurado

O bloco comercial **foi validado com ofertas reais, cálculo de mediana via RPC e observações anômalas no banco PostgreSQL**:

- **Massa de Dados Real**: O script `scripts/seed-e2e-offers.mjs` populou o banco local com 2 produtos e 1 lojista de referência.
- **Oferta 1 (Mediana e Outlier Reais)**: "Notebook Profissional E2E - 16GB RAM" com 6 coletas diárias em `price_history`. A RPC SQL `calculate_offer_median` calculou e retornou a mediana de R$ 4.500,00 (450000 centavos), exibida na coluna "Mediana (30d)". Inseriu-se também uma observação com `price_cents = 199900` e `is_anomalous = true` (queda de 55,5%), gerando o badge visual real `"Outlier detectado (1)"` com tooltip explicativo.
- **Oferta 2 (Histórico Insuficiente)**: "Mouse Sem Fio Ergonômico E2E" com apenas 2 coletas diárias. A RPC retornou `null`, e o sistema exibiu categoricamente `"Histórico insuficiente (< 5 dias)"`, comprovando que o retorno nulo não foi distorcido para `R$ 0,00`.
- **Estado Não Configurado**: Além da execução E2E real com `service_role` injetada, a suíte de testes unitários (`__tests__/unit/lib/commercial-dashboard.test.ts`) comprovou isoladamente o fallback gracioso para o estado `isUnconfigured: true` com mensagem explicativa quando a chave `SUPABASE_SERVICE_ROLE_KEY` é omitida.

### 2. Mesa editorial: consulta Sanity autenticada vs catálogo local

A mesa editorial implementa e cobre **ambos os fluxos**, com a seguinte delimitação empírica:

- **Consulta Sanity Autenticada**: Quando `isSanityConfigured === true`, `lib/services/editorial-dashboard.ts` executa consulta GROQ nativa com token de leitura (`readToken: env.SANITY_READ_TOKEN`), recuperando documentos publicados e rascunhos (`drafts.**`) ordenados por `_updatedAt desc` com fatiamento parametrizado `[$start...$end]`.
- **Catálogo Local**: Quando `isSanityConfigured === false` e `isLocalEditorialMode === true`, o sistema consome os arquivos locais via `getLocalPosts()` aplicando paginação e ordenação em memória.
- **Validação e Integração Sanity**: Testada unitariamente com mock do cliente Sanity e validada em E2E navegando pelo catálogo local. Em 2026-10-16T23:02Z, a consulta autenticada ao cluster real do Sanity (`4iipvaar`/`production`) foi comprovada de ponta a ponta no Worker local sob AAL2 (`scripts/verify-sanity-authenticated-read.mjs`), confirmando HTTP 200, 6 documentos publicados e 7 documentos de rascunho (13 documentos no total no dataset, sem assunção de 13 artigos distintos), títulos reais na mesa editorial e badge `✅ SANITY` ativo.

### 3. Estados negativos: falhas de sondagens, listas vazias e recusas de acesso

Todos os cenários negativos foram mapeados e testados com prova empírica:

- **Falha de Sondagens e Distinção no Auth**:
  - `lib/services/health-dashboard.ts` distingue com precisão o retorno sem sessão de `supabase.auth.getUser()` (que mantém o status `healthy`, pois o serviço Auth respondeu ativamente) de exceções com status HTTP 5xx ou falhas de rede (que marcam `unavailable` com mensagem sanitizada).
  - Sondagem do Sanity possui timeout estrito de 800ms; falhas marcam `unavailable` e ausência de variáveis marca `unconfigured`.
- **Listas Vazias**:
  - Na mesa editorial, lista vazia renderiza: `"Nenhum artigo publicado ou rascunho encontrado."`.
  - Na tabela de ofertas, lista vazia renderiza: `"Nenhuma oferta comercial ativa cadastrada no momento."`.
  - Estados de erro exibem banners de alerta sem interromper as outras seções do painel.
- **Recusas de Acesso**:
  - Usuário anônimo navegando para `/admin-dashboard` é redirecionado para `/admin-dashboard/login`.
  - Usuário com sessão restrita em AAL1 é redirecionado para `/admin-dashboard/mfa/verify` (ou recebe HTTP 403 nas rotinas de API sob `assertAdminApiAuth`).
  - Usuário autenticado cujo UUID diverge de `ADMIN_USER_ID` tem a sessão sumariamente revogada e é redirecionado com erro `unauthorized`.

---

## Veredito do /check review

A implementação do **Dashboard Operacional AAL2 (Spec 0020)** cumpre integralmente os 8 critérios de aceite estabelecidos, respeita a integridade defensiva do servidor (Server Components por padrão, `server-only`, isolamento de privilégios de serviço, RLS no banco), não vaza segredos e preserva intactas as áreas públicas do portal (Home e leitor de artigos).

**Resultado**: **APROVADO** (8/8 ACs PASS, 0 BLOCKER, 0 WARNING).
