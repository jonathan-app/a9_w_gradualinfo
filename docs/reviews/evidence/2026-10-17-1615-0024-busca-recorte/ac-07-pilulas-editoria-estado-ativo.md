# Evidência de verificação busca/AC-07

- Critério: A interface apresenta pílulas clicáveis com as editorias disponíveis, destacando visualmente a opção ativa e permitindo alternar filtros sem apagar o termo de busca atual.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação dos atributos de acessibilidade e estado ativo

A suíte __tests__/unit/app-busca.test.tsx valida os elementos renderizados:
- Navegação identificada com aria-label="Filtrar por editoria".
- Pílula "Todas" com href="/busca?q=Novidade".
- Pílula de categoria ativa destacada com aria-current="page" e data-active="true".
- Pílulas inativas não possuem aria-current.
- Classes CSS pill e pillActive aplicam os tokens de design do DESIGN.md.

## 2. Comprovação no navegador via Playwright

O teste em e2e/search-flow.spec.ts valida que a navegação de pílulas renderiza no Chromium real e a opção ativa reflete aria-current="page".

Veredito: PASS
