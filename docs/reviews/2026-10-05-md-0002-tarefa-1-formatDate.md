# md-0002, tarefa 1: fuso opcional na formatação

Data: 2026-10-05. Base: ZIP SHA-256 `7689f951cb71fc78851b848e098984faa660fd8e2345de0546fe5251bb336f7f`.

## Implementação

`FormatOptions` recebe `timeZone?: string`. `formatDate` encaminha o valor para `Intl.DateTimeFormat`. A ausência do valor mantém o fuso do ambiente. Nenhum consumidor existente foi alterado; a futura camada editorial deve passar `America/Sao_Paulo` explicitamente.

Três testes Vitest adicionados ao arquivo unitário canônico: virada de dia entre UTC e São Paulo, compatibilidade sem parâmetro e equivalência para Date, string e timestamp. O arquivo duplicado de testes fora de unit foi preservado.

## Verificação nesta máquina (clone `a9_w_gradualinfo__iso`)

Ambiente: Node 22, pnpm 12.5.1, Docker via podman.

```bash
pnpm check:all      # typecheck, lint, prettier, 65 testes unitários
pnpm supabase:test  # pgTAP 63 asserções
```

Resultados:

| Gate                        | Status |
| --------------------------- | ------ |
| TypeScript (`tsc --noEmit`) | PASS   |
| ESLint                      | PASS   |
| Prettier                    | PASS   |
| Vitest (65 testes)          | PASS   |
| pgTAP (63 asserções)        | PASS   |

Os testes unitários novos para `formatDate`:

- `mantém o dia editorial de São Paulo na virada da data UTC`
- `preserva o fuso do ambiente quando timeZone é omitido`
- `aplica o fuso explícito a Date, string e timestamp`

Todos passaram.

A verificação direta em Node reproduz o comportamento:

- `TZ=UTC` → São Paulo retorna `Oct 4, 2026` para `2026-10-05T01:30Z`; UTC e fuso omitido retornam `Oct 5, 2026`
- `TZ=America/Sao_Paulo` → omissão e `undefined` continuam retornando `Oct 4, 2026`
- `Date`, `string` e `timestamp` produzem o mesmo dia

## Gates pendentes resolvidos

A instalação, `pnpm check:all` e `pnpm supabase:test` executaram com pnpm 12.5.1 e Docker (podman) disponível. Todos verdes.

## Estado e sequência

Tarefa 1 implementada e verificada por execução completa. Isso cobre a função auxiliar da AC-02, não o card ou a AC inteira. Tarefas 2 a 10 continuam pendentes. Não houve commit, push, merge ou deploy. Spec `Accepted` preservada.

Próximo: tarefa 2 — confirmar que o schema `posts` transformado pelo `md-0001` tem as colunas que a página lê, com RLS e índice de listagem.
