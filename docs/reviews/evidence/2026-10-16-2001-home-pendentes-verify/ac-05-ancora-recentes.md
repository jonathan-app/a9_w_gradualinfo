# Evidência home-pendentes/AC-05: link Recentes leva a /#recentes e rola até a seção

## Critério

O link "Recentes" do menu principal deve apontar para `/#recentes` e rolar a página até a seção da grade.

## Verificação Empírica

1. Teste "AC-05: link Recentes leva a /#recentes e rola até a seção" de `e2e/verify-home-pendentes.spec.ts` (1440x900).
2. O link desktop aponta para `/#recentes` (`components/layout/site-header.tsx:66-70`).
3. Após o clique, a URL observada terminou em `#recentes`.
4. A posição da seção no viewport após o clique: topo a 132,5 px, dentro da área visível e abaixo da margem de ancoragem de 5 rem (`scroll-margin-top`, `components/home/home-editorial.module.css:5-7`).
5. Registro no `run-log.jsonl`: `ac-05-ancora-recentes` com `top: 132.546875`.
6. Captura: `screenshots/ac-05-ancora-recentes.png` (SHA-256 `b4aa0e11740a520d3d5f116da0bb9d47aa8d0a913813796337f7fdec228dff1d`).

## Veredito

**PASS**
