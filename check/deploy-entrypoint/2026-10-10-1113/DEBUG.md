# Falha de empacotamento do Worker no build remoto

## Atualização com log remoto das 11:37 a 11:38 UTC

O novo log fornecido pelo usuário mostra que Next e OpenNext concluíram, o Wrangler empacotou o Worker sem os quatro erros de import, enviou os arquivos e concluiu o deploy às 11:38:47Z. A versão informada é `b04f70c0-1f16-49fc-96c3-d0aa6139f9f9`. Isso prova que a tentativa remota atual passou do bloqueio do entrypoint. O log não inclui o SHA do commit clonado nem mostra o conteúdo de `scripts/cloudflare-worker.ts`; a presença exata dos quatro caminhos `../` no commit remoto não pode ser afirmada apenas por ele.

O log ainda traz avisos de que `PreviewSessionDO` e `AdminRateLimitDO` não foram encontrados como exports no Worker analisado em uma etapa do adaptador. Mais tarde, o Wrangler lista os dois bindings e conclui o upload. Esses fatos não provam que as classes funcionam em requisições reais. É necessária verificação funcional isolada e correlacionada à nova versão.

Este deploy foi realizado pela execução remota mostrada no anexo, não por esta investigação. O erro `preview-props.json` está confirmado somente para a versão anterior `bf9f208b-2753-4530-aaf8-cd2014405f30`. O comportamento da versão `b04f70c0-1f16-49fc-96c3-d0aa6139f9f9` nas rotas públicas e administrativas ainda não foi observado aqui.

## Causa confirmada

O log fornecido pelo usuário mostra que o build Next 16.4.0 e OpenNext terminou com sucesso às 11:09:25Z. O comando `npx wrangler deploy` falhou às 11:09:36Z ao resolver quatro imports com prefixo `./` em `scripts/cloudflare-worker.ts`. Como o arquivo fica em `scripts/`, esses caminhos apontam para `scripts/.open-next/` e `scripts/lib/`, que não existem. Os arquivos reais estão na raiz: `.open-next/worker.js`, `lib/admin/access-worker.ts`, `lib/preview/durable-object.ts` e `lib/admin/rate-limit-do.ts`.

`wrangler.jsonc` declara `main: scripts/cloudflare-worker.ts`. A árvore local já tem uma edição não commitada que troca os quatro caminhos para `../`. Essa edição pertence a outra sessão e foi preservada. Os dois exports de Durable Object continuam presentes no entrypoint.

## Validação local

Com a edição local atual, `./node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/gradualinfo-dry-run-1109` terminou com exit 0. O Wrangler empacotou o Worker e listou os bindings `PREVIEW_SESSION_DO` e `ADMIN_RATE_LIMIT_DO`, sem erros de resolução ou aviso de classes ausentes. O aviso `EROFS` apareceu apenas ao tentar gravar o log do Wrangler fora do workspace; não impediu o dry-run.

O comando `pnpm exec wrangler deploy --dry-run` não produziu saída em 90 segundos e foi interrompido. Não se usa essa tentativa como prova de sucesso ou falha do bundle.

## Limites e encaminhamento

### Tentativa de build sequencial na mesma árvore

Em nova rodada, o commit local era `307141daa8ab8bc059cf3e6fa9893949bf0f541f`, com `scripts/cloudflare-worker.ts` ainda modificado fora do commit. Foram registrados os hashes dos arquivos de configuração e do entrypoint antes do build. O comando direto `./node_modules/.bin/opennextjs-cloudflare build` terminou com exit 1 antes de compilar o Next: o `buildCommand` chamou `pnpm build:next`, e o pnpm recusou iniciar porque não conseguiu verificar a assinatura do gerenciador no registro npm a partir do sandbox (`ERR_PNPM_PNPM_ENGINE_IDENTITY_UNVERIFIABLE`). A solicitação de execução ampliada não retornou e foi encerrada sem executar o build. Portanto, não há build OpenNext fresco nem dry-run ligado a ele nesta rodada. O dry-run anterior continua válido apenas para o bundle que já existia localmente.

Nenhuma alteração de código foi feita nesta rodada. Não declarar esta árvore ou o build remoto aprovado com base nessa tentativa.

O aviso sobre classes Durable Object no log remoto acompanha a falha de resolução do entrypoint. O dry-run local com os caminhos corrigidos reconheceu ambas as classes. Não há evidência de um segundo erro independente de exports neste momento.

O deploy remoto falho não substituiu, por si, a versão publicada. O erro publicado de `preview-props.json` está documentado separadamente em `check/public-home/2026-10-10-0701/DEBUG.md`. Os 503 da home e do painel continuam sem causa confirmada.

Para `/develop`, preservar a correção `../` já presente na árvore local e garantir que ela entre na revisão do código que o build remoto receberá. Para `/check`, validar o mesmo commit com build OpenNext e dry-run em ambiente isolado, depois conferir o pacote gerado. Nenhum push, merge ou deploy foi feito nesta investigação.

## Atualização pós-deploy bem-sucedido (2026-10-10 11:40 UTC)

O deploy remoto às 11:38:47Z publicou a versão `b04f70c0-1f16-49fc-96c3-d0aa6139f9f9` com sucesso: build Next e OpenNext concluídos, assets enviados, bindings listados e triggers publicados. O entrypoint com a correção `../` entrou no bundle. Portanto o bloqueio de importação documentado acima **está resolvido** na versão nova.

Mesmo assim, `/api/health`, `/robots.txt` e `/` continuam devolvendo HTTP 500 na versão nova, com `error code: 1101` e corpo `Unexpected loadManifest(/.next/server/preview-props.json) call!`. A causa é um segundo defeito, independente do entrypoint, e está documentada em `check/public-home/2026-10-10-0701/DEBUG.md` (seção "Causa raiz confirmada e correção aplicada").

**Resumo:** o pipeline de deploy funciona; o app ainda não funciona porque o adaptador OpenNext 1.20.9 não inlina `preview-props.json`. A correção é `pnpm patch @opennextjs/cloudflare@1.20.9` adicionando `preview-props` ao glob em `dist/cli/build/patches/plugins/load-manifest.js`, já gravada em `pnpm-lock.yaml` (patchedDependencies) e verificada localmente com `wrangler dev` (health 200, home 200, artigo 404). Reenviar o build remoto com o patch exige autorização separada.
