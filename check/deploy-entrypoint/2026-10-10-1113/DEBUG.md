# Falha de empacotamento do Worker no build remoto

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
