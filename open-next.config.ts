import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * open-next.config.ts
 *
 * O `pnpm build` (opennextjs-cloudflare build) roda em duas etapas:
 *   1. o build do Next, gerando a saída padrão;
 *   2. a adaptação dessa saída para o runtime de Cloudflare Workers.
 *
 * `buildCommand` aponta a etapa 1 para `pnpm build:next`, e ele precisa ficar
 * FORA de `defineCloudflareConfig`: a função só repassa as chaves próprias da
 * Cloudflare e descarta o resto, então um `buildCommand` colocado dentro dela
 * é ignorado em silêncio.
 *
 * Sem esta linha o OpenNext usa o padrão `pnpm build` — que aqui é o próprio
 * OpenNext. O build chama a si mesmo, recursivamente, até o sistema derrubar o
 * processo por memória.
 *
 * Referência: https://opennext.js.org/cloudflare
 */
const config = {
  ...defineCloudflareConfig(),
  buildCommand: 'pnpm build:next',
};

export default config;
