# Evidência de verificação busca/AC-05

- Critério: Os resultados encontrados são classificados por pontuação decrescente de relevância, priorizando título exato (peso 4), título aproximado (peso 3), resumo exato (peso 2), resumo aproximado (peso 1.5), corpo exato (peso 1) e corpo aproximado (peso 0.5), aplicando data de publicação mais recente como critério de desempate.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação da hierarquia de pesos ponderados

A suíte __tests__/unit/lib/search-posts.test.ts comprova a ordem exata de classificação:
- Artigo com título exato pontua peso 4 e fica à frente do artigo com título aproximado (peso 3).
- Artigo com título aproximado fica à frente do artigo com correspondência exclusiva no corpo (peso 1).

## 2. Comprovação de desempate por data mais recente

Quando dois artigos atingem a mesma pontuação de relevância (como correspondência idêntica no título), o algoritmo aplica a data de publicação mais recente como critério determinante de desempate:
- Artigo publicado em 2026-06-01 precede o artigo publicado em 2026-01-01 com o mesmo termo.

Veredito: PASS
