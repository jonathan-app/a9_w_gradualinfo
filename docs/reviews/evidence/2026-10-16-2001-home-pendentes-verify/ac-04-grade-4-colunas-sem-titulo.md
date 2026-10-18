# Evidência home-pendentes/AC-04: grade em quatro colunas no desktop, sem título nem contagem

## Critério

No desktop (≥1024px) a grade de recentes usa quatro colunas e mantém a discrição visual: sem título próprio nem contagem de artigos visíveis na seção.

## Verificação Empírica

1. Teste "AC-03/AC-04" de `e2e/verify-home-pendentes.spec.ts` (1440x900).
2. O estilo computado de `grid-template-columns` na grade retornou 4 trilhas, conforme `components/home/home-editorial.module.css:204-208` (`repeat(4, minmax(0, 1fr))`).
3. Asserção estrutural: `h2`, `[class*="sectionHeader"]` e `[class*="count"]` dentro da seção têm contagem 0 no DOM.
4. Registro no `run-log.jsonl`: `ac-03-04-grade-desktop` com `columns: 4`.
5. Captura: `screenshots/ac-03-04-grade-desktop.png` (página inteira).

## Veredito

**PASS**
