# /test ci-fixtures · 3 passed

## Identidade da execução

| Campo     | Valor                                                                                        |
| --------- | -------------------------------------------------------------------------------------------- |
| HEAD      | `ca5f19fc1dbecf40f4747b89de76a0c22177d6d5`                                                   |
| Alvo      | `scripts/ci-fixtures.mjs`, blob `3d9f527cb37a0e3aed0f2df65b0e84e46da6ee9b`                   |
| Teste     | `__tests__/integration/ci-fixtures.test.ts`, blob `484ea0fa394ce3eca5dbf6bc3c0be5706e33fecd` |
| Executado | 2026-10-20 00:29, America/Sao_Paulo                                                          |
| Comando   | `pnpm exec vitest run __tests__/integration/ci-fixtures.test.ts --reporter=dot`              |
| Resultado | exit 0, 1 arquivo, 3 testes passando                                                         |

## Cobertura

| Comportamento                                      | Teste                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Credenciais efêmeras registradas em `::add-mask::` | Serviço, token de preview, senha de preview, segredo de falha, usuários negativos e blobs JSON |
| Valores exportados para `GITHUB_ENV`               | Chaves locais, URL do Supabase, URL do proxy de falhas e identificadores de preview            |
| Host remoto recusado                               | `API_URL` com `https://db.example.com` falha com a mensagem da trava                           |
| Execução sem `GITHUB_ENV` recusada                 | Ausência da variável falha com a mesma mensagem                                                |
| Efeitos colaterais do caminho feliz                | Três usuários criados e um upsert de artigos no Supabase simulado                              |

## Portão de segurança

`security-reports/semgrep.json` foi gerado em 2026-10-20 00:07, depois do commit `ca5f19f`, com Semgrep 1.179.0, 324 caminhos lidos, incluindo `scripts/ci-fixtures.mjs`, e 0 resultados. `security-reports/gitleaks.json` está vazio. A reexecução de `pnpm security:all` às 00:29 terminou com 0 achados no Gitleaks e 0 achados ERROR no Semgrep. Nenhum achado Critical ou High está aberto para este alvo.

## Não coberto

A execução usa um Supabase simulado em loopback. Ela não prova criação real de usuários, RLS ou o upsert real de artigos.

O teste confere as linhas `::add-mask::` impressas pelo script. Ele não prova o comportamento do GitHub Actions ao redigir esses valores no log.

O ramo com `E2E_NETWORK_FAULTS` desligado não foi exercitado. O caminho coberto usa o proxy de falhas em `http://127.0.0.1:3110`.

Não existe spec de produto para `scripts/ci-fixtures.mjs`; o commit `ca5f19f` estabiliza a CI. Não há critério de aceite `AC-N` para rastrear.

O teste não altera o código de aplicação e não prova a execução remota da CI.
