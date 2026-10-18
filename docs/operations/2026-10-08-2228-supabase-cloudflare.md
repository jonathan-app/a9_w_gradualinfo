# Conectar Supabase e Cloudflare

## Estado em 2026-10-08

Correções locais no proxy e no Wrangler estão prontas. Não foram publicadas. O ambiente disponível usa Supabase local, que não pode ser acessado pelo Worker. O domínio de produção é **https://gradualinfo.com.br** (apex), com redirecionamento de `www.gradualinfo.com.br` e HTTP para o apex HTTPS. A URL temporária `https://gradualinfo-editorial.a3qua96.workers.dev` permanece como fallback até confirmação de ativação do domínio próprio.

Atualização: o dono identificou o projeto remoto `sjngngsjvotagwctzpde`. `.env.production.local` foi criado com sua URL e a chave publicável já disponível em `.env.local`, sob o nome que o app lê (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). O ambiente local foi preservado. Preview de produção foi explicitamente desativado para não herdar credenciais locais. A URL remota também está em `wrangler.jsonc`; a chave ainda precisa ser configurada no Worker. Conexão, schema e RLS remotos ainda não foram comprovados, pois a consulta no sandbox falhou com `EAI_AGAIN`.

## Configuração necessária

Preencha `.env.production.local`, ignorado pelo Git, com os valores do projeto remoto:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://gradualinfo.com.br
SUPABASE_PREVIEW_TOKEN=
SUPABASE_PREVIEW_PASSWORD=
SUPABASE_PREVIEW_EMAIL=
SUPABASE_PREVIEW_USER_ID=
```

O token de preview precisa ter pelo menos 32 bytes e ser diferente da senha. A conta indicada pelo UUID deve existir no Supabase remoto e possuir `app_metadata.preview=true`. `user_metadata` não concede essa permissão.

As variáveis `NEXT_PUBLIC_*` devem existir no build e no runtime. As configurações privadas `SUPABASE_PREVIEW_*` devem ser secrets do Worker. Nunca enviar valores privados pelo chat nem usar a chave `service_role` como chave pública. O portal consulta posts com a chave pública e RLS, sem precisar da chave de serviço no Worker.

O Next incorpora variáveis públicas ao bundle. Alterar somente os bindings do Worker não corrige um bundle compilado com URL local. O arquivo `.env.production.local` tem prioridade sobre `.env.local` durante o build de produção.

Referências: [variáveis no OpenNext](https://opennext.js.org/cloudflare/howtos/env-vars) e [sessão SSR no Supabase](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

## Sequência para concluir

1. Identificar o projeto remoto e conferir suas migrations e policies antes de aplicar qualquer alteração no banco.
2. Confirmar a URL do site. Alinhar `NEXT_PUBLIC_SITE_URL` no build e no Wrangler. Conferir Site URL no Supabase e cadastrar somente os redirects de autenticação realmente usados.
3. Verificar Auth e leitura pública de `posts` no projeto identificado. Confirmar que leitura anônima de rascunhos e todas as escritas públicas são negadas pela RLS.
4. Configurar secrets com o painel Cloudflare ou `wrangler secret put`, sem incluir valores nos argumentos do terminal. Não transferir credenciais locais de teste para produção.
5. Rodar `pnpm check:all`, `pnpm build` e `/check` para validar e revisar o resultado. Publicar somente após as validações necessárias e com acesso autorizado.
6. No Worker publicado, verificar home, artigo publicado, 404 de rascunho anônimo, entrada por POST, rejeição de origem externa, cookies seguros, prazo de preview e logout. Não considerar conexão concluída sem essa prova remota.
