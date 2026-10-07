/**
 * @fileoverview Mantém o cabeçalho de `.gitattributes` sincronizado com o nome
 *   real do projeto, lido do `package.json`.
 * @module scripts/sync-gitattributes
 * @description Só as linhas `# .gitattributes — ...` são reescritas aqui; o corpo
 *   do arquivo é fonte humana e nunca é tocado. Rodar sempre que o nome do projeto
 *   mudar, senão o export do template volta a falhar em silêncio.
 * @dependencies node:fs, node:path, node:url; `package.json`, `.gitattributes`.
 *
 * Execução: `pnpm gitattributes:sync`.
 */
// scripts/sync-gitattributes.mjs
//
// Mantém o cabeçalho de `.gitattributes` com o nome real do projeto. O corpo
// do arquivo é fonte humana; só as linhas `# .gitattributes — ...` são
// reescritas aqui, a partir de `package.json`. Rodar sempre que o nome mudar:
//   pnpm gitattributes:sync

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const file = join(root, '.gitattributes');
const content = readFileSync(file, 'utf8');

const updated = content.replace(
  /^# \.gitattributes — .+$/m,
  `# .gitattributes — ${pkg.name}`,
);

if (updated !== content) {
  writeFileSync(file, updated);
  console.log(`.gitattributes: nome do projeto atualizado para "${pkg.name}"`);
} else {
  console.log(`.gitattributes: já em sincronia ("${pkg.name}")`);
}
