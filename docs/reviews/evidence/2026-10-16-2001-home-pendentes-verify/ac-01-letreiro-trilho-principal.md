# Evidência home-pendentes/AC-01: clique no trilho principal da faixa navega para o artigo

## Critério

Um clique numa âncora de artigo do trilho principal da faixa animada (letreiro sob o menu) deve abrir o artigo por navegação nativa em `/artigos/[slug]`.

## Verificação Empírica

1. Execução do teste "AC-01/AC-02: faixa animada abre o artigo no trilho principal e no trilho duplicado" de `e2e/verify-home-pendentes.spec.ts` contra o runner local (`http://127.0.0.1:3100`), em Chromium headless, viewport 1440x900.
2. A faixa tem dois trilhos com a classe `.animate-marquee-scroll`; o trilho principal é o primeiro.
3. O primeiro link do trilho principal foi localizado com `a[href^="/artigos/"]`: `/artigos/auditoria-seo-tecnico-checklist`.
4. O CSS pausa a animação no hover do container (`.marquee-container:hover .animate-marquee-scroll`, `app/globals.css:481`); o teste paira o mouse no container antes de clicar, reproduzindo o comportamento de um usuário que mira o link.
5. Após o clique, a URL observada foi `http://127.0.0.1:3100/artigos/auditoria-seo-tecnico-checklist` e o `h1` do artigo ficou visível.
6. Registro no `run-log.jsonl`: `ac-01-letreiro-principal` com `href` e `url` idênticos ao path acima.
7. Captura: `screenshots/ac-01-letreiro-desktop.png` (SHA-256 `45600f181cb444533b77e9eb4c2e9b3ccd9d763a71eb6afc66eee24aa46a4a1d`).

## Veredito

**PASS**
