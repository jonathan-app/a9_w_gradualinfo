# /test 0024. Busca textual com recorte por editoria e tolerância a erros de digitação

**Date**: 2026-10-17 16:05, America/Sao_Paulo.
**Feature**: P do MVP (`docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md`), spec `docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md` (Accepted).
**Skill**: `/test` (rodada de testes automatizados e cobertura dos critérios de aceite).

## Execução

| Campo                | Valor                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comando              | `pnpm test:run` (vitest run)                                                                                                                                |
| Exit code            | 0                                                                                                                                                           |
| Resultado            | 83 arquivos, 858 testes, 858 PASS, 0 FAIL, 0 skip                                                                                                           |
| Novos e estendidos   | `__tests__/unit/lib/search-posts.test.ts` (10 testes), `__tests__/unit/app-busca.test.tsx` (13 testes, 4 novos), `e2e/search-flow.spec.ts` (4 testes novos) |
| Identidade de versão | HEAD `b14dd51`, `package.json` 2.0.0, Node 22                                                                                                               |
| Segurança (Step 0)   | Portão satisfeito: `pnpm security:secrets` e `pnpm security:sast` exit 0 (0 findings)                                                                       |

## Cobertura por critério de aceite

| AC          | Onde está a prova                                                                                                                 | Estado  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------- |
| busca/AC-01 | `app-busca.test.tsx` (parâmetros lidos da URL) e `search-flow.spec.ts` (navegação real na rota)                                   | coberto |
| busca/AC-02 | `search-posts.test.ts` (normalização diacrítica e minúsculas nos 4 campos)                                                        | coberto |
| busca/AC-03 | `search-posts.test.ts` (Damerau Levenshtein com limites proporcionais) e `app-busca.test.tsx`                                     | coberto |
| busca/AC-04 | `search-posts.test.ts` (recorte estrito quando válido; fallback para todas quando desconhecido ou `todas`) e `app-busca.test.tsx` | coberto |
| busca/AC-05 | `search-posts.test.ts` (ponderação por relevância: título exato 4, aprox 3, resumo 2 e 1.5, corpo 1 e 0.5, desempate por data)    | coberto |
| busca/AC-06 | `search-posts.test.ts` (cálculo de 20 por página) e `app-busca.test.tsx` (links de paginação preservando parâmetros)              | coberto |
| busca/AC-07 | `app-busca.test.tsx` (pílulas com indicação visual via aria-current e data-active mantendo busca ativa)                           | coberto |
| busca/AC-08 | `app-busca.test.tsx` (estado vazio com atalho para limpar filtro de editoria) e `search-flow.spec.ts`                             | coberto |
| busca/AC-09 | `app-busca.test.tsx` (metadados robots noindex, follow) e `search-flow.spec.ts` (tag robots no DOM)                               | coberto |

## O que foi testado

### `__tests__/unit/lib/search-posts.test.ts` (estendido, 10 testes)

Valida a distância Levenshtein Damerau nativa, limites de edição proporcionais ao tamanho do termo (busca/AC-03), normalização diacrítica em todos os campos (busca/AC-02), filtro estrito por editoria válida com tolerância a caixa e acentos (busca/AC-04), fallback para todas as categorias caso a editoria seja nula, `todas` ou desconhecida (busca/AC-04), ordenação por score ponderado com desempate por data de publicação mais recente (busca/AC-05) e paginação com cálculo de itens e metadados (busca/AC-06).

### `__tests__/unit/app-busca.test.tsx` (estendido, 13 testes, 4 novos)

Valida o render de `app/busca/page.tsx` sob os parâmetros da rota: convite inicial rápido sem chamada ao catálogo, lista com contagem singular e plural, recorte ativo por editoria destacando a pílula correspondente, atalho amigável para limpar o filtro de editoria no estado vazio, controles de página anterior e próxima, tolerância a digitação no termo e resiliência contra indisponibilidade do serviço editorial.

### `e2e/search-flow.spec.ts` (novo, 4 testes Playwright)

Valida o fluxo do leitor em navegador real: exibição do formulário e limite de 120 caracteres no input, presença da diretiva de robôs `noindex, follow` no cabeçalho, execução de busca textual via URL e estado vazio honesto com link para a lista pública de editorias.

## Estados falhos e não cobertos

- **Falhos**: nenhum (0 FAIL).
- **Não cobertos**: nenhum, todos os 9 critérios contam com testes automatizados executados.

## Notas

- A suíte Vitest completa passou com 858 testes verdes em 83 arquivos sem regressões.
- Typecheck via `tsc --noEmit` exit 0, ESLint exit 0 e conformidade de formatação Prettier validada.
