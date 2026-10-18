# Revisão (modo review) : Feature O, SEO aprofundado e auditoria (spec 0023)

**Data**: 2026-10-17 13:05, America/Sao_Paulo.
**Spec**: `docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md` (Accepted; SHA-256 `e6a657fb4ae93e31e4cc4af2d811a82e202a3801bbe7e71ca1dd348ee0f302e2`).
**Modo**: review (auditoria imparcial do diff, dimensões de `modes/review.md`), distinto do modo verify já aprovado em `docs/reviews/2026-10-17-1240-0023-seo-aprofundado-verificacao.md`.
**Artefato de decisão**: `check/0023-seo-aprofundado/2026-10-17-1305-review/results.json` (decisão da máquina gravada no próprio artefato).

## Escopo auditado

Leitura integral do diff e dos arquivos da Feature O: `lib/seo/structured-data.ts`, `lib/seo/sitemap.ts`, `components/shared/json-ld.tsx`, `app/sitemap.xml/route.ts`, `app/sitemap/[editoria]/route.ts`, `lib/site-config.ts`, `app/layout.tsx` (metadados), `app/artigos/[slug]/page.tsx` (JSON-LD e canonical), `app/busca/page.tsx` (título e robots), `app/robots.ts`, títulos do painel, `lighthouserc.cjs`, `next.config.ts` (Cache-Control dos filhos), `scripts/pagespeed-monitor.js` (comentário) e a malha de testes (`__tests__/unit/sitemap.test.ts`, `seo-metadata.test.ts`, `structured-data.test.tsx`, `e2e/seo-audit.spec.ts`). A leitura foi do código e do diff reais, não da memória da conversa.

**Âncora e drift**: a revisão audita o mesmo snapshot do verify (commit efêmero `e4b8631a`, árvore `7ccb6753`). Conferência de drift por índice temporário: nas pastas da feature, a árvore só ganhou `lib/seo/AGENTS.md` e `lib/seo/CLAUDE.md` (documentação do `/sync` posterior ao snapshot); os demais drifts são de outras sessões, fora do escopo. Os 3 WARNING do verify seguem registrados no artefato dele e não são duplicados aqui.

## Resultado

**0 BLOCKER, 1 WARNING, 3 NIT.** Os 9 ACs re-referenciados (status e evidências com SHA-256 do verify) foram revalidados pela autoridade de decisão; nenhuma prova de AC foi alterada.

| Severidade | Contagem |
| ---------- | -------- |
| BLOCKER    | 0        |
| WARNING    | 1        |
| NIT        | 3        |

O schema do gate aceita INFO, WARNING e BLOCKER; os 3 NITs ficam gravados como INFO no artefato (sem efeito no veredito) e descritos como NIT aqui, conforme o vocabulário do modo review.

## Dimensões auditadas

- **Correção (bugs)**: sem defeito bloqueante. A degradação de Sanity cobre os dois caminhos (índice 200 com apenas `geral.xml`; filho de editoria 503 com `retry-after`, filho reservado 200); erros que não são `ContentUnavailableError` são relançados nos dois handlers; `escapeXml` cobre atributo e conteúdo; o predicado de publicidade gate o JSON-LD (duplicação registrada como NIT 1).
- **Segurança**: sem segredo hardcoded; todo JSON-LD passa por `serializeJsonLd` (escape de `<`, `>`, `&`, U+2028 e U+2029, com teste de payload malicioso provando fidelidade ao parser); nenhuma entrada de usuário entra no XML além de `published_at` (escapado) e de valores derivados internamente; sem endpoint novo.
- **Performance**: nenhum componente client novo (`JsonLd` e construtores rodam no servidor); o índice e os filhos usam a leitura vigente com teto de 1000 posts (limite conhecido, follow-up da spec); rotas `force-dynamic` coerentes com conteúdo publicado a qualquer momento; `Cache-Control: no-store` cobre `/sitemap.xml` e `/sitemap/:path*` via `next.config.ts`.
- **Acessibilidade**: a entrega não altera interface; a busca auditada mantém `label` acessível e o estado indisponível com mensagem honesta.
- **Convenções**: sem `console.log`, `any` ou `@ts-ignore` nos arquivos da feature; nomes e JSDoc seguem o padrão do repositório (com os NITs 2 e 3 sobre cabeçalho e JSDoc pontuais).
- **Alinhamento com a spec**: os 9 ACs estão implementados nas decisões registradas (índice por route handlers, filho `geral` com a home, breadcrumb de dois itens, SearchAction literal, slug determinístico com guarda de colisão, pin do `@lhci/cli` mantido e comentário obsoleto corrigido); sem scope creep identificado. O texto do seo/AC-01 versus o escopo `assertMatrix` permanece como ponto de `/architect` já sinalizado no verify (o comportamento implementado é o consistente com seo/AC-06).

**Semântica do `assertMatrix` conferida na fonte**: `@lhci/utils@0.15.1` casa `matchingUrlPattern` contra `lhr.finalUrl`; a home é normalizada para `http://localhost:3000/`, portanto o padrão `^http://localhost:3000/($|artigos/)` realmente aplica o piso `categories:seo` à home e ao artigo, e não à busca. Sem achado.

## Achados

1. **WARNING: código morto em `lib/utils/format.ts` (linhas 139 a 187).** `buildStableEditoriaIdMap` (e o privado `stableHash`) têm testes de unidade, mas nenhum consumidor de produção no estado atual da árvore: o sitemap usa apenas `slugify` e nenhum componente importa o mapa (prefixo `home-editoria-`). Problema: código exportado sem uso confunde a leitura do diff e envelhece sem dono. Atribuição provável: fluxo de âncoras da home de outra sessão em voo. Sugestão: consumir o mapa nas seções da home ou removê-lo com os testes antes do merge da árvore.
2. **NIT: predicado de publicidade duplicado em `app/artigos/[slug]/page.tsx`.** Metadata (linhas 78 a 81) e componente (linhas 141 a 144) repetem a regra com expressões levemente diferentes (`post.published_at` versus `Boolean(post.published_at)` com asserção não nula). Sugestão: extrair um helper único (ex.: junto da regra de visibilidade vigente) para os dois caminhos não divergirem.
3. **NIT: cabeçalho `@dependencies` desatualizado em `app/artigos/[slug]/page.tsx` (linhas 10 a 14).** Lista react-markdown, remark-gfm, next/image, components/ui/badge e serializeJsonLd, que não são mais importados, e omite ArticleBody, ArticleShare, EditorialStory e lib/editorial/reading. Sugestão: atualizar o cabeçalho na mesma passada de documentação.
4. **NIT: JSDoc de exports em `lib/utils/format.ts`.** `slugify` (linha 123) não tem `@param` e `@returns` (convenção 10) e o `@param editorias` de `buildStableEditoriaIdMap` está sem tipo entre chaves. Sugestão: completar as anotações.

## Higiene verificada

- Nenhum `console.log`, `debugger`, `@ts-ignore`, `@ts-expect-error` ou `any` nos arquivos da feature (varredura dedicada).
- Nenhuma referência órfã ao antigo `app/sitemap.ts` removido.
- Sem dependência nova (conforme seo/AC-09 e conferência do `package.json` da entrega no verify); `@lhci/cli` segue pinado em 0.15.1 como decidido.

## Decisão

Saída de `node scripts/check-decision.mjs check/0023-seo-aprofundado/2026-10-17-1305-review/results.json --spec docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md` (código de saída 0):

- `approved`: true
- `verdict`: **APROVADO**
- `counts`: totalACs 9, PASS 9, FAIL 0, UNVERIFIABLE 0, missingEvidence 0, BLOCKER 0, WARNING 1
- `reasons`: []

`reasons` vazio na íntegra: nenhuma correção obrigatória. O WARNING de código morto deve ser resolvido ou endereçado por issue antes do merge da árvore; os NITs ficam a critério do autor.

## Observações

- Os follow-ups da spec (canonical do 404, âncora `#editorias`, disallow de `/preview`, Cache-Control de borda, imagens Markdown, páginas de editoria, sitemap acima de 1000 posts, bump do `@lhci/cli`, INP) permanecem fora desta entrega, como decidido.
- Próximas caixas da linha O: auditoria de segurança (`pnpm security:secrets` e `pnpm security:sast`), `Test it` e `Document it`.
