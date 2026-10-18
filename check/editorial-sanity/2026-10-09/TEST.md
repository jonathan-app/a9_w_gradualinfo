# Test: 0006-transicao-editorial-sanity, registro de execução da suíte

> Registro formal da skill `/test` para as mudanças de `lib/sanity/client.ts` na spec 0006 (`docs/specs/0006-transicao-editorial-sanity.md`). Complementa `VALIDATION.md` na mesma pasta, que documenta a validação operacional contra build de produção.

## 1. Identidade e Versão

- **Spec**: `docs/specs/0006-transicao-editorial-sanity.md` (Status: `Accepted`)
- **Branch**: `feat/transicao-editorial-sanity`
- **Commit da mudança testada**: `3b2754c` (corte temporal em `getSanityPublishedPosts` e `getSanityPostBySlug`, distinção de erros Sanity)
- **Data**: 2026-10-09
- **Framework de Testes**: Vitest 4.1 (node)

## 2. Escopo

- **Arquivo de origem**: `lib/sanity/client.ts` (classe: lógica)
- **Arquivo de teste**: `__tests__/unit/sanity-client.test.ts` (extendido)
- **Estratégia**: testes unitários nas fronteiras de fetch e relógio; a filtragem remota do Content Lake é delimitada como infraestrutura externa (mocks não executam GROQ).

## 3. Comandos Executados e Resultados

| Comando                                                     | Resultado         | Testes Passando |                     Erros                      |
| :---------------------------------------------------------- | :---------------- | :-------------: | :--------------------------------------------: |
| `pnpm exec vitest run __tests__/unit/sanity-client.test.ts` | **PASS (exit 0)** |    **13/13**    |                       0                        |
| `pnpm test:run` (suíte completa)                            | **PASS (exit 0)** |   **201/201**   |                       0                        |
| `pnpm typecheck` (`tsc --noEmit`)                           | **PASS (exit 0)** |       n/a       |                       0                        |
| `pnpm lint` (`eslint .`)                                    | **PASS (exit 0)** |       n/a       | 0 (2 warnings já existentes em `lib/audit.ts`) |
| `pnpm exec prettier --check` (arquivo)                      | **PASS (exit 0)** |       n/a       |                       0                        |

## 4. Cobertura por Critério de Aceite (Spec 0006)

- **editorial/AC-01 (Fonte Única no Sanity)**: consultas de listagem pública e por slug montadas exclusivamente contra o Content Lake, sem fonte dupla. Coberto por testes de montagem de GROQ e parâmetros.
- **editorial/AC-02 (Preservação de Slugs e SEO)**: `mapSanityDocumentToPost` preserva slug em objeto `{current}`, texto puro e fallback por `_id` em rascunho; título sem valor cai em `Sem título`.
- **editorial/AC-03 (Segurança de API)**: chamadas públicas não enviam cabeçalho `Authorization`; apenas preview envia `Bearer` com o token. O teste existente já cobria; mantido.
- **editorial/AC-04 (Distinção de Erros)**: erro HTTP 500/503 e falha de rede propagam exceção em vez de mascarar como 404 (testes existentes); `null` é reservado para resultado vazio.
- **editorial/AC-06 (Cache e Distinção de Erros)**: requisição pública envia `cache: no-store` (spec: leitura sem cache intermediário).

## 5. Casos Novos Adicionados

1. Mapeamento no padrão camelCase (`body`, `coverImage.asset.url`, `author`, `fontesCitadas`, `publishedAt`).
2. Slug como texto puro, fallback de slug por `_id` em rascunho e título padrão `Sem título`.
3. Envio do parâmetro `$now` (ISO) e limite padrão `[0...10]` na listagem pública.
4. Preview **não** envia `$now` nem aplica corte temporal, então posts agendados permanecem visíveis sob preview.
5. Asserção `cache: no-store` na consulta pública (contrato da spec).

## 6. Veredito

- **Status**: **Passed (13/13 no arquivo, 201/201 na suíte)**.
- **Bugs Encontrados**: Nenhum.
