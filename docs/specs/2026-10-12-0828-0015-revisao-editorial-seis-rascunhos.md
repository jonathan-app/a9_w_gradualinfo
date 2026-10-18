# 0015. Revisão editorial dos seis rascunhos

**Date**: 2026-10-12  
**Status**: Accepted  
**Decision source**: o proprietário confirmou o alinhamento em 2026-10-12, aceitou o texto integral da spec 0015 e autorizou a execução da revisão editorial dos seis rascunhos com os ajustes solicitados.

## Summary

Você revisa os seis rascunhos em `docs/rascunhos-editoriais/` para garantir afirmações checadas com fontes primárias, alinhamento ao público de estudantes e desenvolvedores do GradualInfo, metadados consistentes e critérios explícitos de aprovação editorial. O artigo de referência fornece o padrão de estrutura e leitura, mas também passa por checagem factual. Componentes protegidos não são alterados. Publicação no Sanity e deploy permanecem como etapas futuras separadas.

## Context

O portal possui seis rascunhos em formato Markdown em `docs/rascunhos-editoriais/` que alimentam o catálogo local de desenvolvimento (`pnpm dev:editorial`). Cada artigo trata de um tema técnico (SEO, erros HTTP 500/503, metadados no Next.js 16, métricas Web Vitals, checagem de IA e estudo de caso de arquitetura).
Embora o layout e a casca editorial estejam aprovados (Spec 0013), o conteúdo ainda não passou por uma auditoria factual sistemática contra documentação oficial e RFCs. Além disso, `components/shared/editorial-cover.tsx` renderiza capas como imagens puramente decorativas (`alt=""`), o que representa uma lacuna para imagens informativas que precisem de texto alternativo.

## Requirements

- **editorial-review/AC-01**: (Padrão de estrutura e leitura) Todos os seis rascunhos adotam a estrutura editorial do artigo de referência (`diagnosticar-erro-500-503-site.md`): título direto, resumo explicativo de duas frases, chapéu com editoria válida, metadados no frontmatter, seções `h2`/`h3` lógicas, diagramas textuais ou tabelas comparativas quando aplicável, e seção explícita de `fontes_citadas` no frontmatter. O próprio artigo de referência é auditado factualmente sem privilégios.
- **editorial-review/AC-02**: (Matriz de checagem factual) Cada rascunho possui uma matriz obrigatória contendo: afirmação técnica principal, fonte primária oficial (RFC, documentação oficial do framework ou órgão regulador), data da consulta documental, resultado da checagem (`Confirmado`, `Desatualizado`, `Incorreto` ou `Não verificado`) e correção textual necessária.
- **editorial-review/AC-03**: (Tratamento de afirmações não verificadas) Nenhuma afirmação sem comprovação pode ser apresentada como fato confirmado. Afirmações não verificadas ou imprecisas devem ser removidas, reformuladas ou identificadas expressamente como hipótese ou opinião técnica quando pertinente. Qualquer dado, métrica ou decisão atribuída à arquitetura do próprio GradualInfo deve possuir evidência direta e comprovada no repositório do projeto.
- **editorial-review/AC-04**: (Alinhamento ao público do GradualInfo) O tom textual deve ser sóbrio, instrutivo e direcionado a estudantes de programação e desenvolvedores em evolução. Termos técnicos são contextualizados sem jargões vazios e sem achismos. Cada artigo entrega ao menos um procedimento prático reprodutível.
- **editorial-review/AC-05**: (Metadados e integridade de arquivos) Cada frontmatter possui `title`, `slug` único e estável, `editoria` correspondente a uma das 5 editorias do portal, `excerpt` conciso (140 a 160 caracteres), `cover_image` apontando para arquivo existente em `public/`, `author` padronizado e lista de `fontes_citadas` com título e URL válida.
- **editorial-review/AC-06**: (Avaliação de acessibilidade e função das imagens) O atributo `alt=""` é reconhecido como padrão adequado e correto para imagens de capa que cumprem função meramente decorativa ou redundante em relação ao título e resumo adjacentes. Uma limitação de acessibilidade só deve ser registrada caso a imagem da capa transmita informação técnica ou de dados que o texto adjacente não apresente. Havendo tal necessidade, o conteúdo informativo deve ser reproduzido textualmente no corpo do artigo em Markdown, mantendo `components/shared/editorial-cover.tsx` e os 8 arquivos protegidos inalterados.
- **editorial-review/AC-07**: (Recomendação de ordem de publicação) A spec define uma ordem sugerida de publicação baseada na maturidade técnica e interdependência pedagógica dos artigos, sem que isso force ou dispare publicação real.
- **editorial-review/AC-08**: (Separação estrita de estados) A aprovação do conteúdo editorial é mantida localmente em arquivos Markdown e relatórios de revisão em `docs/reviews/`. Nenhum rascunho é publicado no Sanity Studio e nenhum deploy de produção é disparado nesta etapa.

## Decision

**Chosen option**: Revisão editorial direta nos arquivos Markdown em `docs/rascunhos-editoriais/`, acompanhada de relatório de auditoria factual com matriz completa em `docs/reviews/`. As capas preservam o contrato de `EditorialCover` existente sem quebrar os arquivos protegidos.

**Implementation skills**: `/develop` para aplicar as correções textuais nos rascunhos Markdown e registrar as matrizes factuais; `/check` para verificar os ACs da spec e consistência de frontmatter; `/sync` para atualizar o escopo e o STATE.

## Rationale

Conferir cada artigo contra fontes primárias evita propagar alucinações técnicas ou premissas defasadas (especialmente em Next.js 16 e Web Vitals). Adotar o formato Markdown em `docs/rascunhos-editoriais/` permite versionamento local, testes na Home em `pnpm dev:editorial` e aprovação prévia antes de qualquer envio de dados para o Sanity. Respeitar a imutabilidade dos 8 arquivos protegidos preserva os portões de teste e layout aprovados na Spec 0013.

## Matriz de Matérias e Fatos a Checar

| Slug                                      | Editoria                    | Pauta Central                                                                                               | Fontes Primárias Chave                                               |
| :---------------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `diagnosticar-erro-500-503-site`          | Engenharia & Confiabilidade | Diferenciação RFC 9110 entre 500 e 503, contenção de borda no Cloudflare Workers e limites de timeout.      | RFC 9110, Cloudflare Workers Docs, Next.js Error Handling.           |
| `auditoria-seo-tecnico-checklist`         | Performance & SEO           | 21 passos de auditoria técnica: indexação, canonicals, diretivas robots e dados estruturados Schema.org.    | Google Search Central, W3C HTML5, Schema.org NewsArticle.            |
| `seo-nextjs-16-metadata-indexacao`        | Desenvolvimento Web         | API de Metadados do Next.js 16 App Router, Open Graph dinâmico, sitemaps e armadilhas com streaming.        | Next.js 16 Metadata API, Open Graph Protocol, Google Search Central. |
| `site-lento-mesmo-com-boa-nota-pagespeed` | Performance & SEO           | Divergência entre dados de laboratório (Lighthouse) e dados de campo (CrUX), métricas LCP, INP e CLS.       | web.dev Lab vs Field, Chrome CrUX Methodology, W3C Web Perf WG.      |
| `como-verificar-respostas-da-ia`          | Inteligência Artificial     | Metodologia em 7 passos para checagem de alucinações, verificação de código e modelos mentais de validação. | NIST AI RMF 1.0, OpenAI Guides, Anthropic Research, Google DeepMind. |
| `construindo-gradualinfo-estudo-de-caso`  | Engenharia de Software      | Arquitetura real do GradualInfo: Next.js 16, OpenNext, Cloudflare Workers, Supabase RLS e Sanity.           | OpenNext Docs, Supabase RLS Guide, Sanity Content Lake Specs.        |

## Ordem Sugerida de Publicação (Recomendação Editorial)

1. **`construindo-gradualinfo-estudo-de-caso`**: Estabelece o contexto institucional, os princípios do projeto e a credibilidade técnica do portal.
2. **`diagnosticar-erro-500-503-site`**: Artigo âncora sobre confiabilidade de sistemas, com método prático de contenção.
3. **`site-lento-mesmo-com-boa-nota-pagespeed`**: Desmistifica pontuações de laboratório e introduz a mentalidade de métricas reais para programadores.
4. **`seo-nextjs-16-metadata-indexacao`**: Guia técnico cirúrgico e de alta demanda para quem desenvolve com Next.js 16.
5. **`como-verificar-respostas-da-ia`**: Ensina estudantes a usar assistentes de IA com rigor crítico sem cair em alucinações.
6. **`auditoria-seo-tecnico-checklist`**: Artigo abrangente em formato de checklist de referência para consulta contínua.

_Nota: Esta ordem é puramente indicativa e não vincula nem aciona a publicação._

## Avaliação de Acessibilidade das Imagens de Capa

- **Função das Capas**: No portal GradualInfo, as capas de matérias funcionam primariamente de modo decorativo e editorial, complementando visualmente a manchete e o resumo que já descrevem o conteúdo integralmente aos leitores de tela. Nesses casos, o uso de `alt=""` implementado em `components/shared/editorial-cover.tsx` é a melhor prática recomendada pelas diretrizes W3C/WCAG, prevenindo redundância em leitores de tela.
- **Tratamento de Exceções (Imagens Informativas)**: Se durante a auditoria for verificado que alguma imagem de capa contém dados ou esquemas explicativos essenciais não contemplados pelo texto da página, essa limitação deve ser documentada como observação editorial e todo o dado relevante deve ser detalhado textualmente no corpo da matéria em Markdown.
- **Preservação de Componentes**: Nenhuma alteração é permitida em `components/shared/editorial-cover.tsx` ou nos 8 arquivos protegidos do leitor.

## Build plan

1. **/develop**:
   - Abrir cada um dos 6 rascunhos em `docs/rascunhos-editoriais/`.
   - Realizar a checagem factual de cada afirmação contra documentação oficial.
   - Ajustar textos, remover afirmações não verificáveis ou qualificá-las como hipótese/opinião, e aprofundar exemplos para estudantes.
   - Padronizar frontmatter (título, resumo, slug, editoria, fontes citadas, capa).
   - Gerar a matriz consolidada de checagem factual.
   - Sincronizar o catálogo local com o script `scripts/sync-editorial.mjs` para atualizar `lib/editorial/local-posts.json`.
   - Inspecionar visualmente e funcionalmente os seis artigos renderizados no leitor local (`pnpm dev:editorial`), assegurando a integridade de tabelas, blocos de código, hierarquia de subtítulos e capas.
2. **/check verify**:
   - Verificar conformidade com os ACs (AC-01 a AC-08).
   - Conferir que nenhum arquivo protegido foi tocado.
   - Rodar typecheck, lint, formatação e testes unitários.
3. **/sync**:
   - Atualizar escopo e STATE com os resultados da revisão.

## Consequences

**Positive**: Conteúdo tecnicamente rigoroso, livre de achismos e erros factuais; alto valor educativo para o leitor; alinhamento total à proposta do GradualInfo; risco reduzido pela preservação dos componentes, com conferência após atualizar o conteúdo.

**Negative**: Exige esforço minucioso de leitura, consulta e revisão de fontes primárias para cada afirmação técnica.

**Neutral**: Nenhuma dependência de rede de produção, banco de dados ou credencial remota.

## Follow-up

1. Executar a revisão factual dos seis rascunhos via `/develop`.
2. Validar evidências, integridade de layout e testes via `/check verify`.
