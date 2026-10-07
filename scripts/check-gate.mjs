#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { args, decide } from './check-contract.mjs';
try {
  const options = args(process.argv.slice(2));
  if (options.file.toLowerCase().endsWith('.md'))
    throw new Error('Markdown é histórico, não decisão válida para o gate.');
  if (!/^[a-f0-9]{40}$/.test(options.commit || ''))
    throw new Error('--commit completo é obrigatório.');
  const git = (...values) =>
    execFileSync('git', ['-C', options.repo, ...values], {
      encoding: 'utf8',
    }).trim();
  const root = git('rev-parse', '--show-toplevel');
  if (resolve(options.repo) !== resolve(root))
    throw new Error('Use a raiz da árvore alvo em --repo.');
  const head = git('rev-parse', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  console.error(`Árvore verificada: ${root}\nHEAD: ${head}`);
  if (git('status', '--porcelain'))
    throw new Error('Árvore suja: a revisão não representa o código avaliado.');
  const data = JSON.parse(readFileSync(options.file, 'utf8'));
  const result = decide(data, options.spec, root);
  if (
    data.evaluatedCommit !== head ||
    options.commit !== head ||
    data.evaluatedTree !== tree
  )
    throw new Error('SHA ou árvore do artefato diverge da revisão testada.');
  if (
    !result.approved ||
    data.approved !== true ||
    data.verdict !== result.verdict ||
    JSON.stringify(data.counts) !== JSON.stringify(result.counts) ||
    !Array.isArray(data.reasons) ||
    data.reasons.length
  )
    throw new Error(
      `Decisão ausente, inconsistente ou REPROVADA: ${result.reasons.join('; ')}`,
    );
  console.log(
    `Gate mecânico aprovado para ${head}. Aprovação humana permanece separada.`,
  );
} catch (error) {
  console.error(`Bloqueado: ${error.message}`);
  process.exitCode = 1;
}
