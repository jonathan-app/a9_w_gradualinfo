# Evidência de verificação busca/AC-03

- Critério: O algoritmo de pesquisa oferece tolerância a erros de digitação via distância Levenshtein Damerau, aceitando até 1 edição para termos de 5 a 8 caracteres e até 2 edições para termos com mais de 8 caracteres, exigindo correspondência estrita ou prefixo para termos de até 4 caracteres.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação algorítmica de Levenshtein Damerau

A suíte __tests__/unit/lib/search-posts.test.ts valida o cálculo de distância com transposições adjacentes, substituições e inserções:
- damerauLevenshtein("teclado", "telcado") retorna 1 (transposição).
- damerauLevenshtein("artifisial", "artificial") retorna 1 (substituição).
- damerauLevenshtein("prograamacao", "programacao") retorna 1 (inserção).

## 2. Limites de tolerância proporcionais

O teste valida os patamares da função maxAllowedDistance:
- Termos de 1 a 4 caracteres: limite 0 (exige exato ou prefixo).
- Termos de 5 a 8 caracteres: limite 1 edição.
- Termos com mais de 8 caracteres: limite 2 edições.

A função matchTermInWord comprova o comportamento:
- Termo curto "nxt" contra "next" é rejeitado.
- Termo médio "seguramca" contra "seguranca" é aceito com 1 edição.
- Termos longos "inteligensia" e "artifisial" são aceitos com tolerância.

## 3. Comprovação ponta a ponta no Playwright

O teste em e2e/search-flow.spec.ts executa /busca?q=artifisial no Chromium e valida a renderização dos resultados com sucesso.

Veredito: PASS
