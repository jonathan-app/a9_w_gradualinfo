# /test 0023. SEO aprofundado e auditoria de indexação

**Date**: 2026-10-17 14:52, America/Sao_Paulo.
**Feature**: O do MVP (`docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md`), spec `docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md` (Accepted).
**Skill**: `/test` (rodada de escrita de testes sobre os arquivos não commitados da feature).

## Execução

| Campo                | Valor                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| Comando              | `pnpm test:run` (vitest run)                                                          |
| Exit code            | 0                                                                                     |
| Resultado            | 83 arquivos, 846 testes, 846 PASS, 0 FAIL, 0 skip                                     |
| Novos nesta rodada   | 2 arquivos, 15 testes (9 em `app-busca`, 6 em `app-article-page`)                     |
| Identidade de versão | HEAD `b14dd51`, `package.json` 2.0.0, Node 22, árvore com 290 entradas não commitadas |
| Segurança (Step 0)   | portão satisfeito: `pnpm security:secrets` e `pnpm security:sast` exit 0 (0 findings) |

## Cobertura por critério de aceite

| AC        | Onde está a prova                                                                                                                                                                                                                                 | Estado  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| seo/AC-02 | `structured-data.test.tsx` (WebSite com SearchAction e Organization alimentados pela config), e2e `seo-audit.spec.ts` (emissão real na home)                                                                                                      | coberto |
| seo/AC-03 | **novo** `app-article-page.test.tsx`: artigo publicado emite Article e BreadcrumbList com canonical único; rascunho e publicação futura não emitem nada; `structured-data.test.tsx` (conteúdo completo e serialização segura); e2e (emissão real) | coberto |
| seo/AC-04 | `sitemap.test.ts`: índice, filhos por editoria, cobertura exata, colisão determinística, escaping e lastmod                                                                                                                                       | coberto |
| seo/AC-05 | `sitemap.test.ts` (índice 200 só com `geral.xml`; filho 503 com `retry-after`) e **novo** `app-busca.test.tsx` (aviso de indisponibilidade mantido)                                                                                               | coberto |
| seo/AC-06 | `seo-metadata.test.ts` (canonical e robots da home, artigo e 404; `/busca` noindex e follow sem canonical; preview e painel fora; API no robots) e `sitemap.test.ts` (sitemap cobre exatamente os publicados)                                     | coberto |
| seo/AC-08 | `seo-metadata.test.ts` (títulos sem sufixo duplicado; grafia canônica) e **novo** `app-busca.test.tsx`                                                                                                                                            | coberto |
| seo/AC-09 | **novo** `app-article-page.test.tsx` (rascunho nunca emite JSON-LD), `sitemap.test.ts` (rascunho fora do índice e dos filhos), `structured-data.test.tsx` (único caminho de serialização)                                                         | coberto |
| seo/AC-01 | Orçamento numérico medido pelo `lighthouserc.cjs`; não automatizável em Vitest                                                                                                                                                                    | defer   |
| seo/AC-07 | Relatório datado da auditoria; artefato documental, não testável por suíte                                                                                                                                                                        | defer   |

`defer` significa "defer to /check verify manual step": o gate numérico do AC-01 tem evidência de 9 runs sem falha de assertion no verify de 2026-10-17 11:34, e o relatório do AC-07 existe em `docs/reviews/`.

## O que foi escrito

### `__tests__/unit/app-busca.test.tsx` (novo, 9 testes)

Renderiza `app/busca/page.tsx` com as dependências de dados e sessão mockadas e prova: convite sem termo (sem consulta ao catálogo), resultado com contagem no singular e plural, nenhum resultado com ponteiro para as editorias, correspondência sem acento e sem caixa, corte do termo em 120 caracteres, aviso de indisponibilidade sob `ContentUnavailableError` (seo/AC-05), relançamento de erro inesperado e o formulário acessível (role `search`, campo rotulado e limitado).

### `__tests__/unit/app-article-page.test.tsx` (novo, 6 testes)

Renderiza `app/artigos/[slug]/page.tsx` (filhos pesados de markdown e compartilhamento mockados) e prova o gate de dados estruturados: artigo publicado emite exatamente dois blocos (Article e BreadcrumbList) com o mesmo canonical, rascunho e publicação futura não emitem bloco algum, slug inexistente devolve 404 via `notFound`, falha das leituras relacionadas vai para o Sentry sem derrubar o artigo e as outras leituras priorizam a mesma editoria.

## Estados falhos e não cobertos

- **Falhos**: nenhum.
- **Não cobertos por decisão**: seo/AC-01 e seo/AC-07 (ver acima).
- **Arquivos em escopo sem teste novo, com justificativa**:
  - `lib/site-config.ts`: constantes sem lógica; o consumo é provado pelos blocos JSON-LD e pelo metadata.
  - `app/layout.tsx`: a parte da feature é o `metadata` (coberto em `seo-metadata.test.ts`); a renderização pertence à sessão concorrente da home.
  - `scripts/pagespeed-monitor.js`: mudança apenas de comentário.
  - `lighthouserc.cjs`: configuração de gate, provada pela execução do Lighthouse no verify.
- **Arquivos de teste existentes**: `sitemap.test.ts`, `structured-data.test.tsx` e `seo-metadata.test.ts` já cobrem os demais arquivos da feature e não foram alterados, evitando suíte paralela; os dois arquivos novos são os primeiros testes de render das páginas de busca e de artigo em qualquer nível, por isso não havia arquivo existente para estender.

## Notas

- Nenhum arquivo de aplicação foi alterado nesta rodada; só arquivos de teste foram criados.
- Configuração intacta: `test-preferences.json` já existia e não foi tocado.
- Avisos "Could not parse CSS stylesheet" do jsdom aparecem na suíte e não são falha.
