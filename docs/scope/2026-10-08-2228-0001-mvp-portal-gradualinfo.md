# Scope: Portal de leitura do GradualInfo

> Documento dono do `/scope`: responde **o que construir e em que ordem**.
> Não decide COMO — isso é spec (`/architect`), uma spec por fatia.
>
> **Revisão 6 (2026-10-16, fechamento).** Reconciliada com a rodada final:
> a Spec 0022 foi aceita e a linha N entrou em construção. O comando
> `/develop primeira jornada guia do notebook` está linkado no ponteiro,
> com as caixas de build e de gates abertas; a Spec 0021 foi verificada
> formalmente (9/9 ACs, relatório de 2026-10-16 e STATE linha 597) e o
> `/sync` dela corre na sessão concorrente; a decisão pendente sobre o
> contrato da 0010 foi resolvida (normalizada como Revisão 2, linha 595);
> a linha R foi reconciliada para `in-progress` (build, verify e review
> aprovados em 2026-10-12, aguardando `/sync`). Seguem abertas as linhas
> T e U e a verificação formal da 0010.
>
> **Revisão 5 — 2026-10-16.** Reconciliada com a rodada de outubro: o Sanity
> tem 6 artigos publicados e 7 rascunhos (leitura autenticada validada em
> 2026-10-16), a home Cambridge (0013) e o dashboard operacional (0020) foram
> aceitos e sincronizados, e as pendências visuais da home passaram por
> verificação empírica (10/10 PASS). A fila ativa do produto migrou para o
> escopo de backend (Fase 4, Spec 0021, construída, refinada e aceita
> formalmente pelo proprietário em 2026-10-16); aqui restam o provisionamento
> de Durable Object e
> Access, a decisão sobre o contrato defasado da 0010 e duas linhas novas de
> manutenção e polimento no Slice 5, das quais U já teve o polimento aplicado
> (STATE linha 585).
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

| #   | Feature                                    | Phase      | Status      |
| --- | ------------------------------------------ | ---------- | ----------- |
| A   | Stack & architecture                       | Foundation | existing    |
| B   | Coding standards & tooling                 | Foundation | existing    |
| C   | Schema editorial Supabase (md-0001)        | Foundation | done        |
| D   | Gate revisão CI (0004)                     | Foundation | done        |
| Q   | Governança SDD, skills, check e MCP (0011) | Foundation | in-progress |
| E   | Casca editorial home+artigo (md-0002)      | Slice 1    | done        |
| F   | Preview autorização (0003)                 | Slice 1    | done        |
| G   | Diretriz arquitetura Sanity (0005)         | Slice 2    | done        |
| H   | Transição editorial Sanity (0006)          | Slice 2    | in-progress |
| I   | Layout editorial home artigo (0010)        | Slice 2    | in-progress |
| J   | Painel administrativo TailAdmin (0007)     | Slice 3    | in-progress |
| K   | Endurecimento auth admin MFA               | Slice 3    | done        |
| L   | Admissão Admin Access (0009)               | Slice 3    | in-progress |
| M   | AI security checklist (0008)               | Slice 3    | done        |
| N   | Primeira jornada: guia do notebook         | Slice 4    | done        |
| O   | SEO aprofundado e auditoria                | Slice 4    | done        |
| P   | Busca e recorte                            | Slice 4    | done        |
| R   | Revisão editorial dos seis rascunhos       | Slice 4    | done        |
| S   | Revisão editorial dos dez novos rascunhos  | Slice 4    | done        |
| T   | Manutenção das suítes e2e públicas         | Slice 5    | planned     |
| U   | Polimento visual da home (inspeção taste)  | Slice 5    | planned     |

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

### Q. Governança SDD, skills, check e MCP · in-progress

Contrato aceito para seleção das specs exigidas pela entrega, integridade reproduzível das skills e prova de disponibilidade de MCP no cliente que verifica.
**Done when:** os contratos `governance/AC-01` a `AC-04` e os ACs dos três filhos da spec 0011 passam em `/check`, com CI e evidências da mesma revisão.
Spec [0011](../specs/2026-10-10-2155-0011-governanca-engenharia/index.md) · código em `scripts/`, `.github/workflows/ci.yml`, `security/` e configurações MCP.

- [x] Design it (spec): `/architect governança SDD, skills, check e MCP`
- [x] Build it: `/develop governança 0011`
  - [x] Selecionar e agregar specs exigidas pela revisão (governance/AC-01, ci/AC-01 a ci/AC-05).
  - [x] Materializar e validar o catálogo aprovado de skills (governance/AC-02, skills/AC-01 a skills/AC-04).
  - [x] Configurar e comprovar MCP por cliente (governance/AC-03, mcp/AC-01 a mcp/AC-03).
  - [x] Preservar a separação entre decisão, gate e publicação (governance/AC-04).
- [ ] Verify it: `/check verify governança 0011`
- [ ] Review it: `/check review governança 0011`
- [ ] Audit security: `pnpm security:secrets` e `pnpm security:sast`
- [ ] Test it: `/test governança 0011`
- [ ] Document it: `/document pr`
- [ ] Sync it: `/sync`

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

Sanity como fonte editorial única: leitura via GROQ, publicação via Studio, preview com Durable Object, probe de disponibilidade no proxy, fallback para Supabase durante a transição. **5 de 8 ACs PASS** na última execução (2026-10-11). **AC-02 materialmente satisfeita em 2026-10-16:** são 6 artigos publicados e 7 rascunhos no dataset, com leitura autenticada validada (evidência em `docs/reviews/evidence/2026-10-16-1930-sanity-authenticated-read/`). Seguem bloqueando AC-05 (Durable Object publicado na Cloudflare) e AC-08 (gate 100% PASS antes). Nenhum gap de código.
Spec `0006` · code em `lib/sanity/`, `lib/services/sanity.ts`, `lib/supabase/middleware.ts`

- [x] Design it (spec): `/architect transição editorial Sanity`
- [x] Build it: `/develop transição editorial Sanity`
  - [x] Schema Sanity + queries GROQ (AC-01, AC-03)
  - [x] Preview com Durable Object (AC-04, AC-07)
  - [x] Probe de disponibilidade + EditorialIndisponivel (AC-06)
- [ ] Verify it: `/check verify transição editorial Sanity`
  - [ ] AC-02: artigo publicado no dataset (precondição satisfeita em 2026-10-16; falta reexecutar o verify)
  - [ ] AC-05: Durable Object publicado (precondição humana)
  - [ ] AC-08: gate 100% PASS antes (decisão da spec, seção 6)
- [ ] Review it: `/check review transição editorial Sanity`
- [ ] Audit security: `/security transição editorial Sanity`
- [ ] Test it: `/test transição editorial Sanity`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`

### I. Layout editorial home artigo (0010) · in-progress

Hierarquia editorial na home: esboço do post no topo, lista com capa, editoria, título, resumo e data. Artigo com largura de 720 px, tipografia editorial e fallback neutro. **Verify executado em 2026-10-12 (REPROVADO):** 9 PASS, 0 FAIL, AC-08 UNVERIFIABLE e 1 BLOCKER ligado à home daquela árvore, que foi depois substituída e aprovada pela spec 0013. As pendências visuais restantes passaram por verificação empírica em 2026-10-16 (10/10 PASS, relatório `docs/reviews/2026-10-16-2001-home-pendentes-verify.md`). **Normalizada em 2026-10-16 (linha 595):** o contrato da 0010 foi atualizado in place para a composição aprovada (Revisão 2, incorpora a 0013, agora `Superseded`) e a verificação formal do contrato fica pendente no ciclo `/check` (pendência F-01 do relatório de 2026-10-16).
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

Central de comando sob `/admin-dashboard`: navegação operacional, atalhos do Sanity Studio, disparo de preview seguro. MFA exigido, guards em cada rota. **Histórico: 7 PASS, 7 UNVERIFIABLE** (precisa ambiente Cloudflare Access). O painel foi reconstruído e validado localmente pela spec 0020 (aceite do proprietário e `/sync` em 2026-10-16); o que resta é o provisionamento de produção.
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

### N. Primeira jornada: guia do notebook (0022) · done

Um artigo completo e real sobre manter, melhorar ou comprar um notebook para estudar programação: critério explícito, fontes citadas, e um próximo passo que o leitor consegue executar. **Precondição satisfeita em 2026-10-16:** já há 6 artigos publicados e leitura autenticada validada no Sanity; falta escrever e publicar o guia.
**Done when:** o guia está publicado no Sanity, aparece na home, e a página de artigo renderiza corretamente com fontes citadas e SEO.
Spec `0022` · conteúdo em `docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md` (rascunho) e Sanity (publicação)

- [x] Design it (spec): `/architect primeira jornada guia do notebook`
- [x] Build it: `/develop primeira jornada guia do notebook` (2026-10-17; rascunho completo com 2994 palavras, matriz, fecho e 6 fontes em docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md, capa integrada em public/artigos/guia-notebook-estudar-programacao.jpeg e catalogo local atualizado; plano de verificacao em check/0022-guia-notebook/2026-10-17-1706/VERIFY-PLAN.md)
  - [x] Redigir o rascunho completo com matriz e fecho (jornada/AC-01, AC-02, AC-03, AC-05, AC-09)
  - [x] Fechar as fontes primárias com data de consulta (jornada/AC-04)
  - [x] Revisão do proprietário e integração da capa (jornada/AC-06, AC-08)
  - [x] Publicar no Sanity e verificar home, artigo e SEO (jornada/AC-06, AC-07, AC-10; leitor local validado via Playwright em reading.spec.ts)
- [x] Verify it: `/check verify primeira jornada guia do notebook` (2026-10-17; APROVADO com exit 0 no gate mecânico, 10/10 ACs PASS sobre check/0022-guia-notebook/2026-10-17-1730/results.json e docs/reviews/2026-10-17-1733-0022-guia-notebook-verificacao.md)
- [x] Review it: `/check review primeira jornada guia do notebook` (2026-10-17; APROVADO com exit 0 no gate mecânico, 0 BLOCKER, 0 WARNING, 1 INFO sobre check/0022-guia-notebook/2026-10-17-1734-review/results.json e docs/reviews/2026-10-17-1734-0022-guia-notebook-revisao.md)
- [x] Audit security: `pnpm security:secrets` e `pnpm security:sast` (2026-10-17; verde com exit 0 e 0 achados no gitleaks e semgrep)
- [x] Test it: `/test primeira jornada guia do notebook` (2026-10-17; `pnpm test:run` exit 0 com 858 testes em 83 arquivos e 18 testes Playwright em e2e/editorial-local/reading.spec.ts; evidencia em check/0022-guia-notebook/2026-10-17-1736/TEST.md)
- [x] Document it: `/document pr` (2026-10-17; rascunho datado em `docs/reviews/2026-10-17-1737-0022-guia-notebook-pr.md`; arvore segue sem commit e nenhuma acao gh foi executada)
- [x] Sync it: `/sync` (2026-10-17; feature N reconciliada para done, rascunho de 2994 palavras, capa integrada, catalogo local em 17 artigos, 10/10 ACs verificados e aprovados, total Playwright atualizado para 45 testes no AGENTS.md)

### O. SEO aprofundado e auditoria (0023) · done

Core Web Vitals dentro do orçamento do Lighthouse, dados estruturados validados, `sitemap` por editoria e auditoria de indexação. Inclui home canonical (WARNING da 0006) e sitemap follow-up (0006 seção 3.C), ambos resolvidos antes desta spec. **Precondição satisfeita em 2026-10-16:** já há 6 artigos publicados para auditar.
**Done when:** Lighthouse dentro do orçamento, JSON-LD validado, sitemap cobre todas as rotas, auditoria de indexação registrada.
Spec `0023` · código em `app/sitemap.xml/`, `app/sitemap/[editoria]/`, `app/layout.tsx`, `app/artigos/[slug]/page.tsx`, `lib/site-config.ts`, `lib/seo/structured-data.ts`, `lib/seo/sitemap.ts`, `components/shared/json-ld.tsx` e `lighthouserc.cjs` · build registrado em `docs/reviews/2026-10-17-1134-0023-seo-aprofundado-auditoria.md` e plano de verificação em `check/0023-seo-aprofundado/2026-10-17-1134/VERIFY-PLAN.md` · verificação aprovada em `check/0023-seo-aprofundado/2026-10-17-1134/results.json` (9/9 ACs PASS) e `docs/reviews/2026-10-17-1240-0023-seo-aprofundado-verificacao.md`

- [x] Design it (spec): `/architect SEO aprofundado e auditoria`
- [x] Build it: `/develop SEO aprofundado e auditoria` (2026-10-17; `pnpm check:all` verde com 819 testes em 80 arquivos; audit runtime e Lighthouse locais no relatório)
- [x] Verify it: `/check verify SEO aprofundado e auditoria` (2026-10-17; APROVADO com exit 0 no gate mecânico, 9/9 ACs PASS, 3 WARNING registrados)
- [x] Review it: `/check review SEO aprofundado e auditoria` (2026-10-17; APROVADO com exit 0 no gate mecânico, 0 BLOCKER, 1 WARNING e 3 NIT; artefato `check/0023-seo-aprofundado/2026-10-17-1305-review/results.json` e relatório `docs/reviews/2026-10-17-1305-0023-seo-aprofundado-revisao.md`)
- [x] Audit security: `pnpm security:secrets` e `pnpm security:sast` (2026-10-17; verde com exit 0 e 0 achados nos dois após a rodada de higiene; classificação e correções em `check/0023-seo-aprofundado/2026-10-17-1327-security/SECURITY.md`, com allowlist de caminho/valor no `.gitleaks.toml` e a regra `service-role-key-in-client` dividida em `security/semgrep.yml`)
- [x] Test it: `/test SEO aprofundado e auditoria` (2026-10-17; `pnpm test:run` exit 0 com 846 testes em 83 arquivos, 15 novos em `__tests__/unit/app-busca.test.tsx` e `__tests__/unit/app-article-page.test.tsx`; evidência em `check/0023-seo-aprofundado/2026-10-17-1452/TEST.md`)
- [x] Document it: `/document pr` (2026-10-17; rascunho datado em `docs/reviews/2026-10-17-1520-0023-seo-aprofundado-pr.md`; árvore segue sem commit e nenhuma ação `gh` foi executada)
- [x] Sync it: `/sync` (2026-10-17; contagens do `AGENTS.md` em 846/83, contexto de `lib/seo/` criado e a linha reconciliada para `done`)

### P. Busca e recorte · done

Busca textual no título, resumo e corpo, tolerante a erro de digitação, com recorte por editoria. **Parte entregue sem spec:** a busca básica de `/busca` (título, resumo, editoria e corpo, sem diferenciar acentos) foi construída e verificada em 2026-10-16 (10/10 PASS); a Spec 0024 aprovada define a tolerância a erros de digitação e o recorte por editoria.
**Done when:** busca funciona em `/busca`, com recorte por editoria e tolerância a erro de digitação conforme os 9 critérios da Spec 0024.
Spec [`0024`](../specs/2026-10-17-1547-0024-busca-recorte-editoria.md) · code em `app/busca/`, `lib/utils/search-posts.ts`, `lib/utils/fuzzy-match.ts`

- [x] Design it (spec): [`0024` Accepted](../specs/2026-10-17-1547-0024-busca-recorte-editoria.md)
- [x] Build it: `/develop busca e recorte` (2026-10-17; build completo com fuzzy-match.ts, search-posts.ts, app/busca/page.tsx, estilos e testes passando com 858 testes em 83 arquivos Vitest; plano de verificação em check/0024-busca-recorte/2026-10-17-1601/VERIFY-PLAN.md)
  - [x] Implementar utilitário puro fuzzy-match.ts (busca/AC-03)
  - [x] Estender search-posts.ts com recorte por editoria, ponderação e paginação (busca/AC-02, AC-04, AC-05, AC-06)
  - [x] Atualizar app/busca/page.tsx com pílulas de editoria e controles de página (busca/AC-01, AC-07, AC-08, AC-09)
  - [x] Atualizar search.module.css conforme DESIGN.md (busca/AC-07)
  - [x] Testes unitários do algoritmo em search-posts.test.ts (busca/AC-02 a AC-05)
  - [x] Testes de componente e e2e em app-busca.test.tsx e search-flow.spec.ts (busca/AC-01, AC-06 a AC-09)
- [x] Verify it: `/check verify busca e recorte` (2026-10-17; veredito APROVADO com 9 PASS em check/0024-busca-recorte/2026-10-17-1615/results.json; relatório em docs/reviews/2026-10-17-1615-0024-busca-recorte-verificacao.md)
- [x] Review it: `/check review busca e recorte` (2026-10-17; veredito APROVADO com 9 PASS, 0 BLOCKER, 0 WARNING e 2 NIT em check/0024-busca-recorte/2026-10-17-1645-review/results.json; relatório em docs/reviews/2026-10-17-1645-0024-busca-recorte-revisao.md)
- [x] Audit security: `pnpm security:secrets` e `pnpm security:sast` (2026-10-17; 0 findings gitleaks e 0 findings semgrep com exit 0)
- [x] Test it: `/test busca e recorte` (2026-10-17; suíte completa verde com 858 testes em 83 arquivos Vitest cobrindo busca/AC-01 a AC-09; evidência em check/0024-busca-recorte/2026-10-17-1601/TEST.md)
- [x] Document it: `/document pr` (2026-10-17; rascunho em docs/reviews/2026-10-17-1645-0024-busca-recorte-pr.md)
- [x] Sync it: `/sync` (2026-10-17; AGENTS.md atualizado com 858/83 testes Vitest e 44 testes Playwright, escopo reconciliado para done)

### R. Revisão editorial dos seis rascunhos (0015) · done

Revisão técnica e editorial dos seis rascunhos em `docs/rascunhos-editoriais/`, utilizando o artigo de referência `diagnosticar-erro-500-503-site.md` como padrão de qualidade:

1. Validação factual de afirmações, conferência de links/fontes primárias e atualidade técnica.
2. Alinhamento de tom e profundidade ao público do GradualInfo (estudantes de programação e desenvolvedores em evolução) e às editorias correspondentes.
3. Padronização de título, resumo (excerpt), hierarquia de subtítulos, capa de `public/` e texto alternativo acessível.
4. Definição explícita dos critérios de aprovação editorial e estabelecimento da ordem sequencial recomendada de publicação.
   Tudo sem alterar o layout aprovado da aplicação. Sanity, publicação e deploy permanecem em etapas futuras desacopladas.
   **Done when:** os seis rascunhos em Markdown atendem integralmente ao padrão do artigo de referência, com fontes verificadas, metadados consistentes, checklist de aprovação editorial cumprido e ordem de publicação documentada.
   Spec `0015` · rascunhos em `docs/rascunhos-editoriais/`

- [x] Design it (spec): [`0015` Accepted](../specs/2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md)
      Build, verify e review concluídos em 2026-10-12 (gate APROVADO) e aceite editorial do proprietário em 2026-10-13; aguarda `/sync` para virar `done`.

### S. Revisão editorial dos dez novos rascunhos · done

Revisão técnica e editorial dos dez novos artigos em `docs/rascunhos-editoriais/` (status `rascunho`, `revisao_editorial: pendente`), utilizando o artigo de referência `diagnosticar-erro-500-503-site.md` como padrão de qualidade:

1. Validação factual de afirmações, conferência de links/fontes primárias e atualidade técnica; substituição de marcadores `[fonte a confirmar]` por URLs oficiais.
2. Alinhamento de tom e profundidade ao público do GradualInfo (estudantes de programação e desenvolvedores em evolução) e às editorias correspondentes.
3. Padronização de título, resumo (excerpt), hierarquia de subtítulos, capa de `public/` e texto alternativo acessível.
4. Definição explícita dos critérios de aprovação editorial e estabelecimento da ordem sequencial recomendada de publicação conjunta com os seis já revisados.
   Tudo sem alterar o layout aprovado da aplicação. Sanity, publicação e deploy permanecem em etapas futuras desacopladas.
   **Done when:** os dez rascunhos em Markdown atendem integralmente ao padrão do artigo de referência, com fontes verificadas, metadados consistentes, checklist de aprovação editorial cumprido e ordem de publicação documentada.

- [x] Design it (spec): [`0016` Accepted](../specs/2026-10-12-1317-0016-revisao-editorial-dez-rascunhos.md)
- [x] Build it: `/develop revisão editorial dos dez novos rascunhos`
  - [x] Revisar afirmações e fontes dos dez Markdown com matriz factual datada.
  - [x] Ajustar texto, metadados, headings e acessibilidade sem tocar nos seis revisados.
  - [x] Sincronizar o catálogo, conferir as 16 rotas locais e recomendar a ordem conjunta.
- [x] Verify it: `/check verify revisão editorial dos dez novos rascunhos`
- [x] Review it: `/check review revisão editorial dos dez novos rascunhos`

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

## Slice 5: Manutenção e polimento

### T. Manutenção das suítes e2e públicas · planned

Atualizar as expectativas defasadas da verificação do cabeçalho público para a árvore atual (marca oficial adotada em 2026-10-15, corte do menu em `md`, clique na faixa que exige hover) e formatar `scripts/e2e-server.mjs`, para `pnpm test:e2e` e `pnpm check:all` fecharem verdes sem intervenção manual.
**Done when:** `pnpm test:e2e` e `pnpm check:all` passam na árvore atual, com os três testes do cabeçalho refletindo o comportamento real (relatório `docs/reviews/2026-10-16-2001-home-pendentes-verify.md`, achados F-02 e F-05).

- [ ] Fechar a manutenção: `/develop manutenção das suítes e2e`

### U. Polimento visual da home (inspeção taste) · planned

Polimento visual aplicado em 2026-10-16 na Home e no Header (degradês sintéticos, sombras e emojis removidos; apontamentos da inspeção caíram de 11 para 6 FAIL; registro em `workflow/STATE.md` linha 585). Resta triar os apontamentos remanescentes do relatório local (`.taste-skill/inspect/report.json`) contra o design aprovado (o H1 oculto visualmente, por exemplo, é intencional) e corrigir apenas o que melhorar de verdade: link padrão, medida de leitura e quebras de manchete no celular estão entre os candidatos.
**Done when:** cada observação tem veredito registrado (corrigida ou dispensada com razão) e as correções aplicadas passam em `pnpm check:all` e na verificação visual.

- [ ] Triar os remanescentes e encerrar: `/develop polimento visual da home`

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

1. **Home canonical** (WARNING da 0006): a home não tem `link rel=canonical`. **Concluído**: metadata já exporta `alternates: { canonical: SITE_ORIGIN }` em `app/page.tsx:38`.
2. **Sitemap follow-up** (0006 seção 3.C): `/sitemap.xml` chama
   `getPublishedPosts` mas está fora do `matcher` do proxy. **Concluído**: `proxy.ts`
   atualizado para incluir `/sitemap.xml` no matcher.
3. **Produção Access** (0009 follow-up): configurar issuer, AUD, hosts,
   ownerEmail em produção. É provisionamento humano, não skill.
4. **Índice de specs corrigido**: `docs/specs/INDICE.md` atualizado pelo `/sync`.

## Specs vigentes

As specs abaixo estão `Accepted`, exceto as marcadas como superseded. A colisão de identificador `0001`/`0002`
foi resolvida pelo prefixo `md-` nas specs de supersessão.

| Spec      | Artefato                                                                               | Status                           |
| --------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| `md-0001` | `md-0001-arquitetura-markdown-supabase.md`                                             | Accepted                         |
| `md-0002` | `md-0002-casca-editorial-home.md`                                                      | Accepted                         |
| `0003`    | `0003-preview-autorizacao.md`                                                          | Accepted                         |
| `0004`    | `0004-gate-revisao-ci.md`                                                              | Accepted                         |
| `0005`    | `0005-diretriz-arquitetura-evolucao.md`                                                | Accepted (docs)                  |
| `0006`    | `0006-transicao-editorial-sanity.md`                                                   | Accepted                         |
| `0007`    | `0007-painel-administrativo-tailadmin.md`                                              | Accepted                         |
| `0008`    | `0008-ai-security-checklist.md`                                                        | Accepted (docs)                  |
| `0009`    | `0009-admissao-admin-access.md`                                                        | Accepted                         |
| `0010`    | `0010-layout-editorial-home-artigo.md`                                                 | Accepted                         |
| `0011`    | `2026-10-10-2155-0011-governanca-engenharia/index.md`                                  | Accepted                         |
| `0013`    | `2026-10-11-1552-0013-unificacao-home-cambridge.md`                                    | Superseded pela 0010 (Revisão 2) |
| `0015`    | `2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md`                             | Accepted                         |
| `0016`    | `2026-10-12-1317-0016-revisao-editorial-dez-rascunhos.md`                              | Accepted                         |
| `0017`    | `2026-10-13-1710-0017-modulo-ofertas-historico-precos.md` (+ adendos das Fatias 2 a 4) | Accepted                         |
| `0018`    | `2026-10-14-2150-0018-ambiente-local-login-mfa.md`                                     | Accepted                         |
| `0019`    | `2026-10-16-1115-0019-recuperacao-administrativa.md`                                   | Accepted                         |
| `0020`    | `2026-10-16-1650-0020-dashboard-operacional-aal2.md`                                   | Accepted                         |
| `0021`    | `2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`                                | Accepted                         |
| `0022`    | `2026-10-16-2350-0022-guia-notebook-estudar-programacao.md`                            | Accepted                         |
| `0023`    | `2026-10-17-1037-0023-seo-aprofundado-auditoria.md`                                    | Accepted                         |
| `0852`    | `rate-limiting-admin.md`                                                               | Superseded by 0009               |

## Próxima etapa

A **Fase 4 do escopo de backend** (`docs/scope/2026-10-14-2135-backend-auth-operacoes.md`)
fechou o ciclo da Spec 0021: a rota de ingestão de coletores e a rejeição 409
foram implementadas (linha 596) e a verificação formal foi aprovada em
2026-10-16 (9/9 ACs, `docs/reviews/2026-10-16-2350-0021-pipeline-ofertas-worm-duravel.md`,
linha 597), com o `/sync` em curso pela sessão concorrente. Resta da frente de
backend o provisionamento humano de Bucket Locks no R2 para a homologação
remota de WORM em infraestrutura real.

Aqui, o provisionamento humano continua parcialmente pendente:

1. **Conteúdo publicado em 2026-10-13:** são 6 artigos no dataset, com leitura
   autenticada validada em 2026-10-16. AC-02 da 0006 materialmente satisfeita.
2. **Publicar o Durable Object na Cloudflare** (desbloqueia AC-05 da 0006).
3. **Configurar Cloudflare Access** (issuer, AUD, hosts, conta de teste), o
   que desbloqueia as ACs de 0007 e 0009.

Depois do provisionamento, `/check verify` reexecuta as specs 0006, 0007, 0009
e 0010 nos ambientes corretos.

Decisões pendentes do dono, registradas neste replan:

- **Contrato da 0010 (resolvida em 2026-10-16, linha 595):** a spec foi
  normalizada in place como Revisão 2, incorporando a 0013 (agora
  `Superseded`); resta a verificação formal do contrato no ciclo `/check`
  (pendência F-01 do relatório de 2026-10-16).
- **Apontamentos remanescentes da inspeção taste** (2026-10-16): o polimento
  aplicado em 2026-10-16 derrubou os apontamentos de 11 para 6 FAIL; os que
  sobraram precisam de veredito (corrigir ou dispensar) antes de virarem
  ajuste, como descrito na linha U do Slice 5.

Trabalho de skill que pode avançar agora, sem provisionamento: as linhas N
(`/develop primeira jornada guia do notebook`, spec 0022 aceita) e O
(`/develop SEO aprofundado e auditoria`, spec 0023 aceita em 2026-10-17) e as
linhas T e U do Slice 5 (`/develop manutenção das suítes e2e` e `/develop polimento
visual da home`).
