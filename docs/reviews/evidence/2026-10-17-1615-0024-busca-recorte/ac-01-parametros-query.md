# Evidência de verificação busca/AC-01

- Critério: A rota /busca aceita parâmetros de consulta q (termo até 120 caracteres), editoria (slug ou nome da categoria) e page (número inteiro positivo) via query string da URL.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação automatizada via Playwright real

O teste em e2e/search-flow.spec.ts navegou até a URL com todos os parâmetros ativos:
URL testada: /busca?q=seguranca&editoria=todas&page=1

Resultado observado no navegador Chromium:
- Campo de busca preenchido com o valor seguranca.
- Atributo maxlength confirmado com valor 120.
- Cabeçalho de resultados renderizado para o termo pesquisado.
- Status do teste: PASS no Playwright com tempo de 925ms.

## 2. Comprovação em testes de componente

A suíte __tests__/unit/app-busca.test.tsx valida o parsing e tratamento de borda:
- Termo com espaços nas pontas aparado corretamente.
- Termos longos com mais de 120 caracteres truncados de forma determinística em exatamente 120 caracteres.
- Parâmetros editoria e page lidos a partir de searchParams com suporte a valores únicos ou arrays.

Veredito: PASS
