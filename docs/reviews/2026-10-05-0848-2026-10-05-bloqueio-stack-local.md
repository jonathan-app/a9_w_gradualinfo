# Bloqueio do stack local do Supabase — 2026-10-05

Achado de verificação, antes de qualquer implementação de schema. A evidência
é de execução, não de leitura: os comandos abaixo foram rodados neste clone.

## Resumo

**`pnpm supabase:reset` falha, e por isso `pnpm supabase:test` nunca rodou.** As
12 asserções pgTAP em `supabase/tests/rls_posts_test.sql` são a **única**
cobertura de RLS do repositório, e nenhuma delas jamais foi executada. Não é um
teste vermelho: é um teste que nunca chegou a correr.

Isso também **invalida um número que eu reportei antes**. A auditoria
`2026-10-05-auditoria-estado-entrega.md` e a fila em `workflow/STATE.md`
afirmavam, ambas, que nada de produto foi entregue e que a única cobertura de
banco seria o que vier a ser escrito. A tabela `posts` e as policies já
existem em `main` desde 2026-10-04, com 12 asserções escritas e não executadas.
O número certo é pior que zero: é cobertura escrita que ninguém rodou, o que é
mais difícil de detectar do que ausência de cobertura.

## Cadeia causal

### 1. A migration `init` é pulada pelo próprio Supabase CLI

`supabase/migrations/00000000000000_init.sql` — saída de `pnpm supabase:start`:

```text
Skipping migration 00000000000000_init.sql... (replace "init" with a
different file name to apply this migration)
```

O nome `init` é reservado pela CLI: ele o trata como dump de schema inicial e
não o aplica. Esse arquivo cria `public.profiles` (linha 24), a função
`handle_new_user()`, o trigger `on_auth_user_created` e as policies de perfil.

Ou seja: **`profiles` nunca é criada**, e com ela o gatilho que cria perfil a
partir de um signup também nunca é instalado.

### 2. O seed depende de `profiles` e derruba o reset

`supabase/seed.sql` executa `update public.profiles set avatar_url = null where
id in (...)`, logo depois de inserir dois usuários em `auth.users`.

Resultado, na mesma execução:

```text
Applying migration 20261004000000_posts_exemplo.sql...
Seeding data from supabase/seed.sql...
Stopping containers...
failed to prune volumes
failed to send batch: ERROR: relation "public.profiles" does not exist (SQLSTATE 42P01)
[ELIFECYCLE] Command failed with exit code 1
```

O `db reset` termina com erro, então **não existe banco local**. O passo
seguinte confirma:

```text
$ pnpm supabase:test
failed to connect to postgres: failed to connect to
`host=127.0.0.1 user=postgres database=postgres`: dial error
(connect ECONNREFUSED 127.0.0.1:54322)
Make sure Docker is running, then run: supabase start
```

### 3. Mesmo com o seed consertado, a contagem do teste está errada

`supabase/tests/rls_posts_test.sql` afirma, na primeira asserção:

```sql
SELECT is(
  (SELECT count(*)::int FROM posts),
  7,
  'anon vê os 7 publicados com published_at no passado'
);
```

E `supabase/seed.sql` **não insere nenhum post** (`grep -in "posts"
supabase/seed.sql` não retorna nenhuma linha de inserção), e a migration
`20261004000000_posts_exemplo.sql` também não (`grep -ci "insert into"` → `0`).

Então `posts` nasce com **0 linhas**, e a asserção espera 7. Ela reprovaria no
primeiro `is()`. O `plan(12)` continuaria válido, mas a suíte ficaria vermelha
pelo motivo errado — o número foi escrito para um seed que não existe.

### 4. Nem `check:all` nem a CI pegariam isso

`package.json` linha 38:

```json
"check:all": "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:run"
```

`supabase:test` não está no encadeamento, e `.github/workflows/ci.yml` não tem
nenhum passo que mencione `supabase`. Os três jobs da CI são tipos/lint/
formatação/testes unitários, build, e segredos/dependências. **Um banco local
que não sobe não reprova nada em lugar nenhum.**

## O que já existe e está bom (e não deve ser refeito)

`supabase/migrations/20261004000000_posts_exemplo.sql` está correto em várias
coisas que valem preservar, e que eu tinha planejado refazer do zero:

- `posts_select_public` com
  `status = 'publicado' and published_at is not null and published_at <= now()`,
  que já trata **agendamento** corretamente: artigo com data futura existe e é
  invisível ao público.
- `is_post_public` como predicado `SECURITY DEFINER` com `set search_path = ''`,
  `revoke all ... from public` e `grant execute` explícito.
- trigger de `updated_at` em toda escrita.
- COMMENT em tabela, coluna e função, com a regra de visibilidade escrita em
  português no próprio catálogo.
- `status` com **três** valores: `rascunho`, `publicado`, `arquivado` — e
  asserção de que `anon` não lê `arquivado`.

## Consequência para a sequência de entrega

A sequência definida pelo dono em 2026-10-05 é schema e RLS → publicação mínima
→ home e artigo → testes → `/check verify`. O primeiro passo **não começa**
enquanto o stack local não subir, porque o AC de prova do schema é
`pnpm supabase:test` verde, e ele não pode rodar sem banco.

Isso transforma o passo 1 em: **consertar o stack local, verificar a suíte
existente, e só então transformar a tabela de exemplo no schema editorial.**
Consertar o stack é infraestrutura de verificação, não escopo novo.

## Correções necessárias, em ordem

1. Renomear `00000000000000_init.sql` para um nome com timestamp real, para a
   CLI aplicá-la. `profiles` e o trigger de signup passam a existir.
2. Corrigir a asserção de contagem do teste, ou semear os posts que ela espera.
   A decisão de onde os posts de teste moram é do dono: `seed.sql` é local e
   não pode vazar para produção; uma migration de conteúdo publicaria artigo
   fictício no deploy, o que é exatamente o que o dono pediu para evitar.
3. Rodar `pnpm supabase:test` e **registrar o resultado real**, inclusive se
   alguma das 12 asserções já escritas reprovar.
4. Incluir `supabase:test` em `check:all` ou em job próprio da CI, senão o
   próximo estrago de banco volta a ser invisível.

O item 2 é uma decisão de conteúdo, não minha: semear `anon@…` não, semear
artigos fictícios sim, mas em `seed.sql` e nunca em migration.

## Efeito sobre a afirmação "0 das 9 fatias entregues"

Continua em boa parte correta para as fatias de interface, e **passa a estar errada
para a fatia 1**: existe uma tabela `posts` com RLS, policies, função
`SECURITY DEFINER`, trigger e índices, escrita em 2026-10-04 e nunca testada.
O que falta para a fatia 1 é a **transformação** dessa tabela de exemplo no
schema editorial — o que o scope já previa: "Migration que transforma `posts`
no schema editorial real".
