# Evidência home-pendentes/AC-08: busca sem correspondência exibe estado vazio

## Critério

Uma busca sem correspondência deve exibir um estado vazio claro, sem resultados quebrados nem erro.

## Verificação Empírica

1. Teste "AC-08: busca sem correspondência exibe estado vazio" de `e2e/verify-home-pendentes.spec.ts`.
2. Com `/busca?q=xyzzyqq`, o texto "Nenhum artigo encontrado" ficou visível no `<main>`.
3. Registro no `run-log.jsonl`: `ac-08-busca-vazio` com a URL consultada.
4. Captura: `screenshots/ac-08-busca-vazio.png` (SHA-256 `98a78da430c442b32eeb83c9767ff15896fda4307dd49e36b3d3dcc5fd245de8`).

## Veredito

**PASS**
