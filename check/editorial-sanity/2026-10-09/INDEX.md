# Índice das evidências editoriais

Organização em 2026-10-09, 14:37 (America/Sao_Paulo). Os registros originais foram preservados. Resultados antigos não aprovam mudanças posteriores.

| Arquivo                                                                                       | Conteúdo e limite                                                                                              |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [VALIDATION.md](VALIDATION.md)                                                                | Execuções anteriores, 175 testes unitários e quatro E2E. Não substitui o gate posterior.                       |
| [TEST.md](TEST.md)                                                                            | Suíte do cliente Sanity, 13 testes no arquivo e 201 na suíte naquela execução. Mocks não executam GROQ remoto. |
| [FAILURE-STATUS.md](FAILURE-STATUS.md)                                                        | Regressões 404/503 em processo e falha Sanity medida como HTTP 200 na rede. DO conectado permanece sem prova.  |
| [Relatório do gate](../../../docs/reviews/2026-10-09-0906-0006-transicao-editorial-sanity.md) | Gate REPROVADO, três PASS, um FAIL, quatro UNVERIFIABLE e um BLOCKER.                                          |
| [Spec vigente](../../../docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md)        | Contrato editorial, com normalização do formato do gate pendente conforme o relatório.                         |

## Código de teste relacionado

- `__tests__/unit/sanity-client.test.ts`: consultas, mapeamento e parâmetros do cliente Sanity.
- `__tests__/unit/preview-failure-status.test.ts`: distinção entre sessão inválida e infraestrutura indisponível.
- `__tests__/unit/preview-auth-accessible.test.ts`: acesso público e autorização de preview.
- `__tests__/unit/preview-durable-object.test.ts`: contrato do armazenamento de sessões.
- `__tests__/unit/lib/services/posts.test.ts`: serviço editorial.
- `e2e/editorial-sanity.spec.ts`: comportamento pela rede nos cenários já implementados.

`TEST.md` e `FAILURE-STATUS.md` estavam sem rastreamento no início desta organização. `VALIDATION.md` já tinha alterações locais. Nenhum desses registros foi descartado ou reescrito. Os links antigos dentro dos registros históricos devem ser resolvidos pela spec vigente acima.

## Pendências para a spec 0006

Normalizar o contrato para o parser do gate, corrigir a resposta soft 200 na indisponibilidade editorial e repetir a prova HTTP/interface. A prova do Durable Object deve usar runtime com binding real. Não tratar testes unitários como prova conectada. Merge e deploy seguem sem autorização.
