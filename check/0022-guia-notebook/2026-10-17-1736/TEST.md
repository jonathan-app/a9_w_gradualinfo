# /test 0022. Guia do notebook para estudar programação

**Date**: 2026-10-17 17:36, America/Sao_Paulo.
**Feature**: N do MVP (docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md), spec docs/specs/2026-10-16-2350-0022-guia-notebook-estudar-programacao.md (Accepted).
**Skill**: /test (rodada de testes automatizados e cobertura dos critérios de aceite).

## Execução

| Campo                | Valor                                                                             |
| -------------------- | --------------------------------------------------------------------------------- |
| Comando              | pnpm test:run (vitest run)                                                        |
| Exit code            | 0                                                                                 |
| Resultado            | 83 arquivos, 858 testes, 858 PASS, 0 FAIL, 0 skip                                 |
| E2E Leitura          | e2e/editorial-local/reading.spec.ts (18 testes Playwright, 18 PASS, porta 3200)   |
| Identidade de versão | HEAD b14dd51, package.json 2.0.0, Node 22                                         |
| Segurança (Step 0)   | Portão satisfeito: pnpm security:secrets e pnpm security:sast exit 0 (0 findings) |

## Cobertura por critério de aceite

| AC            | Onde está a prova                                                                                                      | Estado  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| jornada/AC-01 | docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md (2994 palavras e front matter validado)                 | coberto |
| jornada/AC-02 | docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md (matriz técnica com 6 dimensões por perfil)             | coberto |
| jornada/AC-03 | docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md (4 ações práticas por caminho: manter/melhorar/comprar) | coberto |
| jornada/AC-04 | docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md (6 fontes oficiais com data de consulta)                | coberto |
| jornada/AC-05 | docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md (faixas abertas de custo em 2026 sem marcas nominais)   | coberto |
| jornada/AC-06 | scripts/seed-sanity-drafts.py com modo dry run validando schema de mutação Sanity                                      | coberto |
| jornada/AC-07 | e2e/editorial-local/reading.spec.ts (teste leitura: guia-notebook-estudar-programacao, render e tabela contida)        | coberto |
| jornada/AC-08 | lib/editorial/catalog.ts e **tests**/unit/lib/services/posts.test.ts (isolamento de rascunhos sem published_at)        | coberto |
| jornada/AC-09 | docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md (glossário inicial com 8 termos técnicos)               | coberto |
| jornada/AC-10 | docs/reviews/evidence/2026-10-17-1730-0022-guia-notebook/ e check/0022-guia-notebook/results.json                      | coberto |

## O que foi testado

### Leitura ponta a ponta Playwright (`e2e/editorial-local/reading.spec.ts`, 18 testes)

Valida o render completo em navegador Chromium na porta 3200 da rota `/artigos/guia-notebook-estudar-programacao`:

- Renderização de título h1 e subtítulo
- Resolução da imagem de capa decorativa
- Exibição da tabela comparativa da matriz de decisão sem estouro de largura na viewport
- Renderização da seção de fontes citadas com links externos seguros
- Emissão de dados estruturados JSON-LD

### Suíte de testes unitários (`vitest`, 858 testes em 83 arquivos)

Valida serviços editoriais, integridade do catálogo local com 17 artigos, resolução de imagens locais e remotas, segurança de sessão e rotas administrativas.

## Estados falhos e não cobertos

- **Falhos**: nenhum (0 FAIL).
- **Não cobertos**: nenhum, todos os 10 critérios contam com testes e validações executados.

## Notas

- A suíte Vitest completa passou com 858 testes verdes em 83 arquivos sem regressões.
- Typecheck via tsc --noEmit exit 0, ESLint exit 0 e conformidade de formatação Prettier validada.
