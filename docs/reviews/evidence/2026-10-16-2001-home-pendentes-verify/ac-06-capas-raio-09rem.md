# Evidência home-pendentes/AC-06: capas da home com raio de 0,9 rem

## Critério

Todos os contêineres de capa da home (artigo em destaque, destaques, últimas leituras e grade de recentes) devem aplicar cantos arredondados de 0,9 rem (14,4 px), com recorte do conteúdo.

## Verificação Empírica

1. Teste "AC-06: capas da home aplicam raio de 0.9rem" de `e2e/verify-home-pendentes.spec.ts` (1440x900).
2. Foram inspecionados os 11 contêineres de capa da página (seletor `div[class*="_cover__"], div[class*="_heroCover__"]`). Os `<img>` com `object-cover` ficam fora da asserção porque não recebem o raio.
3. O estilo computado retornou `border-radius: 14.4px` em todos os 11 contêineres, e `overflow: hidden` em todos eles.
4. A regra vem de `components/home/home-editorial.module.css:17-24` (`border-radius: 0.9rem` em `.heroCover` e `.cover`).
5. Registro no `run-log.jsonl`: `ac-06-capas` com `count: 11` e o vetor de raios.
6. Captura: `screenshots/ac-06-capas-desktop.png` (SHA-256 `f13c30ba5f75481b898bf4ba4cf85731c751f8c35d801f5f4ed1282ebe602d24`).

## Veredito

**PASS**
