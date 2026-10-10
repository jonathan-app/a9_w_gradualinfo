# Scope: Portal de leitura do GradualInfo

> Documento dono do `/scope`: responde **o que construir e em que ordem**.
> Não decide COMO — isso é spec (`/architect`), uma spec por fatia.
>
> **Revisão 4 — 2026-10-10.** Reconciliação completa com o estado real da
> árvore após a transição editorial para Sanity (spec 0006 Accepted e
> implementada), o painel administrativo (0007), a admissão Access (0009) e o
> layout editorial (0010). As premissas 1 e 5 foram atualizadas: o artigo agora
> vive no Sanity, e o painel administrativo foi construído. A fase de
> migração Sanity está `in-progress` com 5 de 8 ACs PASS; o que bloqueia é
> provisionamento humano (conteúdo publicado, Durable Object, Access), não gap
> de código. A fila agora é: provisionar ambiente, fechar portões da 0006,
> depois avançar para conteúdo real (guia do notebook) e SEO aprofundado.
>
> **Revisão 3 — 2026-10-04.** Reconciliada com o estado real da árvore depois de
> edição concorrente comprovada: a spec de supersessão **já existia** e o
> `/check` **já não está bloqueado**. Três ajustes de escopo: SEO básico passou
> a acompanhar home e artigo (a fatia posterior aprofunda, não habilita);
> comentários e conta saíram das nove fatias de lançamento; e o Markdown puro foi
> reexplicado — ele não impede calculadoras nem selos na página, só remove
> execução de componente _dentro_ do corpo.
>
> **Revisão 2 — 2026-10-04, por decisão do dono.** A revisão 1 (mesmo dia, mais
> cedo) partiu de duas premissas erradas, corrigidas aqui: o artigo **não** vive
> em MDX/Velite, e sim no Supabase com corpo Markdown; e o público não é "leitor
> de tecnologia em geral", e sim **estudantes de programação**. As specs `0001` e
> `0002` da branch `feat/identidade-portal-gradualinfo` partem da premissa do
> MDX e precisam ser substituídas — ver "Specs a substituir".

## Premissas

**Decisões do dono (2026-10-04 e 2026-10-08). Estas não se redecidem aqui.**

1. **Artigo vive no Sanity, com o corpo em Markdown.** A premissa original de
   Supabase foi substituída pela spec 0006 (Accepted e implementada). O Sanity
   é a fonte editorial única para artigos, autores, editorias, fontes e mídia.
   O Supabase permanece para autenticação administrativa e quotas.
2. **`referencias/template-editorial/` é referência visual, não base de conteúdo.**
   Tipografia, cards, listagens, header/footer e a página de artigo são portados
   para TypeScript e Tailwind. A camada Velite/MDX do template é **descartada**.
3. **Público inicial: estudantes de programação.** O recorte é estreito de
   propósito: é o que permite ser útil em vez de apenas correto.
4. **Primeira jornada:** o guia "manter, melhorar ou comprar um notebook para
   estudar programação" — uma decisão prática, com critério explícito, que leva o
   leitor a um próximo passo fundamentado.
5. **Painel administrativo adaptado do TailAdmin sob `/admin-dashboard` (spec 0007).**
   Implementado para o administrador único (`a3qua96@gmail.com`), sem cadastro
   público de leitores, para navegação operacional, atalhos do Sanity Studio e
   disparo de preview seguro. A edição de artigos permanece no Sanity Studio
   (spec 0006), sem criar segundo editor na aplicação. Admissão via Cloudflare
   Access (spec 0009) antes de qualquer requisição administrativa.
6. **Fora deste scope, por decisão explícita:** histórico de preços, Selo
   "Oferta Verificada", segundo editor de conteúdo, RAG/busca semântica e comunidade.
   Cada um em spec própria, não em fatia.

## Evolução arquitetural

**A migração para Sanity já aconteceu** (spec 0006, Accepted e implementada em
2026-10-10). O Sanity é a fonte editorial única; o Supabase permanece para
autenticação administrativa e quotas (spec 0009). O portal lê artigos do Sanity
via GROQ, com fallback para Supabase durante a transição (seção 3.A da spec
0006). O que falta não é código: é provisionamento humano (conteúdo publicado,
Durable Object, Access) e fechamento dos portões de verificação.

**O que já existe e é reaproveitado.**

- Boilerplate Next.js 16 / React 19 / Supabase verificado, com `pnpm check:all`
  passando e `pnpm build` gerando o worker.
- `react-markdown` ^10 e `remark-gfm` ^4 instalados — é o que torna a decisão 1
  executável sem dependência nova.
- Tabela `posts` (`status`, `published_at`, `slug`, `excerpt`, `content`) com
  RLS ligado, policy por operação e índice `(status, created_at desc)` para
  listagem paginada. Ela é o exemplo didático do boilerplate e **vira o schema
  real do artigo**, por migração nova — não por gambiarra na tabela de exemplo.
- `profiles` 1:1 com `auth.users`, com trigger de criação e RLS por dono.
- `app/robots.ts`, `app/sitemap.ts`, `lib/site-config.ts`.
- Storybook, Vitest, Playwright, Lighthouse, Sentry e Semgrep.
- Sanity: `lib/sanity/` (cliente GROQ), `lib/services/sanity.ts` (queries),
  `lib/preview/` (Durable Object para sessões de preview).
- Cloudflare Access: `lib/admin/access-guard.ts` (guarda), `lib/admin/auth.ts`
  (autorização por `ADMIN_USER_ID` e AAL2), `scripts/validate-admin-access.mjs`
  (validação local).

**Base de conteúdo em Markdown, e o que isso permite e o que não.**

`react-markdown` renderiza no servidor e o HTML vem do React: não há
`dangerouslySetInnerHTML` nem superfície de XSS.

O que a decisão **remove** é estreito: a execução direta de componente React
_dentro_ do corpo do artigo, que é o que o MDX fazia. O que ela **não** remove
nada do que o briefing pede para a página:

- **Calculadoras e selos continuam possíveis** como componente separado ao redor
  ou entre blocos do artigo, renderizado pela rota, não pelo interpretador de
  Markdown.
- **Blocos estruturados continuam possíveis** como sintaxe convencionada no
  Markdown
  (por exemplo um bloco `:::calculadora` com parâmetros) tratada por um
  `rehype`/`remark` plugin próprio, que é a extensão legítima do Markdown e não
  MDX disguise.
- Ou por tabela separada, se o bloco precisar de consulta.

Ou seja: a fatia do Selo e a das calculadoras não foram adiadas por limitação
técnica da base de conteúdo. Foram adiadas por decisão de escopo, e a restrição
real é apenas que o corpo não executa componente — o que é uma boa propriedade.

**Riscos que definem a ordem.**

- _Zero de conteúdo é o pior estado possível_: um site de conteúdo com cinco
  editorias vazias parece quebrado e não ranqueia. Por isso a primeira fatia já
  entrega artigo real, não esquema pronto.
- _Esquema antes de estilo_: modelar dados errado custa migração; estilo errado
  custa CSS. O preço de errar é assimétrico.
- _Atrito de publicação é o gargalo real_: sem painel, se publicar um artigo
  exigir abrir terminal, a reda para. O painel administrativo (0007) resolve
  isso; a edição permanece no Sanity Studio, sem segundo editor na aplicação.

## At a glance

| #   | Feature                                | Phase      | Status      |
| --- | -------------------------------------- | ---------- | ----------- |
| A   | Stack & architecture                   | Foundation | existing    |
| B   | Coding standards & tooling             | Foundation | existing    |
| C   | Schema editorial Supabase (md-0001)    | Foundation | done        |
| D   | Gate revisão CI (0004)                 | Foundation | done        |
| E   | Casca editorial home+artigo (md-0002)  | Slice 1    | done        |
| F   | Preview autorização (0003)             | Slice 1    | done        |
| G   | Diretriz arquitetura Sanity (0005)     | Slice 2    | done        |
| H   | Transição editorial Sanity (0006)      | Slice 2    | in-progress |
| I   | Layout editorial home artigo (0010)    | Slice 2    | in-progress |
| J   | Painel administrativo TailAdmin (0007) | Slice 3    | in-progress |
| K   | Endurecimento auth admin MFA           | Slice 3    | done        |
| L   | Admissão Admin Access (0009)           | Slice 3    | in-progress |
| M   | AI security checklist (0008)           | Slice 3    | done        |
| N   | Primeira jornada: guia do notebook     | Slice 4    | planned     |
| O   | SEO aprofundado e auditoria            | Slice 4    | planned     |
| P   | Busca e recorte                        | Slice 4    | planned     |

## Foundations

### A. Stack & architecture · existing

Next.js 16, React 19, Supabase, Cloudflare Workers via OpenNext. Boilerplate verificado, `pnpm check:all` passando, `pnpm build` gerando o worker.

### B. Coding standards & tooling · existing

ESLint, Prettier, Husky, Vitest, Playwright, Sentry, Semgrep. `pnpm check:all` roda typecheck, lint, formatação e testes.

### C. Schema editorial Supabase (md-0001) · done

Migration que transforma `posts` no schema editorial real: autor, editoria, corpo Markdown, fontes citadas, estado de publicação, data de publicação e atualização, e imagem de capa. RLS por operação e índice de listagem. Verificado com 63 asserções pgTAP.
Spec `md-0001` · code em `supabase/migrations/`

### D. Gate revisão CI (0004) · done

Gate mecânico por SHA e árvore. `scripts/check-decision.mjs` e `scripts/check-gate.mjs` existem e foram testados nos cinco casos de reprovação.
Spec `0004` · code em `scripts/`

## Slice 1: Editorial legado (Supabase+Markdown)

### E. Casca editorial home+artigo (md-0002) · done

Home lista artigos publicados com capa, editoria, título, resumo e data. Página de artigo em `/artigos/[slug]` com corpo Markdown renderizado no servidor, `<h1>` único e fontes citadas visíveis. SEO básico: metadata, canonical, Open Graph, `Article` JSON-LD, sitemap dinâmico. Verificado com gate APROVADO.
Spec `md-0002` · code em `app/artigos/`, `app/page.tsx`, `lib/services/posts.ts`

### F. Preview autorização (0003) · done

Sessão de preview segura via Durable Object. Token de preview validado no servidor; rascunho visível apenas com sessão ativa.
Spec `0003` · code em `lib/preview/`, `app/api/preview/`

## Slice 2: Migração Sanity

### G. Diretriz arquitetura Sanity (0005) · done

Documentação preparada para versionamento: Sanity como fonte editorial única, Supabase para autenticação e quotas. Declara a transição como obrigação, não opcional.
Spec `0005` · code em `docs/specs/`

### H. Transição editorial Sanity (0006) · in-progress

Sanity como fonte editorial única: leitura via GROQ, publicação via Studio, preview com Durable Object, probe de disponibilidade no proxy, fallback para Supabase durante a transição. **5 de 8 ACs PASS.** O que bloqueia: AC-02 (artigo publicado no dataset), AC-05 (Durable Object publicado), AC-08 (gate 100% PASS antes). Nenhum gap de código.
Spec `0006` · code em `lib/sanity/`, `lib/services/sanity.ts`, `lib/supabase/middleware.ts`

- [x] Design it (spec): `/architect transição editorial Sanity`
- [x] Build it: `/develop transição editorial Sanity`
  - [x] Schema Sanity + queries GROQ (AC-01, AC-03)
  - [x] Preview com Durable Object (AC-04, AC-07)
  - [x] Probe de disponibilidade + EditorialIndisponivel (AC-06)
- [ ] Verify it: `/check verify transição editorial Sanity`
  - [ ] AC-02: artigo publicado no dataset (precondição humana)
  - [ ] AC-05: Durable Object publicado (precondição humana)
  - [ ] AC-08: gate 100% PASS antes (decisão da spec, seção 6)
- [ ] Review it: `/check review transição editorial Sanity`
- [ ] Audit security: `/security transição editorial Sanity`
- [ ] Test it: `/test transição editorial Sanity`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`

### I. Layout editorial home artigo (0010) · in-progress

Hierarquia editorial na home: esboço do post no topo, lista com capa, editoria, título, resumo e data. Artigo com largura de 720 px, tipografia editorial e fallback neutro. **Verify bloqueado por ambiente** (listen EPERM, navegador indisponível). 0 PASS, 10 UNVERIFIABLE.
Spec `0010` · code em `app/page.tsx`, `app/artigos/[slug]/page.tsx`, `components/editorial/`

- [x] Design it (spec): `/architect layout editorial home artigo`
- [x] Build it: `/develop layout editorial home artigo`
  - [x] Home com esboço + lista editorial
  - [x] Artigo com 720 px e tipografia
  - [x] Fallback neutro para capa ausente
- [ ] Verify it: `/check verify layout editorial home artigo`
- [ ] Review it: `/check review layout editorial home artigo`
- [ ] Audit security: `/security layout editorial home artigo`
- [ ] Test it: `/test layout editorial home artigo`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`

## Slice 3: Administração

### J. Painel administrativo TailAdmin (0007) · in-progress

Central de comando sob `/admin-dashboard`: navegação operacional, atalhos do Sanity Studio, disparo de preview seguro. MFA exigido, guards em cada rota. **7 PASS, 7 UNVERIFIABLE** (precisa ambiente Cloudflare Access).
Spec `0007` · code em `app/admin-dashboard/`, `lib/admin/`

- [x] Design it (spec): `/architect painel administrativo TailAdmin`
- [x] Build it: `/develop painel administrativo TailAdmin`
  - [x] Layout TailAdmin portado
  - [x] Guards e MFA
  - [x] Atalhos Sanity Studio
- [ ] Verify it: `/check verify painel administrativo TailAdmin`
- [ ] Review it: `/check review painel administrativo TailAdmin`
- [ ] Audit security: `/security painel administrativo TailAdmin`
- [ ] Test it: `/test painel administrativo TailAdmin`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`

### K. Endurecimento auth admin MFA · done

MFA obrigatório, fluxo de recuperação, proteção em profundidade. Verificado com 7/7 PASS.
Code em `lib/admin/auth.ts`

### L. Admissão Admin Access (0009) · in-progress

Cloudflare Access como portão de entrada para `/admin-dashboard`. Validação JWT/JWKS, contexto confiável, quota por sessão. **10 PASS, 3 UNVERIFIABLE** (precisa ambiente Cloudflare com conta de teste).
Spec `0009` · code em `lib/admin/access-guard.ts`, `scripts/validate-admin-access.mjs`

- [x] Design it (spec): `/architect admissão Admin Access`
- [x] Build it: `/develop admissão Admin Access`
  - [x] Guarda Access antes de assets/OpenNext
  - [x] Validação JWT/JWKS
  - [x] Contexto confiável e logout
- [ ] Verify it: `/check verify admissão Admin Access`
- [ ] Review it: `/check review admissão Admin Access`
- [ ] Audit security: `/security admissão Admin Access`
- [ ] Test it: `/test admissão Admin Access`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`

### M. AI security checklist (0008) · done

Documentação de referência para uso seguro de IA no projeto. Implementação opcional por área.
Spec `0008` · code em `docs/specs/`

## Slice 4: Conteúdo e SEO

### N. Primeira jornada: guia do notebook · planned

Um artigo completo e real sobre manter, melhorar ou comprar um notebook para estudar programação: critério explícito, fontes citadas, e um próximo passo que o leitor consegue executar. **Bloqueado:** precisa de conteúdo publicado no Sanity (precondição da 0006).
**Done when:** o guia está publicado no Sanity, aparece na home, e a página de artigo renderiza corretamente com fontes citadas e SEO.

- [ ] Design it (spec): `/architect primeira jornada guia do notebook`

### O. SEO aprofundado e auditoria · planned

Core Web Vitals dentro do orçamento do Lighthouse, dados estruturados validados, `sitemap` por editoria e auditoria de indexação. Inclui home canonical (WARNING da 0006) e sitemap follow-up (0006 seção 3.C). **Bloqueado:** precisa de conteúdo existente para auditar.
**Done when:** Lighthouse dentro do orçamento, JSON-LD validado, sitemap cobre todas as rotas, auditoria de indexação registrada.

- [ ] Design it (spec): `/architect SEO aprofundado e auditoria`

### P. Busca e recorte · planned

Busca textual no título, resumo e corpo, tolerante a erro de digitação, com recorte por editoria. **Bloqueado:** precisa de conteúdo existente.
**Done when:** busca funciona em `/busca`, com recorte por editoria e tolerância a erro de digitação.

- [ ] Design it (spec): `/architect busca e recorte`

### Por que esta ordem

- **Foundations antes de tudo**: sem schema e sem gates, não há como construir
  com segurança. md-0001 e 0004 são o alicerce.
- **Slice 1 é o walking skeleton**: casca editorial e preview já funcionam
  (verificados). A migração Sanity (Slice 2) substitui a fonte de dados, não a
  interface.
- **Slice 2 é a transição**: Sanity como fonte única, layout editorial
  refinado. O que bloqueia não é código: é provisionamento humano (conteúdo,
  DO, Access).
- **Slice 3 é a administração**: painel, MFA, Access. Tudo construído; falta
  ambiente Cloudflare para verificar.
- **Slice 4 é a prova**: um artigo real é o único jeito de provar que schema,
  rota, render, fontes e SEO funcionam juntos. Nenhum AC das fatias anteriores
  sobrevive a um conteúdo que não existe.
- **SEO aprofundado e busca depois**: as duas melhoram um portal que já
  publica. Nenhuma é pré-requisito de demonstrar utilidade ao leitor.

## Fora do escopo (explícito)

| Não entra agora                                    | Por quê                                                                                                                                                             | Onde entra                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Histórico de preços e **Selo "Oferta Verificada"** | Decisão do dono: spec própria. Além disso é a parte de maior risco — exige fonte de terceiro e janela de 30 dias, e **a fonte ainda não está definida**.            | spec própria, depois da leitura |
| Painel editorial (`/redacao`)                      | **Superseded**: o painel administrativo (0007) já foi construído sob `/admin-dashboard`. A edição de artigos permanece no Sanity Studio.                            | já entregue (0007)              |
| RAG e busca semântica                              | Não faz sentido com menos de ~50 artigos.                                                                                                                           | spec própria                    |
| Comunidade, comentários e fóruns                   | Decisão do dono: fora do MVP. Comentário exige moderação contínua, que é operação, não entrega de código.                                                           | pós-MVP, spec própria           |
| Blocos estruturados no corpo (calculadora, selo)   | Não é limitação do Markdown: o corpo não executa componente, mas plugin de bloco, componente separado ou tabela resolvem. **Decidido junto com o Selo, não antes.** | spec do Selo                    |
| Vídeo, shorts, podcast                             | Exige pipeline de mídia que não existe na stack.                                                                                                                    | fora                            |
| Monetização, anúncios e afiliados                  | Antes de existir tráfego, qualquer modelo é chute.                                                                                                                  | fora                            |
| Multi-idioma, PWA, app nativo                      | Não resolvem o gargalo do MVP.                                                                                                                                      | fora                            |

## Follow-ups surfados durante a construção

Estes são pendências que emergiram durante a implementação e precisam de
enrolamento no escopo ou em spec própria:

1. **Home canonical** (WARNING da 0006): a home não tem `link rel=canonical`.
   É SEO debt, entra na fatia O (SEO aprofundado).
2. **Sitemap follow-up** (0006 seção 3.C): `/sitemap.xml` chama
   `getPublishedPosts` mas está fora do `matcher` do proxy. Registrar como
   follow-up, não como parte da AC. Entra na fatia O.
3. **Produção Access** (0009 follow-up): configurar issuer, AUD, hosts,
   ownerEmail em produção. É provisionamento humano, não skill.
4. **Índice de specs corrigido**: `docs/specs/INDICE.md` atualizado pelo `/sync`.

## Specs vigentes

Todas as specs abaixo estão `Accepted`. A colisão de identificador `0001`/`0002`
foi resolvida pelo prefixo `md-` nas specs de supersessão.

| Spec      | Artefato                                   | Status             |
| --------- | ------------------------------------------ | ------------------ |
| `md-0001` | `md-0001-arquitetura-markdown-supabase.md` | Accepted           |
| `md-0002` | `md-0002-casca-editorial-home.md`          | Accepted           |
| `0003`    | `0003-preview-autorizacao.md`              | Accepted           |
| `0004`    | `0004-gate-revisao-ci.md`                  | Accepted           |
| `0005`    | `0005-diretriz-arquitetura-evolucao.md`    | Accepted (docs)    |
| `0006`    | `0006-transicao-editorial-sanity.md`       | Accepted           |
| `0007`    | `0007-painel-administrativo-tailadmin.md`  | Accepted           |
| `0008`    | `0008-ai-security-checklist.md`            | Accepted (docs)    |
| `0009`    | `0009-admissao-admin-access.md`            | Accepted           |
| `0010`    | `0010-layout-editorial-home-artigo.md`     | Accepted           |
| `0852`    | `rate-limiting-admin.md`                   | Superseded by 0009 |

## Próxima etapa

A fila atual é **provisionamento humano**, não trabalho de skill:

1. **Publicar pelo menos um artigo no dataset do Sanity** — desbloqueia AC-02
   da 0006 e torna o site real.
2. **Publicar o Durable Object na Cloudflare** — desbloqueia AC-05 da 0006.
3. **Configurar Cloudflare Access** (issuer, AUD, hosts, conta de teste) —
   desbloqueia as ACs de 0007 e 0009.

Depois do provisionamento, `/check verify` reexecuta as specs 0006, 0007,
0009 e 0010 nos ambientes corretos. Se qualquer AC fechar com PASS, o gate
pode aprovar.

O trabalho de skill que pode avançar **agora** (sem provisionamento):

- **Home canonical** (SEO debt da 0006): `/develop` pode adicionar
  `link rel=canonical` na home.
- **Sitemap follow-up** (0006 seção 3.C): `/develop` pode corrigir o
  `matcher` do proxy para cobrir `/sitemap.xml`.
- **Índice de specs** (md-0002 desatualizado): `/sync` pode corrigir
  `docs/specs/INDICE.md`.

Se o dono quiser avançar para a próxima fatia de produto (guia do notebook),
o caminho é: provisionar Sanity, depois `/architect` para a spec da jornada.
