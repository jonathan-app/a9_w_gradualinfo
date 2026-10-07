#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_SPEC, sha256 } from './check-contract.mjs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain'))
  throw new Error('Checkout alterado: não registrar HEAD como árvore testada.');
if (!process.argv[2]) throw new Error('Informe o manifesto de saída.');
writeFileSync(
  process.argv[2],
  JSON.stringify(
    {
      commit: git('rev-parse', 'HEAD'),
      tree: git('rev-parse', 'HEAD^{tree}'),
      specSha256: sha256(readFileSync(DEFAULT_SPEC)),
    },
    null,
    2,
  ) + '\n',
);
