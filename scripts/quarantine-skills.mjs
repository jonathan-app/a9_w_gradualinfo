#!/usr/bin/env node
/**
 * @fileoverview Quarentena reversível das skills extras de `.agents/skills`.
 * @module scripts/quarantine-skills
 * @description Move para `.agents/quarantine-skills/2026-10-07` cada pasta de
 *   `.agents/skills` que não esteja na allowlist — mas só depois de provar, por hash de
 *   conteúdo, que ela é exatamente a da baseline em `security/skills-quarantine.json`.
 *   Mover e não apagar: o catálogo volta a ficar limpo sem perder instalações locais, e o
 *   `MANIFEST.json` gravado no destino registra o que saiu e com qual hash, para reversão.
 * @dependencies node:fs (readdir/rename/lstat/write), node:path, ./check-skills.mjs
 *   (`contentHash`), `security/skills-quarantine.json` (baseline de 81 hashes),
 *   `security/skills-allowlist.json`.
 *
 * Quando executado: manualmente, sob autorização — exige escrita na pasta protegida `.agents`
 *   e por isso não roda nem no hook de commit nem na CI.
 * Lê: allowlist, baseline e o conteúdo atual de cada pasta extra.
 * Escreve: move pastas para `.agents/quarantine-skills/2026-10-07/` e grava `MANIFEST.json`
 *   nesse destino; nada fora dele é alterado.
 * Códigos de saída: 0 = nada para mover ou quarentena concluída; 1 = extra sem baseline
 *   íntegra, destino já ocupado ou falha na movida (com rollback).
 */
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
// Destino com data gravada no nome: o lote de uma revisão fica identificável no disco, e o
// `existsSync` logo abaixo acusa colisão quando uma skill já tinha saído numa rodada anterior.
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
// Toda a validação acontece ANTES da primeira renomeação: o loop de movida é infalível por
// construção (só `renameSync` de caminho validado), então um problema detectável nunca
// deixa a operação parcial — a única fonte de meio-estado é uma falha de SO durante a
// movida, e essa é a que o rollback cobre.
for (const name of extras) {
  // Quatro travas juntas: hash conhecido da baseline (nunca observado = não movível), nome
  // que não escapa de `skills` (defesa contra traversal), não-symlink (renomear o link
  // moveria o link, deixando o conteúdo real e o hash do manifesto a mentir) e conteúdo
  // igual ao registrado — alteração desde a baseline precisa aparecer na revisão, não sumir
  // dentro da pasta de quarentena.
  if (
    !baseline.skills[name] ||
    resolve(active, name) !== join(active, name) ||
    lstatSync(join(active, name)).isSymbolicLink() ||
    contentHash(join(active, name)) !== baseline.skills[name]
  )
    throw new Error(`Extra sem baseline íntegra: ${name}`);
  // Skill já ocupando o destino (lote anterior com o mesmo nome): o `renameSync` esbarraria
  // em ENOTEMPTY do sistema operacional, que não diz qual pasta colidiu — recusar antes
  // aponta a skill pelo nome.
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
  // O MANIFEST fica DENTRO do try de propósito: sem ele a quarentena não tem como ser
  // desfeita, então se a gravação falhar tudo volta para `skills`. `hashes` copia a baseline
  // observada — registra o conteúdo que saiu, sem atestar de onde veio.
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
  // Rollback na ordem inversa da movida e com o erro original re-lançado: a reversão é
  // best-effort, mas quem precisa ler o motivo da falha é o chamador, não o rollback.
  for (const name of moved.reverse())
    renameSync(join(destination, name), join(active, name));
  throw error;
}
console.log(`${moved.length} extras preservados em ${destination}.`);
