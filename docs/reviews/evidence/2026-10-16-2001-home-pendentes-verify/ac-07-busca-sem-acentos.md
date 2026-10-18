# Evidência home-pendentes/AC-07: busca do menu encontra resultados sem acentos (desktop e mobile)

## Critério

A busca do menu deve submeter para `/busca` e encontrar artigos com correspondência que ignora acentos, em título, resumo, editoria e corpo, tanto no formulário desktop quanto no atalho mobile.

## Verificação Empírica

1. Desktop (1440x900), teste "AC-07: busca no menu encontra resultados sem acentos" de `e2e/verify-home-pendentes.spec.ts`:
   - O campo `#header-search` recebeu `tecnico` (sem acento) e foi submetido com Enter.
   - A URL observada foi `/busca?q=tecnico` e o título "Auditoria SEO técnica: 21 verificações que podem revelar problemas invisíveis" apareceu entre os resultados, comprovando a correspondência sem acento.
2. A normalização está em `lib/utils/search-posts.ts:10-13` (NFD com remoção de diacríticos) e é aplicada a título, resumo/editoria e corpo.
3. Mobile (375x667), teste "AC-07 (mobile)":
   - O atalho do header (`aria-label="Pes artigos"`, `components/layout/site-header.tsx:106-111`) abriu `/busca`.
   - O campo visível do `<main>` recebeu `site lento` e retornou "Seu site é lento mesmo com uma boa nota no PageSpeed? O que os testes não mostram".
   - Nota de precisão: o header mantém o formulário desktop oculto no DOM também no mobile; o teste usa o campo do `<main>`, que é o único visível nessa largura.
4. Registros no `run-log.jsonl`: `ac-07-busca-desktop` e `ac-07-busca-mobile` com os títulos retornados.
5. Capturas: `screenshots/ac-07-busca-desktop.png` (SHA-256 `d2d631d25d3a69e41396c46403bf2e819941ab3e8be30d054ecd75551814602b`) e `screenshots/ac-07-busca-mobile.png` (SHA-256 `c463ed88472a6df610daa109284e29ae3b171ddff747fbce9fce3f6c7c668859`).

## Veredito

**PASS**
