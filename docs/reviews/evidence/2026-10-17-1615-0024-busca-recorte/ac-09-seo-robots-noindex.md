# Evidência de verificação busca/AC-09

- Critério: A rota /busca preserva a diretiva de cabeçalho e metadados noindex, follow para evitar indexação externa de páginas de busca interna conforme a diretriz de SEO da Spec 0023.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação da tag meta robots no Playwright real

O teste em e2e/search-flow.spec.ts navega para /busca e avalia a tag meta no DOM do Chromium:
- Localizador: meta[name="robots"]
- Atributo content: "noindex, follow"
- Status do teste: PASS

## 2. Comprovação na suíte de testes de SEO

A suíte __tests__/unit/seo-metadata.test.ts valida de forma centralizada os metadados gerados pelo Next.js:
- Caso de teste: "/busca mantém noindex com follow, sem canonical e sem sufixo duplicado".
- Resultado: PASS

Veredito: PASS
