# 0023. SEO aprofundado e auditoria de indexação

**Date**: 2026-10-17 10:37, America/Sao_Paulo.
**Status**: Accepted
**Decision source**: Aceite formal do proprietário concedido em 2026-10-17, após apresentação do texto final em painel de confirmação. Decisões de design confirmadas em conversa /architect de 2026-10-17 (duas rodadas de requisitos, incluindo a divergência do índice do sitemap registrada na seção Decision).

## Summary

O portal passa a ter SEO auditável de ponta a ponta: orçamento de Core Web Vitals com limites por métrica no Lighthouse, dados estruturados completos e validados (Article corrigido, WebSite, Organization e BreadcrumbList), sitemap em índice com um filho por editoria, e uma auditoria de indexação com teste automatizado e relatório datado. A entrega corrige os defeitos de metadado encontrados no reconhecimento e preserva as invariantes vigentes: rascunho nunca aparece em sitemap ou JSON-LD, busca continua fora do índice e Sanity indisponível degrada sem erro.

## Context

O escopo do MVP define a Feature O como o aprofundamento de SEO: Core Web Vitals dentro do orçamento do Lighthouse, dados estruturados validados, sitemap por editoria e auditoria de indexação. A precondição está satisfeita em 2026-10-16: há 6 artigos publicados para auditar.

As forças que moldam esta entrega: os metadados básicos já existem (spec 0010, Revisão 2, entregou canonical, Open Graph e JSON-LD de Article; a spec 0006 registrou o follow-up do sitemap no matcher do proxy e o aviso do canonical da home, ambos resolvidos depois), mas o reconhecimento de 2026-10-17 encontrou lacunas: o job de Lighthouse audita duas URLs com limite único de 0,8, o Article não traz publisher, url nem mainEntityOfPage, não há WebSite, Organization nem BreadcrumbList, o sitemap é arquivo único acoplado ao Supabase legado, e `/busca` e o painel duplicam o sufixo da marca no título.

Sem esta entrega, a promessa pública de ser encontrável não tem prova reproduzível: o que não é medido no CI regride sem aviso. Nada aqui autoriza mudar layout, rotas, modelo editorial ou o plano de publicação; tudo isso permanece regido pelos contratos vigentes.

## Requirements

**User stories**:

- Como proprietário do portal, quero conteúdo encontrável e rápido nos buscadores, para ganhar tráfego orgânico sem depender de mídia paga.
- Como editor, quero que cada artigo publicado seja lido com contexto correto (título, capa, autor, data e editoria), para o clique vir de quem procura pelo assunto.
- Como operador do site, quero uma auditoria reproduzível no CI e um relatório datado, para saber que a indexação está correta sem inspecionar página por página a cada mudança.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **seo/AC-01**: O job de Lighthouse da CI audita a home, `/artigos/fixture-publicado` e `/busca` e falha quando performance fica abaixo de 0,90, LCP acima de 2,5 s, CLS acima de 0,1 ou TBT acima de 200 ms, mantendo accessibility, best-practices e seo em 0,90 ou mais.
- **seo/AC-02**: A home emite JSON-LD de WebSite (url, name, inLanguage, publisher e SearchAction apontando para `/busca?q={search_term_string}`) e de Organization (name, url, logo absoluto e description), todos alimentados por `lib/site-config.ts` estendida, com "Gradualinfo" como grafia canônica.
- **seo/AC-03**: Cada artigo publicado emite JSON-LD de Article com headline, description, url canônico, datePublished, dateModified, author, image 1200x630, publisher e mainEntityOfPage, mais BreadcrumbList de dois itens (início e o artigo); rascunho e artigo não público não emitem nada, e todo bloco passa pela serialização segura existente.
- **seo/AC-04**: `/sitemap.xml` é um índice no formato sitemapindex listando `/sitemap/geral.xml` e um filho `/sitemap/<editoria>.xml` por editoria com pelo menos um artigo publicado; cada filho de editoria lista os artigos publicados dela com lastmod igual a published_at, e `geral.xml` carrega a home; editoria sem artigo publicado não gera filho, nenhum rascunho aparece no índice nem nos filhos e todos os valores XML são escapados.
- **seo/AC-05**: Com o Sanity indisponível, `/sitemap.xml` responde 200 listando apenas `/sitemap/geral.xml`, que contém a home, nunca 500; a busca mantém o aviso de indisponibilidade existente.
- **seo/AC-06**: Um teste automatizado no `pnpm check:all` prova a cobertura da auditoria: canonical e robots coerentes em cada página indexável (home, artigo e 404), `/busca` com noindex e follow e sem canonical, preview, painel e rotas de API fora do índice, e o sitemap cobrindo exatamente os artigos publicados.
- **seo/AC-07**: O relatório datado da auditoria em `docs/reviews/` registra cada verificação com as capturas do Lighthouse (as três URLs) e dos dados estruturados validados, incluindo explicitamente o que não foi observado.
- **seo/AC-08**: `/busca` e o painel deixam de duplicar o sufixo da marca (o template do layout monta o título uma vez) e os metadados usam "Gradualinfo" como grafia canônica.
- **seo/AC-09**: Invariantes preservadas: rascunho nunca aparece em sitemap ou JSON-LD; URLs absolutas saem sempre de `SITE_ORIGIN`; nenhuma variável de ambiente nova e nenhuma dependência nova entram na árvore.

## Options considered

### Opção 1: Aprofundar os quatro eixos com gates no CI

Endurecer o orçamento do Lighthouse, completar os dados estruturados, reconstruir o sitemap em índice por editoria e registrar a auditoria com teste automatizado.

**Pros**:

- Cada eixo do escopo vira um gate reproduzível; a regressão passa a falhar no CI em vez de aparecer meses depois no buscador.

**Cons**:

- O job de Lighthouse fica mais caro (três URLs) e o XML escrito à mão exige teste próprio de estrutura e escaping.

### Opção 2: Auditar sem endurecer o gate

Medir tudo e registrar no relatório, sem travar o CI.

**Pros**:

- Entrega mais rápida e sem risco de flake bloqueando merges.

**Cons**:

- Nada fica garantido: a próxima mudança pode derrubar o SEO sem nenhum sinal, que é exatamente o problema que o escopo pede para resolver.

### Opção 3: Reconstruir com ferramenta externa e páginas de editoria

Adotar biblioteca dedicada de sitemap ou SEO e criar páginas navegáveis de editoria.

**Pros**:

- Menos XML à mão e uma taxonomia nova que melhora a navegação.

**Cons**:

- Dependência e contrato de produto fora da linha O; o Next cobre o que a entrega precisa sem ferramenta nova.

## Decision

**Chosen option**: Opção 1. Aprofundar os quatro eixos do escopo com gates no CI, sem dependência nova.

**Decisões recomendadas pelo autor** (itens que couberam a mim, com alternativa registrada):

- Índice e filhos do sitemap como route handlers (`app/sitemap.xml/route.ts` e `app/sitemap/[editoria]/route.ts`): o `generateSitemaps` do Next 16 gera apenas os filhos, em `/sitemap/<id>.xml`, e não produz índice em `/sitemap.xml` (verificado no loader e no `resolve-route-data` do pacote); alternativa: usar `generateSitemaps` nativo, descartada porque deixaria `/sitemap.xml` sem resposta.
- Filho `/sitemap/geral.xml` carregando a home; alternativa: colocar a home no primeiro filho de editoria, que misturaria rota estática com conteúdo de editoria.
- BreadcrumbList de dois itens (Início e artigo); alternativa: três itens com uma página de editoria que ainda não existe, que produziria item intermediário sem URL.
- SearchAction no WebSite apontando para `/busca?q={search_term_string}`; alternativa: omitir até existir busca indexável.
- lastmod da home igual ao maior published_at dos artigos publicados (ausente se não houver nenhum); alternativa: manter `new Date()` por requisição, que rebaixa a confiança do buscador sem o conteúdo ter mudado.
- Identificador de editoria no sitemap derivado por slug determinístico (minúsculas, sem acento, hífens), com guarda de colisão e fallback; alternativa: usar o id do documento de editoria, que não existe no modelo atual.
- Pin do `@lhci/cli` 0.15.1 mantido e comentário obsoleto do `scripts/pagespeed-monitor.js` corrigido nesta entrega; alternativa: atualizar a versão agora, adiada para depois de o dependency-scan confirmar a vulnerabilidade.
- Grafia canônica "Gradualinfo"; alternativa: "GradualInfo", usada hoje só no painel.

## Rationale

A força decisiva é o escopo: a linha O pede orçamento, validação, sitemap por editoria e auditoria registrada, e a Opção 1 entrega os quatro como contrato verificável no CI. Auditar sem gate (Opção 2) não resolve o problema da regressão silenciosa, e a reconstrução com ferramenta externa (Opção 3) paga dependência por algo que o Next cobre. O mecanismo do sitemap divergiu do `generateSitemaps` sugerido na conversa de design porque o Next 16 não gera o índice, e a forma escolhida (índice com um filho por editoria) é preservada com route handlers, sem dependência nova. O menor diff funcional guia o resto: site-config ganha só os campos que o JSON-LD precisa, o breadcrumb fica em dois itens porque não há página de editoria, e `/busca` permanece noindex follow porque busca interna não é conteúdo.

## Feature design

**Data model sketch**:

- Nenhuma entidade nova, nenhuma migração: os dados lidos são os artigos publicados (título, slug, editoria, published_at, updated_at, capa e autor), pela leitura editorial vigente, e a configuração do site (nome, descrição, logo e idioma) em `lib/site-config.ts`.
- Derivados: índice e filhos do sitemap, blocos JSON-LD e os valores do orçamento. A lista de editorias é derivada em memória do conjunto de artigos publicados, sem consulta nova por editoria.
- Identificador de editoria: slug determinístico (minúsculas, sem acento, espaços e símbolos viram hífen) com guarda de colisão por sufixo e fallback estável.

**State transitions**:

- Nenhuma transição nova. Sitemap e JSON-LD derivam do estado publicado ou rascunho que o motor editorial já governa; publicar atualiza os derivados, despublicar os remove.

**API surface**:

- `/sitemap.xml` passa a ser o índice (sitemapindex) e deixa de ser arquivo único; `/sitemap/geral.xml` e `/sitemap/<editoria>.xml` são filhos novos; `/sitemap.xml` continua com Cache-Control no-store.
- Sem endpoint de API novo. As rotas de página existentes só mudam metadados e títulos.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Ação                          | Valor produzido ou exibido                                   | Fonte                                                                                 |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Auditar Core Web Vitals       | URLs e limites por métrica                                   | `lighthouserc.cjs` e decisão desta spec (LCP, CLS e TBT)                              |
| Emitir WebSite e Organization | name, description, logo, idioma e url                        | `lib/site-config.ts` estendida e `/icon.png`                                          |
| Emitir SearchAction           | target `/busca?q={search_term_string}`                       | rota `/busca` existente (parâmetro `q` do cabeçalho)                                  |
| Emitir Article                | headline, description, url, datas, autor, imagem e publisher | post publicado pela leitura vigente, `SITE_ORIGIN`, resolvedor de capa e Organization |
| Emitir BreadcrumbList         | Início e artigo                                              | `SITE_ORIGIN` e canonical do artigo                                                   |
| Montar o índice               | lista de filhos (geral e editorias)                          | artigos publicados agrupados em memória pela leitura vigente                          |
| Montar filho de editoria      | URLs e lastmod                                               | artigos publicados da editoria; lastmod igual a published_at                          |
| lastmod da home               | maior published_at (ou ausente)                              | artigos publicados                                                                    |
| Título das páginas            | título local mais sufixo do template                         | template do layout com `SITE_NAME`                                                    |

**Key invariants**:

- Rascunho e artigo não público nunca aparecem em sitemap nem em JSON-LD.
- Toda URL absoluta sai de `SITE_ORIGIN`; valores XML são escapados antes de entrar no documento.
- `/busca` mantém noindex e follow, sem canonical próprio.
- Editoria sem artigo publicado não gera filho; Sanity indisponível degrada para `/sitemap/geral.xml`, nunca 500.
- Nenhum bloco JSON-LD novo foge de `serializeJsonLd`.

**Security model**:

Superfície pública, sem autorização nova. A regra de visibilidade continua no serviço de leitura, e o sitemap apenas consome o que ele publica. A serialização segura existente segue sendo o único caminho de `innerHTML` para scripts JSON-LD. Nenhum segredo novo entra no código ou na árvore, e o dependency-scan permanece sem mudança.

**Configuration required**: nenhuma variável de ambiente nova. `lib/site-config.ts` ganha constantes de código (nome, descrição, logo e idioma), sem env.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: índice e filhos respondem com os publicados, home e artigo emitem os quatro tipos de JSON-LD, e o Lighthouse mede as três URLs dentro dos limites, verifies **seo/AC-01** a **seo/AC-04**.
- Failure case: Sanity indisponível produz 200 com apenas `/sitemap/geral.xml` e a busca mantém o aviso, verifies **seo/AC-05**.
- Edge case: editoria sem publicado não gera filho, rascunho não aparece em sitemap nem em JSON-LD, e colisão de slug de editoria resolve deterministicamente, verifies **seo/AC-04**, **seo/AC-09**.
- Traceability: relatório datado com capturas e lista do que não foi observado, verifies **seo/AC-06**, **seo/AC-07**, **seo/AC-08**.

## Build plan

Abordagem Tracer Bullet: cada milha atravessa o eixo inteiro, do código ao gate.

1. Estender `lib/site-config.ts` (nome "Gradualinfo", descrição, logo `/icon.png` e idioma `pt-BR`) e corrigir os títulos de `/busca` e do painel para o sufixo aparecer uma vez, satisfies **seo/AC-08**
2. Criar os construtores de dados estruturados (Organization, WebSite com SearchAction, Article completo e BreadcrumbList) com a serialização segura existente e integrar na home e no artigo, satisfies **seo/AC-02**, **seo/AC-03**, **seo/AC-09**
3. Reconstruir o sitemap como índice em `app/sitemap.xml/route.ts` com o filho `/sitemap/geral.xml` e um filho por editoria em `app/sitemap/[editoria]/route.ts`, lendo a leitura editorial vigente e degradando para o filho geral, satisfies **seo/AC-04**, **seo/AC-05**
4. Endurecer `lighthouserc.cjs` com a terceira URL, performance 0,90 e limites por métrica, satisfies **seo/AC-01**
5. Escrever os testes automatizados (unidade para construtores, agrupamento de editorias e escaping; e2e para a cobertura da auditoria) e produzir o relatório datado, satisfies **seo/AC-06**, **seo/AC-07**

## Consequences

**Positive**:

- Os quatro eixos do escopo viram gate reproduzível; o sitemap passa a refletir a fonte editorial vigente em vez do acoplamento legado; defeitos de metadado do reconhecimento são corrigidos.

**Negative / tradeoffs**:

- XML escrito à mão exige teste próprio de estrutura e escaping, em vez de tipos do Next; o job de Lighthouse fica mais caro com a terceira URL; INP não é medível em laboratório e o TBT fica como proxy declarado.

**Neutral**:

- O sitemap muda de arquivo único para índice com filhos; links existentes para `/sitemap.xml` continuam válidos.

## Follow-up

- [ ] Canonical do artigo inexistente (404) hoje aponta para o slug errado; decidir e corrigir fora desta spec.
- [ ] Âncora #editorias morta em `/busca` (link "ver todas as editorias").
- [ ] Disallow de `/preview` no robots.txt, como cinto além do noindex das páginas.
- [ ] Cache-Control de borda para `/artigos` e `/busca`, que é decisão de produção.
- [ ] Otimização das imagens do corpo Markdown, aceita como tradeoff nesta entrega.
- [ ] Páginas de editoria (taxonomia navegável), que habilitariam breadcrumb de três itens e navegação por assunto.
- [ ] Sitemap acima de 1000 posts: o limite de leitura atual é 1000 e não há paginação.
- [ ] Bump do `@lhci/cli` condicionado à confirmação do dependency-scan; o pin 0.15.1 fica e o comentário obsoleto do `scripts/pagespeed-monitor.js` é corrigido nesta entrega.
- [ ] INP fora do gate de laboratório, com TBT como proxy declarado no relatório.
