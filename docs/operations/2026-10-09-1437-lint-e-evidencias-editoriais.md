# Limpeza do lint e organização das evidências

Execução em 2026-10-09 (America/Sao_Paulo), limitada às duas frentes autorizadas pelo usuário.

## Alterações

`lib/audit.ts` usa `lib/logger.ts`. O logger emite JSON com `level`, `scope` e `event`, mantém o nível informativo e contém falhas do destino para preservar a operação auditada. A exceção à regra `no-console` está restrita à linha do adaptador que escreve no console do runtime, com justificativa. A regra global do ESLint permanece ativa. O formato anterior com prefixo `[audit]` passa a uma linha JSON, consumidores de logs que dependam desse prefixo precisam se adaptar.

`__tests__/unit/audit-logger.test.ts` verifica o registro legível e a continuidade da operação quando o console falha.

`check/editorial-sanity/2026-10-09/INDEX.md` organiza os registros históricos e os testes relacionados, aponta para a spec renomeada e para o gate reprovado. Os registros originais e as alterações preexistentes permanecem preservados. Não houve commit, descarte, merge ou deploy, a árvore continua com as pendências anteriores.

## Validação nesta execução

| Verificação                                                    | Resultado                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| ESLint global, `--max-warnings 0`                              | PASS, exit 0, sem avisos                                  |
| TypeScript, `--noEmit`                                         | PASS, exit 0                                              |
| Prettier nos quatro arquivos criados ou alterados inicialmente | PASS                                                      |
| Vitest completo no sandbox                                     | 224 PASS, 18 bloqueados por `spawnSync git EPERM`, exit 1 |
| Reexecução ampliada do Vitest                                  | Aprovação solicitada, resultado pendente                  |

As ferramentas foram executadas diretamente pelos entrypoints locais de `node_modules`, pois as chamadas via shell de login não produziram saída e foram interrompidas. Nenhuma aprovação integral de `check:all` é alegada.

## Continuidade

Esta limpeza não aprova a spec 0006. O próximo trabalho editorial registrado permanece `/architect` para normalizar o contrato do gate, depois `/develop` para corrigir soft 200 e `/check verify` para repetir a prova. O aceite humano do rate limiting administrativo permanece pendente no Bastão atual de `workflow/STATE.md`.
