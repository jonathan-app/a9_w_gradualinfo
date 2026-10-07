#!/usr/bin/env node
// Preserva conteúdo fora do catálogo ativo sem apagar instalações locais.
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  renameSync,
  lstatSync,
  existsSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { contentHash } from './check-skills.mjs';
const root = process.cwd();
const active = join(root, '.agents/skills');
const destination = join(root, '.agents/quarantine-skills/2026-10-07');
const baseline = JSON.parse(
  readFileSync(join(root, 'security/skills-quarantine.json'), 'utf8'),
);
const allow = JSON.parse(
  readFileSync(join(root, 'security/skills-allowlist.json'), 'utf8'),
);
const extras = readdirSync(active).filter((name) => !allow.skills[name]);
if (!extras.length) {
  console.log('Nenhum extra ativo.');
  process.exit(0);
}
for (const name of extras) {
  if (
    !baseline.skills[name] ||
    resolve(active, name) !== join(active, name) ||
    lstatSync(join(active, name)).isSymbolicLink() ||
    contentHash(join(active, name)) !== baseline.skills[name]
  )
    throw new Error(`Extra sem baseline íntegra: ${name}`);
  if (existsSync(join(destination, name)))
    throw new Error(`Destino já existe: ${name}`);
}
mkdirSync(destination, { recursive: true });
const moved = [];
try {
  for (const name of extras) {
    renameSync(join(active, name), join(destination, name));
    moved.push(name);
  }
  writeFileSync(
    join(destination, 'MANIFEST.json'),
    JSON.stringify(
      {
        source: active,
        moved,
        algorithm: 'sha256-path-content-v1',
        hashes: baseline.skills,
      },
      null,
      2,
    ),
  );
} catch (error) {
  for (const name of moved.reverse())
    renameSync(join(destination, name), join(active, name));
  throw error;
}
console.log(`${moved.length} extras preservados em ${destination}.`);
