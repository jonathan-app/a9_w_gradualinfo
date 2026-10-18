# seo/AC-06: cobertura automatizada no check:all e coerência de canonical/robots

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`)
- Ambiente: build de produção local, servidor `next start --port 3000`, Sanity desligado por env vazia.

## 1. Gate completo verde

`pnpm check:all` (typecheck, lint, formatação, testes) terminou com exit 0:

```text
Test Files  80 passed (80)
Tests  819 passed (819)
```

## 2. Teste automatizado do contrato (`__tests__/unit/seo-metadata.test.ts`, 7/7)

```text
✓ layout publica a grafia canônica no título, na descrição e no Open Graph
✓ home tem canonical no apex
✓ artigo publicado tem canonical absoluto e não é noindex
✓ rascunho e 404 de artigo saem do índice
✓ /busca mantém noindex com follow, sem canonical e sem sufixo duplicado
✓ painel administrativo e preview ficam fora do índice, sem sufixo duplicado
✓ robots.txt bloqueia API e painel e aponta para o índice do sitemap
```

## 3. Runtime (curl no servidor de produção)

| Rota | Status | robots | canonical |
| --- | --- | --- | --- |
| `/` | 200 | `index, follow` | `http://localhost:3000` |
| `/artigos/fixture-publicado` | 200 | ausente (indexável por padrão) | `http://localhost:3000/artigos/fixture-publicado` |
| `/artigos/nao-existe-abc` | 404 | `noindex` | ausente |
| `/artigos/fixture-rascunho` | 404 | `noindex` | ausente |
| `/artigos/fixture-agendado` | 404 | `noindex` | ausente |
| `/artigos/fixture-arquivado` | 404 | `noindex` | ausente |
| `/busca` | 200 | `noindex, follow` | ausente |

`robots.txt` bruto (200):

```text
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /admin-dashboard/

Sitemap: http://localhost:3000/sitemap.xml
```

Além do robots.txt, o `proxy.ts` marca painel e `/api/admin` com `Cache-Control: private, no-store` e `X-Robots-Tag: noindex, nofollow` (`lib/supabase/middleware.ts`).

## 4. Sitemap cobrindo exatamente os publicados

Índice e filhos conferidos contra o banco (15 publicados, 18 posts): cobertura exata, sem duplicata, sem não público; detalhe bruto em `ac-04-sitemap-indice-filhos.md` e no e2e "sitemap em índice cobre os publicados e ignora os não públicos".

## Conclusão

- Um teste automatizado no `pnpm check:all` prova a cobertura pedida: os 7 casos acima mais o e2e `e2e/seo-audit.spec.ts`.
- Coerência runtime: canonical presente só nas páginas indexáveis (home, artigo), ausente em `/busca` e no 404; 404 sai com noindex; preview e painel cobertos em unidade (o painel também recebe `X-Robots-Tag` do proxy).
- O canonical do 404 não existe no runtime (o follow-up da spec cogitava apontar para o slug errado; hoje ele simplesmente não é emitido).
