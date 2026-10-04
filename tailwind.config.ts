import type { Config } from 'tailwindcss';

// Ferramentas que procuram este nome podem importá-lo. O pipeline do Tailwind
// usa app/globals.css; manter este arquivo vazio evita duplicar os tokens.
export default {} satisfies Config;
