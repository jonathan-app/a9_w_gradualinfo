# Investigação da home pública

## Diagnóstico atualizado com logs da versão publicada

Uma execução remota posterior publicou a versão `b04f70c0-1f16-49fc-96c3-d0aa6139f9f9` às 11:38:47Z, conforme log fornecido pelo usuário. O diagnóstico abaixo se refere à versão anterior `bf9f208b-2753-4530-aaf8-cd2014405f30`. Ainda não há resposta ou stack trace da versão nova para as rotas investigadas.

**Causa confirmada do HTTP 500 de `/api/health` às 10:15:47.896Z:** a versão `bf9f208b-2753-4530-aaf8-cd2014405f30` lança `Unexpected loadManifest(/.next/server/preview-props.json) call!` enquanto constrói `NextNodeServer`. O stack passa por `loadManifest`, `NextNodeServer.getPreviewProps`, `new Server`, `new NextNodeServer` e `.open-next/server-functions/default/handler.mjs`. A inicialização falha antes de executar o código da rota de saúde. A requisição registrada foi **HEAD**, não GET.

O mesmo erro ocorreu em `GET /robots.txt` às 10:55:29.525Z, na mesma versão, também com HTTP 500. Isso confirma que a falha não é exclusiva de `/api/health`. Os registros de `HEAD /` e `HEAD /admin-dashboard` às 10:15:47Z e 10:15:48Z tiveram HTTP 503 e `outcome=ok`; o anexo não traz a causa interna desses 503.

A saída OpenNext local atual contém o mesmo ramo `Unexpected loadManifest(...)`, sem caso para `preview-props.json`, embora o arquivo exista em `.next/server/` e na cópia de `.open-next/server-functions/default/.next/server/`. Isso localiza o defeito no carregador de manifestos gerado para o Worker, não na presença física do JSON. A saída local pode ter sido reconstruída após a implantação; não foi provado que seus bytes são idênticos aos da versão publicada.

**Correção prescrita para `/develop`:** fazer o adaptador OpenNext incluir o manifesto de preview no carregador do bundle da versão em uso, por ajuste compatível de dependência ou do processo de build, e gerar um bundle novo em ambiente isolado. Não copiar um JSON para o Worker como paliativo, pois o carregador rejeita o caminho antes de abrir o arquivo. A escolha exata do ajuste depende de reproduzir o build da versão publicada e conferir o contrato do adaptador. Não publicar esse bundle sem os portões do projeto e autorização separada.

**Regressão para `/test` e `/check`:** iniciar o Worker gerado em `workerd` com a data e flags do projeto; exigir que `HEAD /api/health` e `GET /robots.txt` não lancem `Unexpected loadManifest`, e validar os códigos e corpos esperados. Depois exercitar `GET /`, `GET /api/health` e a rota administrativa de forma independente. O defeito local do timer em `hono-rate-limiter` pode surgir após destravar a inicialização do Next; ele precisa de teste próprio, mas não explica este stack publicado.

O anexo original tem seis eventos. Esta síntese omite cabeçalhos, identificadores de requisição, conta e dados pessoais. Não houve alteração de produção.

## Registro anterior à chegada dos logs

## Estado

**Respostas registradas por outra sessão, sem captura bruta anexada a este relatório:** a home `/` respondeu **503**, `/api/health` respondeu **500** e `/admin-dashboard` respondeu 503 com `Retry-After: 5`. Não se confirmou a versão publicada nem o stack trace da requisição.

| Rota               | Status | Observação                                                                                |
| ------------------ | ------ | ----------------------------------------------------------------------------------------- |
| `/`                | 503    | Compatível com a resposta de indisponibilidade da Spec 0006; causa remota ainda sem prova |
| `/api/health`      | 500    | Falha registrada; causa ainda sem prova                                                   |
| `/admin-dashboard` | 503    | Compatível com falha fechada do guard; bindings remotos desconhecidos                     |

## Evidência local

- `lib/admin/access-worker.ts` classifica `/` como pública e despacha sem ler os quatro `ADMIN_ACCESS_*`.
- `lib/env.ts` usa uma chave Supabase substituta se `NEXT_PUBLIC_SUPABASE_ANON_KEY` faltar.
- `app/page.tsx` ainda cria um cliente Supabase antes da consulta editorial.
- `lib/services/posts.ts` usa Sanity quando `SANITY_PROJECT_ID` está presente; nessa condição a consulta da home não usa a chave Supabase.
- A home captura `ContentUnavailableError`; o proxy também tem sonda que responde 503 sob falha conhecida do Sanity, conforme a verificação da spec 0006 em `docs/reviews/2026-10-10-0646-0006-transicao-editorial-sanity.md`.
- `wrangler.jsonc` não declara a chave Supabase, mas `keep_vars: true` permite variáveis remotas fora do arquivo. Sua ausência remota não pode ser inferida daí.

## Análise de caminhos de falha

### Home `/` → 503 registrado, caminho não confirmado

O proxy executa `updateSession` para `/`. Se `isSanityConfigured` for verdadeiro, chama `probeSanityAvailability()` com timeout de 800 ms.

- A sonda lança `ContentUnavailableError` → retorna 503 com `private, no-store` (Spec 0006 AC-06).
- Headers da resposta confirmam: `cache-control: private, no-store`, `x-robots-tag: noindex, nofollow`, corpo HTML "Serviço temporariamente indisponível".

**Conclusão:** o status, os headers e o corpo descritos são compatíveis com o tratamento previsto na Spec 0006. Sem log e identificação da versão publicada, não é possível afirmar por que a sonda falhou ou se o Sanity remoto está configurado.

### `/api/health` → 500 registrado

Rota em `app/api/health/route.ts` usa Hono com `hono-rate-limiter`. O rate limiter lê IP dos headers `cf-connecting-ip` ou `x-forwarded-for`.

O proxy **exclui** `/api/health` do matcher (`proxy.ts:60`), então o middleware não roda nessa rota.

Os headers registrados (`content-type: text/plain; charset=UTF-8`, `content-length: 17`) são compatíveis com uma resposta genérica de erro. Eles não identificam a exceção.

### `/admin-dashboard` → 503 registrado

O 503 com `Retry-After: 5` é compatível com a falha fechada de `guardAdminAccess`. Não comprova, sozinho, que os quatro `ADMIN_ACCESS_*` estejam ausentes no Worker remoto.

## Lacunas de configuração entre local e remoto

| Variável                                              | `wrangler.jsonc` (local) | Remoto (desconhecido) |
| ----------------------------------------------------- | ------------------------ | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                            | presente                 | desconhecido          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                       | **ausente**              | desconhecido          |
| `SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_PROJECT_ID` | **ausente**              | desconhecido          |
| `SANITY_DATASET` / `NEXT_PUBLIC_SANITY_DATASET`       | `production`             | desconhecido          |
| `SANITY_API_READ_TOKEN`                               | **ausente**              | desconhecido          |
| `ADMIN_ACCESS_*` (4 campos)                           | **ausentes**             | desconhecido          |

## Captura do painel Cloudflare enviada pelo usuário

A imagem mostra a aba de configurações do Worker `gradualinfo` em Produção. A tabela visível contém três variáveis em tempo de execução, cujos nomes aparecem truncados: uma variável de dataset Sanity, uma de URL do site e uma de URL Supabase. Não há uma linha visível para a chave anônima Supabase, o ID de projeto Sanity ou os quatro `ADMIN_ACCESS_*`. Isso descreve a tabela da captura, não os valores usados no bundle de uma implantação anterior.

A imagem também mostra os bindings `ADMIN_RATE_LIMIT_DO` e `PREVIEW_SESSION_DO`, logs do Worker ativados, data de compatibilidade `2026-01-01` e os flags `nodejs_compat` e `global_fetch_strictly_public`. O painel informa que a última build falhou. Nesta captura de Configurações não aparecem Version ID, horário da implantação ativa ou stack trace.

Há uma tensão a verificar: o 503 da home foi atribuído em outra sessão à sonda do Sanity, mas a captura não mostra um ID de projeto Sanity entre as variáveis em tempo de execução. O ID pode estar embutido no bundle ou a versão publicada pode seguir outro caminho. O Version ID e o stack trace continuam necessários antes de escolher uma explicação.

## Captura da aba Implantações enviada pelo usuário

A versão ativa aparece com o prefixo de ID `bf9f208b` e recebe 100% do tráfego. A linha mostra implantação manual aproximadamente uma hora antes da captura. Uma build mais recente do ramo `main` aparece como falha aproximadamente 47 minutos antes da captura. Assim, a build que falhou não substituiu a versão ativa. O painel mostra taxa de erro de 76,5% para a versão ativa, sem discriminar rotas ou exceções.

O prefixo não é o Version ID completo, e os horários relativos não permitem afirmar qual versão atendeu à requisição das 10:15:47Z sem o horário absoluto da captura ou os detalhes da implantação. Ainda não há stack trace. A versão ativa pode ter origem distinta do commit local `307141d`; não atribuir o defeito local ao Worker publicado com base apenas nessa tela.

## Defeito local confirmado, vínculo remoto pendente

**Defeito do código local:** a rota chama `rateLimiter(...)` no escopo do módulo. Na versão instalada `hono-rate-limiter@0.5.4`, essa chamada cria `MemoryStore`, executa `initStore` e inicia `setInterval` imediatamente. O `workerd` rejeita esse timer no escopo global. Ainda não se sabe se o Worker publicado contém esse código, então a causa da resposta 500 publicada segue sem confirmação.

Um experimento Node externo ao app substituiu temporariamente `setInterval` por uma função que lança `TIMER_AT_INIT` e chamou `rateLimiter` com as mesmas opções essenciais da rota. A chamada lançou `TIMER_AT_INIT` imediatamente, antes de receber qualquer requisição. Isso confirma a ordem de execução da biblioteca instalada, mas não reproduz o erro do Worker publicado.

No controle sem restrição de timer, um app Hono mínimo com as opções essenciais da rota respondeu `200` e `{"status":"ok"}` a `app.fetch` em Node. Isso mostra que a configuração básica funciona nesse runtime e concentra o teste seguinte na diferença do Worker e do bundle publicado.

Um teste isolado em `/tmp`, com `workerd@1.20261006.1`, `compatibilityDate=2026-01-01` e `nodejs_compat`, carregou a versão instalada de `hono-rate-limiter` empacotada pelo esbuild. `workerd test` terminou com exit 1 e a mensagem `Disallowed operation called within global scope`. O stack trace passou por `init`, `initStore`, `honoRateLimiter` e `rateLimiter`. Isso reproduz o defeito no runtime compatível com a configuração local, sem editar o aplicativo ou consultar a rede.

O experimento decisivo para a ocorrência publicada agora é identificar o Version ID ativo e o stack trace do 500 às 10:15:47Z. Se a versão contém esta rota e o stack trace aponta para esse caminho, a causa remota está confirmada. Se apontar para outra etapa, investigar a etapa observada.

**Teste local de limite da hipótese Supabase:** com `isSupabaseConfigured=false`, `createClient(env.supabase.url, env.supabase.anonKey)` construiu o cliente sem erro e sem consulta de rede. Isso elimina a criação do cliente como causa suficiente do erro neste código local. Não demonstra qual chave existe na implantação publicada.

A tentativa de consultar `http://127.0.0.1:3000/api/health` falhou ao abrir o socket por restrição do sandbox. Não há resultado HTTP local desta rodada.

Fontes: código instalado em `node_modules/.pnpm/hono-rate-limiter@0.5.4_hono@4.13.13/node_modules/hono-rate-limiter/dist/index.js` e [documentação da Cloudflare sobre operações no escopo global](https://developers.cloudflare.com/hyperdrive/observability/troubleshooting/).

## Experimento pendente (evidência necessária)

Para vincular o defeito local ao 500 publicado, preciso somente de:

1. **Version ID** da implantação que atendeu a requisição.
2. **Stack trace sanitizado** do Worker para `/api/health` às 10:15:47Z. Remover tokens, cookies, credenciais e dados pessoais.

## Próximos passos

1. Obter a evidência acima e confirmar se o erro publicado é o mesmo reproduzido em `workerd`.
2. Se confirmado, passar a `/develop` a correção da inicialização do limitador no escopo global, preservando o contrato de limite da rota.
3. Passar a `/test` o cenário de regressão: carregar a rota em `workerd` com a mesma data de compatibilidade, chamar `/api/health`, exigir 200 e JSON `status=ok`, sem erro de timer no escopo global.
4. Verificar as três rotas após a correção.

## Causa raiz confirmada e correção aplicada (2026-10-10 11:40 UTC)

A versão publicada `b04f70c0-1f16-49fc-96c3-d0aa6139f9f9`, subiu às 11:38:47Z, ainda responde HTTP 500 em `/api/health`, `/robots.txt` e `/`. O `curl` direto retornou `error code: 1101` e corpo `Unexpected loadManifest(/.next/server/preview-props.json) call!` — o mesmo stack da versão anterior, portanto o deploy remoto não resolveu o problema.

**Reprodução local:** `pnpm build` + `npx wrangler dev --port 8799` na mesma árvore, com a mesma data de compatibilidade e flags, devolveu o mesmo erro em `/api/health` e `/`. Isso localiza o defeito no adaptador, não em configuração remota.

**Causa raiz:** o adaptador `@opennextjs/cloudflare` inlina `loadManifest()` no bundle em tempo de build para evitar `readFileSync`, que não funciona em `workerd`. O glob que coleta os manifests é `**/{*-manifest,required-server-files,prefetch-hints}.json`. O arquivo `preview-props.json` não termina em `-manifest`, então nunca é coletado, e a função joga `throw new Error('Unexpected loadManifest(...) call!')`. O Next.js 16.4 moveu os dados de draft mode para esse arquivo e chama `getPreviewProps()` de forma incondicionada na construção de `NextNodeServer`, antes de qualquer rota. A inicialização do Worker fracassa em toda requisição.

**Correção aplicada:** `pnpm patch @opennextjs/cloudflare@1.20.9` em `dist/cli/build/patches/plugins/load-manifest.js`, adicionando `preview-props` à alternância do glob, exatamente o que o upstream faz no PR #1356 (ainda não lançado; 1.20.10 não inclui). A changeset do upstream confirma que é o único caminho certo — o `return {}` do PR #1151 não serve, porque o arquivo é opcional e carrega as chaves de draft mode.

**Verificação pós-correção (mesmo ambiente local):**

- `HEAD /api/health` → 200, `{"status":"ok","runtime":"cloudflare-workers","timestamp":...}`.
- `GET /` → 200, página inicial com `link rel=canonical href="https://gradualinfo.com.br"`.
- `GET /artigos/guia-notebook` → 404, rota dinâmica já responde (nenhum artigo publicado, comportamento esperado).
- `pnpm check:all` → typecheck, lint, prettier e 463/463 testes PASS.

**Limites:** a correção está em `pnpm-lock.yaml` (patchedDependencies) e no repositório local; o build remoto que publicou `b04f70c0` não a continha. Reenviar o build com o patch exige autorização separada. O timer global do `hono-rate-limiter` em `app/api/health/route.ts` permanece defeito local separado, documentado acima, e não explica este stack.

## Validador administrativo

`scripts/validate-admin-access.mjs` importa a função real `readAdminAccessConfig` e lê os quatro campos do ambiente do processo. Não escreve no Worker nem mostra valores. Invocação: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/validate-admin-access.mjs` após definir os quatro valores no próprio terminal. Testado com campos ausentes e valores fictícios válidos; Prettier passou.
