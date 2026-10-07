/**
 * @fileoverview Arquivo vazio de propósito — os tokens do Tailwind vivem em CSS.
 * @module tailwind.config
 * @description O pipeline do Tailwind 4 usa `app/globals.css` (bloco `@theme`) via o plugin
 *   `@tailwindcss/postcss` registrado em `postcss.config.mjs`. Este arquivo existe porque
 *   ferramentas que procuram `tailwind.config.*` por automático quebram se não o encontrarem;
 *   mantê-lo sem conteúdo evita duplicar os tokens e criar duas fontes de verdade.
 * @dependencies `tailwindcss` apenas pelo tipo `Config`.
 */
import type { Config } from 'tailwindcss';

// Ferramentas que procuram este nome podem importá-lo. O pipeline do Tailwind
// usa app/globals.css; manter este arquivo vazio evita duplicar os tokens.
export default {} satisfies Config;
