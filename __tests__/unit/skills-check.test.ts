// @vitest-environment node
/**
 * @fileoverview Suíte do verificador de skills (`scripts/check-skills.mjs`).
 * @module __tests__/unit/skills-check
 * @description `.agents/skills/` é instalação local não versionada; o que se versiona é o
 *   hash. A allowlist cruza `skills-lock.json` com o conteúdo real da pasta instalada, então
 *   esta suíte trava os quatro desfechos — baseline íntegra, skill extra, skill ausente e
 *   conteúdo alterado — e o detalhe que costuma errar: não confundir o `computedHash` opaco do
 *   lock com o SHA de arquivo.
 * @dependencies vitest, node:fs/os/path/crypto, scripts/check-skills.mjs (importado como
 *   módulo Node independente, por isso o `@ts-expect-error` na linha do import).
 *
 * Roda em ambiente Node (directive acima): o verificador opera em sistema de arquivos real.
 */
import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
// @ts-expect-error O verificador é executado como módulo Node independente.
import { contentHash, checkSkills } from '../../scripts/check-skills.mjs';
const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
// O lock guarda um hash opaco por design (não é para ser recalculado por quem lê); a
// allowlist guarda o SHA-256 do conteúdo instalado. O verificador tem de comparar os dois
// pares entre si — nunca o hash do lock com o SHA do arquivo, que são grandezas diferentes.
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'skills-check-'));
  roots.push(root);
  mkdirSync(join(root, '.agents/skills/develop'), { recursive: true });
  mkdirSync(join(root, '.claude/skills/develop'), { recursive: true });
  mkdirSync(join(root, 'security/skills-catalog/develop'), {
    recursive: true,
  });
  mkdirSync(join(root, 'security/skills-catalog-pointers/develop'), {
    recursive: true,
  });
  writeFileSync(join(root, '.agents/skills/develop/SKILL.md'), 'baseline');
  writeFileSync(
    join(root, 'security/skills-catalog/develop/SKILL.md'),
    'baseline',
  );
  const pointer = 'See .agents/skills/develop/SKILL.md';
  writeFileSync(join(root, '.claude/skills/develop/SKILL.md'), pointer);
  writeFileSync(
    join(root, 'security/skills-catalog-pointers/develop/SKILL.md'),
    pointer,
  );
  const lock = JSON.stringify({
    skills: { develop: { source: 'source', computedHash: 'opaque-lock-hash' } },
  });
  writeFileSync(join(root, 'skills-lock.json'), lock);
  writeFileSync(
    join(root, 'security/skills-allowlist.json'),
    JSON.stringify({
      schemaVersion: 1,
      algorithm: 'sha256-path-content-v1',
      lockSha256: createHash('sha256').update(lock).digest('hex'),
      skills: {
        develop: {
          source: 'source',
          lockComputedHash: 'opaque-lock-hash',
          contentSha256: contentHash(join(root, '.agents/skills/develop')),
          pointerSha256: contentHash(join(root, '.claude/skills/develop')),
        },
      },
    }),
  );
  return root;
}
test('baseline íntegra passa', () =>
  expect(checkSkills(fixture())).toEqual([]));
test('skill extra reprova', () => {
  const root = fixture();
  mkdirSync(join(root, '.agents/skills/extra'));
  expect(checkSkills(root)).toContain('Skill extra: extra');
});
test('skill ausente reprova', () => {
  const root = fixture();
  rmSync(join(root, '.agents/skills/develop'), { recursive: true });
  expect(checkSkills(root)).toContain('Skill ausente ou ilegível: develop');
});
test('conteúdo alterado reprova sem confundir computedHash com SHA de arquivo', () => {
  const root = fixture();
  writeFileSync(join(root, '.agents/skills/develop/SKILL.md'), 'alterado');
  expect(checkSkills(root)).toContain('Conteúdo ou origem divergente: develop');
});
