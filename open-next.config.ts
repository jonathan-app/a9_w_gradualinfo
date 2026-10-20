/**
 * @fileoverview Adaptação da saída do Next para o runtime Cloudflare Workers (OpenNext).
 * @module open-next.config
 * @description O `pnpm build` (opennextjs-cloudflare build) roda em duas etapas: (1) o build do
 *   Next, gerando a saída padrão; (2) a adaptação dessa saída para Workers. Este arquivo é o
 *   único ponto de contato entre as duas.
 * @dependencies @opennextjs/cloudflare (`defineCloudflareConfig`).
 *
 * `buildCommand` aponta a etapa 1 para `pnpm build:next`, e ele precisa ficar FORA de
 * `defineCloudflareConfig`: a função só repassa as chaves próprias da Cloudflare e descarta o
 * resto, então um `buildCommand` colocado dentro dela é ignorado em silêncio.
 *
 * Sem esta linha o OpenNext usa o padrão `pnpm build` — que aqui é o próprio OpenNext. O build
 * chama a si mesmo, recursivamente, até o sistema derrubar o processo por memória.
 *
 * Referência: https://opennext.js.org/cloudflare
 */
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

// A home é ISR de 300 s. Sem cache incremental o OpenNext re-renderiza a
// página a cada visita e os 42 ms de CPU estouram o teto de 10 ms do plano
// Free. O R2 não está habilitado na conta; KV atende com cerca de 576
// gravações/dia (ISR + lista), abaixo do limite gratuito de 1.000.
const config = {
  ...defineCloudflareConfig({ incrementalCache: kvIncrementalCache }),
  buildCommand: 'pnpm build:webpack',
};

export default config;
