/**
 * @fileoverview Reexporta a configuração canônica do Vitest (`vitest.config.mts`).
 * @module vitest.config
 * @description Mantém um único arquivo canônico para evitar divergência entre os dois nomes:
 *   quem procura `vitest.config.ts` (IDE, ferramentas que resolvem `.ts` primeiro) e quem
 *   carrega `vitest.config.mts` enxergam a mesma config. O `.mts` é a configuração real —
 *   include, jsdom, setupFiles, aliases e piso de cobertura; este só reexporta o default.
 * @dependencies ./vitest.config.mts (o specifier `./vitest.config.mjs` resolve para o `.mts`
 *   pela resolução de módulos do TypeScript em `moduleResolution: bundler`).
 */
export { default } from './vitest.config.mjs';
