# Verificação da tarefa 0 — 2026-10-05

Execução real no clone `a9_w_gradualinfo__iso`, branch
`chore/reconciliar-scope-spec-gates`. Esta é a **primeira vez** que a suíte pgTAP
deste repositório executa, porque o stack local nunca subiu (ver
`2026-10-05-bloqueio-stack-local.md`).

Ambiente: Docker é um shim de 232 bytes sobre **podman**; o `supabase start`
funcionou assim mesmo. Registrado porque é o mesmo risco do outro lado.

## Achado 1 — o ZIP entregue não continha `supabase/snippets/` nem `supabase/functions/`

Diretório vazio não entra no `git archive`, e o Supabase CLI faz `statfs` nos
dois no start:

```text
Error: statfs /home/.../a9_w_gradualinfo__iso/supabase/snippets:
no such file or directory
```

Isso derrubaria a verificação **também no ambiente de quem recebeu o ZIP**, com
uma mensagem que não aponta para a causa. Corrigido com `.gitkeep` nos dois
diretórios, para que sobrevivam ao git e a futuros empacotamentos.

Este erro é da minha entrega, não da preparação da tarefa 0.

## Achado 2 — o rename funciona, e a ordem das migrations está correta

Com `00000000000000_init.sql`:

```text
Skipping migration 00000000000000_init.sql... (replace "init" with a
different file name to apply this migration)
Applying migration 20261004000000_posts_exemplo.sql...
Seeding data from supabase/seed.sql...
failed to send batch: ERROR: relation "public.profiles" does not exist (SQLSTATE 42P01)
```

Com `20261003000000_profiles_foundation.sql`:

```text
Applying migration 20261003000000_profiles_foundation.sql...
Applying migration 20261004000000_posts_exemplo.sql...
Seeding data from supabase/seed.sql...
Restarting containers...
Finished supabase db reset on branch chore/reconciliar-scope-spec-gates.
```

O timestamp `20261003000000` é **anterior** a `20261004000000`, então `profiles`
vem antes de `posts`, que é a ordem de que `posts_exemplo.sql` precisa. O SQL
foi preservado byte a byte: `fb50d8779a3708f8792ad92c13365368bc1cea43a770bbe70931e9af1dc5bd94`
antes e depois do rename.

## Achado 3 — as policies nunca executadas estão corretas

Primeira execução da suíte, com a tabela vazia: **2 falhas de 12**, ambas de
contagem (`have: 0, want: 7`). As dez asserções de segurança passaram.

Isso é verde vazio, e é o ponto mais importante deste relatório. Com a tabela
sem linhas, `anon não lê rascunho` passa por vacuidade — passaria igualmente com
a policy em `using (false)`.

Inserindo os quatro fixtures (publicado no passado, rascunho, arquivado,
publicado com data futura), `anon` viu **exatamente 1 linha**. Rascunho,
arquivado e agendado ficaram invisíveis. A policy existente está certa.

## Achado 4 — a suíte era cega à policy de leitura, e a contagem errada escondia isso

Policy de leitura sabotada em `using (false)` — `anon` não lê nada:

| Cenário                                  | Falhas                     |
| ---------------------------------------- | -------------------------- |
| policy sabotada, contagem `7` (original) | exatamente as **mesmas** 2 |
| policy sabotada, contagem `1`            | 2, com `have: 0  want: 1`  |
| policy correta, contagem `1`             | **0 — `Result: PASS`**     |

Enquanto a contagem estivesse errada, uma policy de leitura completamente
quebrada produzia saída **idêntica** à de uma policy boa. O conserto da contagem
não é cosmético: é o que dá dentes à suíte.

Isto é exatamente o que o AC-05 exige — "provar que remover a policy quebra a
teste" — e a auditoria mostra que a exigência **não era satisfeita** antes. Com
a contagem correta, passa a ser.

## Achado 5 — o comando de reset está certo

`pnpm supabase:reset --local` repassa a flag (`pnpm` a repassa para o script) e
`--local` é flag válida de `supabase db reset`. Nenhuma correção necessária.

## O que continua pendente

O AC-08 permanece **UNVERIFIABLE** no sentido de ainda não estar registrado como
PASS no relatório de `/check`. Aqui ele é **demonstrável** — o `Result: PASS`
acima é do stack com o rename — mas o pacote preparado por outra sessão ainda
precisa ser executado e registrado, porque inclui os 4 fixtures, as 15
asserções e o job de CI que eu não tenho.

Sobre os **29 testes** dos gates: eles validam os cenários dos gates
exercitados. Nada disso toca em banco. O que este relatório acrescenta é a
primeira cobertura real de RLS do repositório.

## Estado do clone depois desta verificação

Mantido, por ser fix verificado:

- rename da migration `init` → `20261003000000_profiles_foundation.sql`;
- `supabase/snippets/.gitkeep` e `supabase/functions/.gitkeep`.

Revertido, por serem rascunho de verificação e não entrega:

- os 4 fixtures que inseri no `seed.sql`;
- a correção da contagem `7` → `1` no teste.

Ou seja: o clone tem a **tarefa 0 pela metade** — o que a torna verificável, sem
o pacote que a conclude. `md-0002` continua `Proposed`.
