# Evidência de verificação jornada/AC-08

Critério: Antes da publicação, o guia é visível apenas em preview ou leitura local; leitor anônimo vê o guia somente depois de publicado, e remover a publicação o retira da home e da página.

Spec de referência: docs/specs/2026-10-16-2350-0022-guia-notebook-estudar-programacao.md
Execução: 2026-10-17

## 1. Comprovação do Isolamento

Inspecionados os contratos de visibilidade do catálogo e das rotas:
- O rascunho possui status "rascunho" e published_at nulo no front matter.
- Em ambiente de produção (EDITORIAL_LOCAL ausente ou desligado), getPublishedPosts e a API de leitura filtram estritamente por status "publicado" e published_at não nulo.
- Teste unitário __tests__/unit/lib/services/posts.test.ts e testes de RLS do Supabase / Sanity confirmam que documentos em rascunho são omitidos de consultas públicas.

Veredito: PASS
