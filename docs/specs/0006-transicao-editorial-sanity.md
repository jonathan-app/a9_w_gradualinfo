# 0006. Transição editorial para Sanity e arquitetura de entrega online

**Date**: 2026-10-08  
**Status**: Accepted (documentação preparada para versionamento; implementação e validação pendentes)  
**Decision source**: Diretriz do dono em 2026-10-08 determinando a inclusão do Sanity na entrega online atual, transição editorial como fonte única para artigos e delimitação de responsabilidades (Sanity Studio isolado com zero contas de leitores, Next.js na Cloudflare, Supabase para aplicação e GitHub para CI/CD). Aceite formal do contrato de preview por POST exclusivo com Cloudflare Durable Object (consistência forte, falha fechada 404/503 e teste de rejeição de cópia de cookie pós-logout).

---

## 1. Contexto e Matriz de Responsabilidades

O portal **GradualInfo** adota Sanity como plataforma editorial única na entrega online atual, com separação estrita de responsabilidades:

| Componente               | Papel                                              | Contrato de Acesso                                                                                                                              |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sanity Studio**        | Seu acesso editorial e gestão de conteúdo          | Acesso exclusivo do administrador único via login nativo do Sanity. Sem criação de `/admin` ou autenticação editorial própria no Next.js.       |
| **Next.js + Cloudflare** | Site público e rotas protegidas de preview         | Leitura pública anônima para visitantes (sem cadastro ou login). Rotas protegidas de preview para rascunhos. Cache público `no-store` mantido.  |
| **Supabase**             | Apenas dados da aplicação com necessidade concreta | Sem cadastro nem login público de leitores (sem perfis, favoritos ou comentários). RLS estrito nas tabelas relacionais necessárias à aplicação. |
| **GitHub**               | Código, revisão, testes e publicação controlada    | Repositório, CI/CD protegida, checks obrigatórios, CODEOWNERS e aprovação manual para deploy em produção.                                       |

---

## 2. Princípios Fundamentais da Transição

1. **Fonte Única da Verdade**: Com a transição para o Sanity, a tabela `posts` do Supabase é descontinuada como origem de artigos online. Não manter duas fontes editoriais ativas simultaneamente.
2. **Preservação de Slugs e SEO**: As rotas existentes (`/artigos/[slug]`), metadados OpenGraph/Twitter, fontes citadas e URLs no `sitemap.xml` devem manter paridade total para evitar qualquer regressão de indexação.
3. **Alinhamento de Origem e Domínio de Produção**: O domínio oficial do site é **https://gradualinfo.com.br** (apex). As variações **www.gradualinfo.com.br** e **gradualinfo.com.br** (HTTP) redirecionam permanentemente (301) para o apex HTTPS. O Worker responde exclusivamente no apex HTTPS com **HSTS** (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`) e cabeçalhos de segurança (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`). A variável `NEXT_PUBLIC_SITE_URL` e o `SITE_ORIGIN` usado na validação de preview apontam para `https://gradualinfo.com.br`. O domínio `gradualinfo.pages.dev` é descontinuado como origem pública.
4. **Isolamento Estrito de Segredos**: Segredos nunca trafegam em repositório, chat, logs de CI ou relatórios de validação. Tokens privados do Sanity (`SANITY_API_READ_TOKEN`), segredos de preview e chaves de serviço permanecem restritos ao ambiente de execução do Worker.
5. **Simplificação de Identidade (Zero Contas de Leitores)**: O site público é estritamente voltado à leitura sem autenticação pública. Não criaremos `/admin` próprio no Next.js nem fluxos de auth de leitores por antecipação.
6. **Política de Cache**: Mantém-se o cache `no-store` já aprovado para rotas públicas e `private, no-store` para rotas de preview, até que exista decisão formal em contrário.

---

## 3. Modelo de Controles Distintos: Studio vs Preview no Site

O acesso editorial ao Studio e a autorização de preview de rascunhos no site são controles distintos e desacoplados:

### A. Acesso Editorial ao Sanity Studio

- Autenticação gerida diretamente pela infraestrutura de identidade do Sanity para o administrador único.
- O site GradualInfo não gerencia, não expõe e não armazena credenciais desse painel.

### B. Autorização de Preview de Rascunhos no Site (Next.js / Cloudflare)

Para permitir que o administrador revise rascunhos em `/artigos/[slug]` sem expô-los publicamente e sem depender de login de leitor:

1. **Entrada Estrita por POST (Segredo Fora da URL)**:
   - Acesso realizado exclusivamente via método `POST` em `/api/preview` (requisições `GET` respondem `405 Method Not Allowed` com cabeçalho `Allow: POST`).
   - O segredo (`token`) e o destino opcional (`slug`) são transmitidos no corpo da requisição (`application/x-www-form-urlencoded` ou JSON), **nunca na URL, query string, headers de referrer ou mensagens de erro**.
   - **Validação de Origem**: A rota valida obrigatoriamente se `request.headers.get('origin') === SITE_ORIGIN`, recusando origens cruzadas com `403 Forbidden` contra CSRF.
   - **Validação de Destino Interno**: O campo `slug` é validado estritamente como string kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). Redirecionamento construído exclusivamente a partir de `SITE_ORIGIN/artigos/[slug]` (ou `/`), bloqueando open redirect.
   - **Comparação de Segredo**: Comparação em tempo constante com `timingSafeEqual` sobre hashes SHA-256 do segredo configurado (`PREVIEW_SECRET`).

2. **Sessão Assinada e Verificada no Servidor**:
   - Emissão de cookie seguro `gradualinfo-preview` contendo `payload.assinatura` em base64url.
   - Assinatura criptográfica com **HMAC-SHA256** utilizando chave de assinatura dedicada (`PREVIEW_SIGNING_KEY`).
   - Payload canônico:
     ```typescript
     interface PreviewGrant {
       version: 1;
       session_id: string; // UUID v4 único da sessão
       issued_at: number; // timestamp unix em segundos
       expires_at: number; // issued_at + 1800 (TTL estrito de 30 minutos)
     }
     ```
   - Atributos do cookie: `HttpOnly`, `Secure` (em produção HTTPS), `SameSite=Lax`, `Path=/`, `Max-Age=1800`.
   - **Verificação Server-Side**: Middleware e Server Components verificam assinatura, integridade de schema e prazo absoluto (`now <= expires_at`). Falha de assinatura ou prazo expirado resulta em rejeição imediata do preview (sem renovação tácita).

3. **Armazenamento de Revogação com Consistência Forte (Cloudflare Durable Object)**:
   - **Por que Durable Objects**: Workers KV possui consistência eventual (com janelas de propagação global de 60 segundos ou mais), o que viola o requisito de revogação imediata. Memória volátil e variáveis de ambiente não sobrevivem a múltiplos isolados do Worker. A persistência é delegada a um **Cloudflare Durable Object com armazenamento transacional persistente** (`PreviewSessionDO`), garantindo consistência forte e linearizabilidade global.
   - **Criação da Sessão Antes de Emitir o Cookie**: Na rota `/api/preview` (POST), após validar o segredo e a origem, o Worker invoca o Durable Object para registrar a nova sessão (`session_id`, `issued_at`, `expires_at`, `revoked: false`). O cookie assinado só é gerado e retornado no `Set-Cookie` **após a confirmação bem-sucedida de persistência no armazenamento do Durable Object**.
   - **Revogação por `session_id` e Consulta em Cada Autorização de Preview (Sem Cache Intermediário)**: Em requisições de preview ou rascunho, o Worker consulta o `PreviewSessionDO` passando o `session_id` extraído do grant assinado. O DO verifica se a sessão existe, se está dentro do prazo e se `revoked === false`. **Nenhum cache intermediário é permitido** nesta verificação.
   - **Semântica da Falha Fechada e Tratamento de Erros**:
     1. **Sessão inválida, expirada ou revogada + artigo não público**: Responde **404 Not Found**, preservando o sigilo do rascunho como conteúdo inexistente.
     2. **Durable Object indisponível durante a autorização**: Se o DO estiver inacessível, com timeout ou erro de I/O durante a autorização de preview, responde **503 Service Unavailable** (falha fechada estrita: não entrega rascunho, distinguindo indisponibilidade de infraestrutura de conteúdo inexistente).
     3. **Artigo público**: Permanece normalmente acessível pela rota pública (200 OK), sem exigir nem depender de sessão de preview ou do estado do Durable Object.
   - **Logout Confirmado Apenas Pós-Persistência**: Na rota `/api/preview/logout` (POST com origem validada), o Worker invoca o `PreviewSessionDO` para persistir `revoked = true` para o `session_id`. A resposta de sucesso (redirecionamento 303 com zeramento de cookies no cliente) **só é confirmada após a confirmação síncrona da gravação da revogação no armazenamento persistente do DO**. Se a chamada ao DO falhar, a rota responde 503 (e zera cookies locais de contingência), sinalizando falha na revogação remota.
   - **Teste de Reutilização da Cópia do Cookie Após Logout**: Teste automatizado mandatório que:
     1. Autentica via POST em `/api/preview` e captura o cookie emitido;
     2. Acessa um artigo rascunho com sucesso;
     3. Executa POST em `/api/preview/logout` e aguarda confirmação de revogação no DO;
     4. Realiza nova requisição enviando a cópia capturada do cookie original;
     5. Comprova que o servidor consulta o DO, detecta a sessão revogada e **recusa o acesso ao rascunho com 404 real**, sem vazar conteúdo.

---

## 4. Descomissionamento Sequencial do Supabase Editorial

1. **Validação Prévia do Sanity**: Validar 100% PASS da leitura pública, SEO, rascunhos e preview servidos a partir do Sanity.
2. **Retirada Sequencial**: Desativar a dependência de leitura da tabela `posts` e o Supabase Auth utilizado anteriormente para preview.
3. **Preservação de Dados e Rollback**: O banco PostgreSQL e seus dados não são deletados nesta etapa, servindo como base de contingência e backup histórico.

---

## 5. Ordem de Execução

1. **Baseline e Validação do Worker Atual**: Validar a infraestrutura atual do Worker e conexão Supabase (`check/supabase-cloudflare/2026-10-08/VALIDATION.md`) como etapa intermediária, registrando resultados reais (PASS, FAIL, UNVERIFIABLE).
2. **Implementação do Novo Preview Seguro com Durable Object**: Implementar `PreviewSessionDO` com consistência forte, e atualizar `/api/preview`, `/api/preview/logout` e `lib/preview/` conforme o contrato desta spec (POST exclusivo, segredo no corpo, validação de origem, destino validado, grant assinado e revogação persistida no DO).
3. **Integração do Sanity Server-Side**: Configurar cliente Sanity em Server Components/Edge Runtime consumindo dados publicados para navegação anônima e rascunhos para sessões de preview autorizadas pelo DO.
4. **Alinhamento de Secrets e Ambiente**: Provisionar Project ID, Dataset, Read Token do Sanity, segredos de preview e binding do Durable Object na Cloudflare e GitHub Environments (sem exposição pública de credenciais).
5. **Verificação de Proteções do GitHub**: Avaliar regras de branches principais (PR obrigatória, checks exigidos, CODEOWNERS e aprovação de deploy).
6. **Validação Operacional Completa no Worker**: Provar em produção: conteúdo do Sanity renderizado, preview protegido funcional com revogação comprovada em teste de cópia, cache `no-store`, sitemap e 404 reais.

---

## 6. Plano de Rollback

Caso ocorra falha impeditiva na conectividade com o Sanity ou no provisionamento do dataset durante o deploy:

1. Reverter variáveis de ambiente para restaurar temporariamente a leitura da tabela `posts` no Supabase.
2. Manter backup prévio das migrations e dados em `posts` até que a validação empírica pós-deploy do Sanity esteja 100% PASS em produção.

---

## 7. Critérios de Aceite (ACs)

- [ ] **sanity/AC-01 (Fonte Única no Sanity)**: A home e a rota `/artigos/[slug]` obtêm artigos exclusivamente a partir do Sanity, sem dual-source ativo.
- [ ] **sanity/AC-02 (Preservação de Slugs e SEO)**: Slugs mantêm a mesma estrutura de URL e metadados OpenGraph/canonical coincidem com a nova origem.
- [ ] **sanity/AC-03 (Segurança de API)**: Chamadas ao Sanity ocorrem no servidor/Worker; tokens privados não vazam no bundle cliente.
- [ ] **sanity/AC-04 (Preview por POST sem Segredo na URL)**: Entrada e logout de preview respondem exclusivamente a POST (GET retorna 405). Segredo é enviado no corpo; requisições com origem divergente respondem 403; destino é restrito a slugs internos válidos.
- [ ] **sanity/AC-05 (Sessão em Durable Object, Revogação e Semântica de Falha)**: Sessão criada e persistida no Cloudflare Durable Object com consistência forte antes da emissão do cookie. Cookie assinado HMAC-SHA256 com TTL de 1800s. Consulta ao DO sem cache intermediário em cada autorização de preview. Semântica da falha fechada: sessão inválida, expirada ou revogada para artigo não público responde 404; indisponibilidade do DO durante a autorização responde 503 sem entregar rascunho; artigo público permanece acessível normalmente sem exigir preview. Logout só confirma 303 após persistência da revogação no DO. Reutilização de cópia do cookie após logout é rejeitada com 404 em teste automatizado.
- [ ] **sanity/AC-06 (Cache e Distinção de Erros)**: Respostas públicas e de preview mantêm `Cache-Control: no-store` (e `private, no-store` no preview). Slugs inexistentes respondem 404 real; indisponibilidade de infraestrutura responde status de erro adequado (503/500) sem mascarar falha como 404.
- [ ] **sanity/AC-07 (Alinhamento de Origem)**: `NEXT_PUBLIC_SITE_URL` e links canônicos usam o domínio oficial do Worker, sem resíduos de `gradualinfo.pages.dev`.
- [ ] **sanity/AC-08 (Descomissionamento Seguro)**: Supabase desonerado da camada editorial e auth de preview após validação 100% PASS do Sanity, mantendo backup sem deleção destrutiva.
