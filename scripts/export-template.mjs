// scripts/export-template.mjs
//
// Gera o pacote do template em `dist/`, respeitando as regras `export-ignore`
// de `.gitattributes`. O nome do arquivo sai do `package.json` — muda o nome
// do projeto, muda o nome do pacote, sem editar nada aqui.
//
//   pnpm template:export
//
// Saída:
//   dist/<name>-v<version>.zip
//   dist/<name>-v<version>.zip.sha256
//
// Por que não `git archive HEAD` direto: o repositório ainda não tem commits
// (HEAD unborn), e o zip precisa refletir a árvore de trabalho, não o último
// commit. Por isso montamos um índice temporário, escrevemos uma árvore e
// arquivamos essa árvore — o índice real e a história não são tocados.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const outDir = join(root, 'dist');
const base = `${pkg.name}-v${pkg.version}`;
const zipPath = join(outDir, `${base}.zip`);

const tmpIndex = join(tmpdir(), `template-export-${process.pid}-${Date.now()}`);
const gitEnv = { ...process.env, GIT_INDEX_FILE: tmpIndex };
const git = (args) =>
  execFileSync('git', args, {
    cwd: root,
    env: gitEnv,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
    .toString()
    .trim();

try {
  mkdirSync(outDir, { recursive: true });
  git(['read-tree', '--empty']);
  execFileSync('git', ['add', '-A'], {
    cwd: root,
    env: gitEnv,
    stdio: 'inherit',
  });
  const tree = git(['write-tree']);

  if (existsSync(zipPath)) rmSync(zipPath);
  execFileSync(
    'git',
    [
      'archive',
      '--format=zip',
      '--worktree-attributes',
      `--prefix=${pkg.name}/`,
      '-o',
      zipPath,
      tree,
    ],
    { cwd: root, env: gitEnv, stdio: 'inherit' },
  );

  const sha = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
  writeFileSync(`${zipPath}.sha256`, `${sha}  ${base}.zip\n`);
  console.log(`✔ ${zipPath}`);
  console.log(`✔ ${zipPath}.sha256`);
} finally {
  if (existsSync(tmpIndex)) rmSync(tmpIndex);
}
