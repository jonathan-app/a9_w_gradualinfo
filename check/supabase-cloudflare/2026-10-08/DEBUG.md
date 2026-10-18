# Diagnóstico de Supabase, Cloudflare e proteção de rotas

## Causas comprovadas

1. Os três arquivos locais de ambiente disponíveis apontam para `http://127.0.0.1:54321`. Esse endereço não identifica um Supabase remoto. Não há projeto remoto vinculado em `supabase/.temp`.
2. `wrangler.jsonc` aponta a origem do site para `https://gradualinfo.pages.dev`, diferente do Worker publicado registrado no STATE. As variáveis públicas são incorporadas no build, portanto só mudar bindings não corrige o bundle.
3. O matcher do proxy exclui `/artigos/rascunho.png`, `/preview/foo.txt` e `/api/preview/foo.xml`. Comprovado com `unstable_doesMiddlewareMatch` do Next instalado. A proteção na camada de dados continua existindo, mas a interceptação anterior ao streaming não roda nesses caminhos.
4. Copiar os headers de `NextResponse.next()` para `NextResponse.rewrite()` produz simultaneamente `x-middleware-next: 1` e `x-middleware-rewrite`. Comprovado com as classes reais do Next. A resposta de bloqueio deve emitir apenas o rewrite e preservar os cookies renovados.

## Correção prescrita para /develop

Adicionar matchers explícitos para artigos e preview. Criar a resposta 404 com a requisição atualizada, cache privado e cookies copiados, sem copiar o header de continuidade. Alinhar a origem temporária ao Worker existente e preservar variáveis configuradas remotamente com `keep_vars`.

## Conexão pendente

É necessário identificar o Supabase remoto e fornecer URL, chave pública e configurações privadas de preview por arquivo local ignorado ou pelo painel Cloudflare. Nunca copiar a chave de serviço para o cliente. Não publicar um build com Supabase local. Não aplicar migrations em um projeto não identificado.

## Regressão para verificação

Confirmar que caminhos de artigo e preview com extensão passam pelo proxy, assets continuam excluídos, artigos não autorizados retornam 404 sem `x-middleware-next`, cookies renovados são preservados e falhas de banco seguem para o estado de erro existente.
