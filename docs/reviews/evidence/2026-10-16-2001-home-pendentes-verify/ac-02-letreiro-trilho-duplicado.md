# Evidência home-pendentes/AC-02: clique no trilho duplicado da faixa navega para o artigo

## Critério

O trilho duplicado da faixa animada (o segundo, com `aria-hidden="true"`) repete as mesmas âncoras de artigos e o clique nele também deve abrir `/artigos/[slug]`.

## Verificação Empírica

1. Mesma execução do teste "AC-01/AC-02" de `e2e/verify-home-pendentes.spec.ts` (Chromium headless, viewport 1440x900, runner local na porta 3100).
2. Confirmado no DOM: exatamente dois trilhos `.animate-marquee-scroll`, e o segundo tem `aria-hidden="true"` (`components/layout/site-header.tsx:210-212`).
3. Contagem de links `a[href^="/artigos/"]` idêntica nos dois trilhos (mesma lista de posts).
4. O primeiro link do trilho duplicado foi clicado após pairar o mouse no container (que pausa a animação): URL observada `http://127.0.0.1:3100/artigos/auditoria-seo-tecnico-checklist` e `h1` visível.
5. Registro no `run-log.jsonl`: `ac-02-letreiro-duplicado` com `href` e `url`.
6. Captura: `screenshots/ac-02-artigo-via-trilho-duplicado.png` (SHA-256 `927fc78a95de0e63436f96ba46d3764183a0118638c13ab1c96805e0a49c5d69`).

## Veredito

**PASS**
