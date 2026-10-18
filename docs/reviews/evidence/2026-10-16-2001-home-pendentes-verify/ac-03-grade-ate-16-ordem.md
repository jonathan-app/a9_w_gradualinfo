# Evidência home-pendentes/AC-03: grade de recentes lista até 16 artigos em ordem não crescente

## Critério

A seção inferior da home reúne até 16 artigos de todas as editorias, ordenados por `published_at` decrescente.

## Verificação Empírica

1. Teste "AC-03/AC-04" de `e2e/verify-home-pendentes.spec.ts` (Chromium headless, 1440x900, runner local 3100).
2. A seção `#recentes section[aria-label="Grade de artigos"]` renderizou 6 artigos, dentro do limite de 16.
3. As datas foram extraídas de cada card no DOM (`<time datetime>`, `components/home/post-card-editorial.tsx:20`). Todas retornaram `2026-10-11T07:30:26+00:00`: a sequência é não crescente, e o dataset local não tem datas distintas para discriminar o desempate.
4. A ordenação decrescente está garantida no código: `app/page.tsx:66-68` ordena por `published_at` decrescente (`localeCompare`) e aplica `slice(0, 16)`.
5. Registro no `run-log.jsonl`: `ac-03-04-grade-desktop` com `count: 6` e o vetor de datas.
6. Captura: `screenshots/ac-03-04-grade-desktop.png` (página inteira, SHA-256 `8fad4fb8295bfd2e9ae24418b61d7b087ea3efd7db4afb26c2c14853fdf3f9e4`).

## Veredito

**PASS** (com a ressalva registrada: no dataset local os 6 artigos têm o mesmo `published_at`, então a verificação empírica atesta a ordem não crescente, e a decrescente fica ancorada no código-fonte)
