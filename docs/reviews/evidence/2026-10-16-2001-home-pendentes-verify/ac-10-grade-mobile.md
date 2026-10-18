# Evidência home-pendentes/AC-10: grade em celular com uma coluna e sem rolagem horizontal

## Critério

No celular (375 px) a grade de recentes deve manter uma coluna e a página não deve gerar rolagem horizontal.

## Verificação Empírica

1. Teste "AC-10: grade em celular mantém uma coluna e não gera rolagem horizontal" de `e2e/verify-home-pendentes.spec.ts` (375x667).
2. O estilo computado da grade retornou 1 trilha, conforme `components/home/home-editorial.module.css:177-181` (coluna única como padrão, com degraus de 2 e 4 colunas acima de 640 e 1024 px).
3. A diferença entre `document.documentElement.scrollWidth` e `clientWidth` foi 0: nenhuma rolagem horizontal.
4. Registro no `run-log.jsonl`: `ac-10-grade-mobile` com `columns: 1` e `overflow: 0`.
5. Captura: `screenshots/ac-10-grade-mobile.png` (SHA-256 `4b915d27fc6ccbbe14a4c9d8bf3598b0fafe3e55ba66a464161bf5dbd8128e41`).

## Veredito

**PASS**
