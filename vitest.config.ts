/**
 * vitest.config.ts — reexporta a configuração principal (.mts)
 *
 * Mantém um único arquivo canônico para evitar divergência entre os dois nomes.
 * O arquivo .mts é a configuração real; este só reexporta.
 */
export { default } from './vitest.config.mjs';
