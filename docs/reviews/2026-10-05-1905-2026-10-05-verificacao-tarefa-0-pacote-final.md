# Verificação da tarefa 0 — pacote final, quatro fixtures e 15 asserções

Data: 2026-10-05. Clone `a9_w_gradualinfo__iso`, branch
`chore/reconciliar-scope-spec-gates`, base `0275021`. Pacote
`GradualInfo-Tarefa0-Preparada.zip`, SHA-256
`c37fd05fdb31d2bc6861b6a9f46640b65564c7a1e7aea0346efdf92e928fc791`.

Esta é a execução que faltava. O 12/12 registrado em
`2026-10-05-verificacao-tarefa-0.md` comprova os cenários **daquela** versão
(12 asserções, sem fixtures, sem job de CI) e continua valendo como registro
histórico; não valida esta entrega nem o `md-0001`.

## 1. Integridade e origem

| Verificação                                            | Resultado                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `sha256sum -c MANIFESTO-SHA256.txt` no pacote extraído | **251 de 251 conferem**, zero divergência                                            |
| Ordenação cronológica das migrations no pacote         | `20261003000000_profiles_foundation.sql` antes de `20261004000000_posts_exemplo.sql` |
| Bytes das migrations contra o clone `0275021`          | `fb50d877…` e `93d27dc3…` **idênticos** nos dois lados                               |

## 2. Delta integrado — quatro arquivos, nada mais

Comparação arquivo a arquivo entre o pacote e a árvore do clone: 251 arquivos do
pacote contra 253 do `HEAD`, com quatro diferenças de conteúdo e três de
presença. Só a tarefa 0 foi transferida, com cópia direta, sem sincronização
recursiva:

| Arquivo                                                           | Ação                                 |
| ----------------------------------------------------------------- | ------------------------------------ |
| `.github/workflows/ci.yml`                                        | substituído (job `database`)         |
| `supabase/seed.sql`                                               | substituído (quatro fixtures)        |
| `supabase/tests/rls_posts_test.sql`                               | substituído (`plan(15)`)             |
| `docs/reviews/2026-10-05-1905-2026-10-05-tarefa-0-stack-local.md` | novo (relatório de origem do pacote) |

**Preservado deliberadamente**, porque sobrescrever apagaria registro ou
reintroduziria o defeito que o próprio pacote carrega:

- `workflow/STATE.md` do clone. O do pacote é **mais velho**: não tem a linha 33
  do histórico nem o registro de verificação. Sobe-lo seria perder a fila.
- `supabase/functions/.gitkeep` e `supabase/snippets/.gitkeep`, que o pacote não
  traz porque diretório vazio não entra em `git archive` — e o CLI faz `statfs`
  nos dois no start, o que derrubaria a verificação de quem recebe o pacote.
  Ambos estão rastreados no clone, então o checkout da CI também os tem.
- `docs/reviews/2026-10-05-0950-2026-10-05-verificacao-tarefa-0.md`.

## 3. Execução real

Ambiente: podman como shim do Docker, Supabase CLI 2.119.0 via `pnpm dlx`.

| Comando                       | Resultado                                               |
| ----------------------------- | ------------------------------------------------------- |
| `pnpm supabase:start`         | sobe, 12 containers, 27,6 s                             |
| `pnpm supabase:reset --local` | **exit 0**; aplica as duas migrations em ordem e semeia |
| `pnpm supabase:test`          | **`Result: PASS`, `Files=1, Tests=15`, exit 0**         |
| `pnpm check:all`              | typecheck, lint, formatação e **65 testes** verdes      |

Catálogo depois do reset, consultado no banco local:

| Objeto                            | Estado observado                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `public.posts`, `public.profiles` | existem, `relrowsecurity = true` nos dois                                                                               |
| Policies de `posts`               | `posts_select_public` (SELECT, `{public}`) mais as quatro `*_own` de `authenticated`                                    |
| Triggers                          | `on_auth_user_created` em `auth.users`, `posts_set_updated_at` em `posts`, `profiles_set_updated_at` em `profiles`      |
| Fixtures                          | `fixture-publicado` (passado), `fixture-rascunho` (`published_at` nulo), `fixture-arquivado`, `fixture-agendado` (2126) |
| Perfis                            | dois, `Ana Silva` e `Bruno Costa`, criados pelo trigger de signup                                                       |

## 4. A suíte tem dentes nesta versão

Um PASS só prova alguma coisa se a falha correspondente aparecer quando o
defeito é introduzido. As duas sabotagens foram feitas **no banco**, sem tocar em
arquivo versionado, e revertidas em seguida.

| Cenário                                                   | Resultado                                       |
| --------------------------------------------------------- | ----------------------------------------------- |
| Policy de leitura em `using (false)` — `anon` não lê nada | **FAIL 2/15**: testes 4 e 9, `have: 0, want: 1` |
| Tabela `posts` vazia                                      | **FAIL 3/15**: testes 1, 4 e 9, `have: 0`       |
| Estado final, restaurado por `db reset`                   | **PASS 15/15**, exit 0                          |

Duas leituras que isso sustenta:

- A contagem de 1 publicado tem dente. Com a policy quebrada a falha aparece
  como `have: 0, want: 1`, que é indistinguível de "não havia linha nenhuma" sem
  a asserção 1. É a asserção 1 que separa as duas causas.
- O `exit code 1` do `supabase test db` foi observado nas duas sabotagens. O
  `set -o pipefail` do job da CI é o que impede o `tee` de transformar falha em
  sucesso, e ele é necessário, não decorativo.

Agendamento confirmado por execução: `fixture-agendado` existe com status
`publicado` e `published_at` em 2126, e é invisível para `anon`. A semântica
existente está certa e a invariante `CHECK` continua corretamente **retirada**.

## 5. Defeito no pacote, corrigido aqui

`pnpm format:check` **reprovava** o `.github/workflows/ci.yml` do pacote: uma
linha em branco a mais antes de `database:`. O job `quality` da CI é
`pnpm format:check`, então o pacote como entregue deixaria a CI vermelha antes de
o job de banco chegar a rodar. Correção de uma linha pelo Prettier do projeto;
`check:all` verde depois dela.

## 6. Revisão do job `database` da CI

Cada passo foi conferido contra o comando real, e os comandos foram executados
localmente:

| Passo                                            | Verificação                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `pnpm supabase:start`                            | funciona; em runner do GitHub o Docker é nativo                                     |
| `pnpm supabase:reset --local`                    | flag `--local` existe em `db reset`; exit 0 aqui                                    |
| `pnpm supabase:test \| tee ci-results/pgtap.log` | `pipefail` presente; saída em log e falha preservada, provado pelas sabotagens      |
| `upload-artifact` com `if: always()`             | diretório `ci-results/` já está no `.gitignore`                                     |
| `pnpm supabase:stop --no-backup`                 | flag `--no-backup` existe em `stop`                                                 |
| Diretórios `functions/` e `snippets/`            | `.gitkeep` rastreados, então o checkout tem os dois diretórios que o CLI inspeciona |

**Pendências reais, não corrigidas aqui** — mexer nelas é decisão de sequenciamento,
não parte da tarefa 0:

1. **A versão da CLI não é pinada.** Os quatro wrappers são `pnpm dlx supabase`,
   que resolve a última versão a cada execução — hoje 2.119.0. Um bump da CLI
   muda o comportamento sem nenhum commit neste repositório, e foi exatamente um
   comportamento de CLI, não o SQL, que pulou a migration `init`. Pin por
   devDependency é o conserto de raiz.
2. **`timeout-minutes: 20`.** Aqui `supabase start` levou 27,6 s com as imagens já
   presentes. Em runner frio o download do conjunto de imagens do Supabase é a
   etapa dominante; 20 min é apertado, e o estouro mata o job sem output útil.
3. **Custo de todo PR.** O job baixa o stack inteiro em cada PR, em paralelo com
   os outros três. É o preço de não repetir o defeito de "nenhum job toca em
   banco", e é decisão do dono continuar assim.

## 7. O que não foi apagado, e por que

Nenhum banco, volume ou projeto foi excluído. O inventário do que existe na
máquina, porque um nome antigo em arquivo não determina o alvo:

| Origem                                     | Volumes locais                                                                                                            | Situação                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AQUA9, `project_id = website_aqua9.com.br` | `supabase_db_website_aqua9.com.br`, `supabase_storage_website_aqua9.com.br`, `supabase_edge_runtime_website_aqua9.com.br` | candidatos, **intactos**        |
| GradualInfo, `project_id = gradualinfo`    | `supabase_db_gradualinfo`, `supabase_storage_gradualinfo`, `supabase_edge_runtime_gradualinfo`                            | **preservar**                   |
| Sem nome legível                           | quatro volumes de hash                                                                                                    | não atribuídos a nenhum projeto |

Sobre o projeto hospedado: **nada no repositório aponta para ele**. Não há
referência `aqua9` em `.env.example`, `supabase/config.toml`, `wrangler.jsonc`,
`lib/env.ts` ou `next.config.ts`, e nenhuma URL `supabase.co` de um projeto
antigo. As duas únicas referências operacionais remanescentes estão em
`package.json:8` e `package.json:11` — as URLs do repositório ainda dizem
`github.com/aqua9/gradualinfo`. `scratch/rename-project.mjs` também está
rastreado e contém as regras do próprio rename, ou seja, é artefato de uma
operação pontual. Excluir o projeto hospedado exigiria a conta, e essa é ação
humana.

Sobre o identificador técnico: o pedido é `gradualinfo-editorial`, e hoje o
`project_id = gradualinfo` em `supabase/config.toml:5`, o `name` do
`wrangler.jsonc:13` e o `name` do `package.json:2` dizem `gradualinfo`. Mudar o
`project_id` recria containers e volumes com nome novo, então não entra no meio
da verificação da tarefa 0.

## 8. Limites desta execução

- Vale a **tarefa 0** do `md-0001`: stack reproduzível, fixtures locais, pgTAP
  executado, banco na CI. Não vale o resto do `md-0001` — as 15 asserções não
  tocam preview, `user_metadata` nem transformação de schema, que são as tarefas
  1 a 5.
- A CI do GitHub **não** foi executada aqui. O job foi revisado por leitura e
  pelos mesmos comandos rodados localmente; o comportamento em runner real é
  esperado, não observado.
- `md-0002` continua `Proposed`. Concluir o banco não autoriza a interface.
- A limpeza de identidade — remover vestígio do AQUA9 e renomear `template-aqua/`
  para `referencias/template-editorial/` — não foi tocada aqui: é a preparação
  seguinte, e mexer em ponteiros agora confundiria o diff da tarefa 0.
- Nada foi commitado. A árvore do clone está com 3 arquivos modificados e 1 novo,
  aguardando decisão sobre o commit.
