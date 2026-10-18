# Evidência de verificação busca/AC-06

- Critério: A paginação limita a exibição a 20 artigos por página, provendo controles funcionais para página anterior e próxima página preservando os parâmetros q e editoria ativos na URL.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação do particionamento em 20 itens por página

A suíte __tests__/unit/lib/search-posts.test.ts valida a paginação matemática:
- Catálogo sintético de 25 artigos resulta em totalMatches=25 e totalPages=2 com pageSize=20.
- Página 1 contém exatamente os 20 primeiros itens.
- Página 2 contém os 5 itens restantes.

## 2. Comprovação dos links e preservação de parâmetros

A suíte __tests__/unit/app-busca.test.tsx valida a renderização dos controles de navegação:
- Indicador textual exibe "Página 1 de 2".
- Link para a próxima página preserva a busca: href="/busca?q=Python&page=2".
- Caso editoria esteja ativa, o parâmetro editoria é preservado na montagem do link de navegação anterior e próxima.

Veredito: PASS
