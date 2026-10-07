#!/usr/bin/env node
/**
 * @fileoverview Gate mecânico da revisão: prova que o veredito pertence ao commit testado.
 * @module scripts/check-gate
 * @description Último estágio do job `check-gate` da CI: recusa Markdown legado, exige
 *   `--commit` (SHA-1 completo), roda a partir da raiz exata da árvore, exige árvore limpa e
 *   compara o artefato de decisão com um recálculo recém-executado — além de conferir que
 *   commit/árvore gravados batem com o checkout. Aprovação editorial humana permanece um
 *   documento separado, não este gate.
 * @dependencies ./check-contract.mjs (`args`, `decide`), node:child_process (git via
 *   `execFileSync`), node:fs, node:path, node:process.
 *
 * Quando executado: CI, etapa "Verificar gate de aprovação" (depois de `ci-check-results.mjs`
 *   e `check-decision.mjs`), e por `__tests__/unit/gates.test.ts` com cwd dedicada.
 * Lê: JSON de decisão (`file`), spec e o estado Git da `--repo`.
 * Escreve: nada — stdout na aprovação, stderr com `Bloqueado: <motivo>` quando reprova.
 * Códigos de saída: 0 = gate mecânico aprovado; 1 = qualquer verificação falhou (o fluxo
 *   inteiro aborta aqui sem votar nem publicar).
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { args, decide } from './check-contract.mjs';
try {
  const options = args(process.argv.slice(2));
  // Markdown foi o formato legado do veredito; o gate atual só aceita o JSON estruturado.
  // Recusar antes de qualquer Leitura impede que uma revisão histórica ressurja como "ok".
  if (options.file.toLowerCase().endsWith('.md'))
    throw new Error('Markdown é histórico, não decisão válida para o gate.');
  if (!/^[a-f0-9]{40}$/.test(options.commit || ''))
    throw new Error('--commit completo é obrigatório.');
  const git = (...values) =>
    execFileSync('git', ['-C', options.repo, ...values], {
      encoding: 'utf8',
    }).trim();
  // O gate roda do diretório do job; exigir a raiz resolvida evita avaliar uma subpasta
  // como se fosse o repositório (HEAD e árvore seriam de outro repo).
  const root = git('rev-parse', '--show-toplevel');
  if (resolve(options.repo) !== resolve(root))
    throw new Error('Use a raiz da árvore alvo em --repo.');
  const head = git('rev-parse', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  console.error(`Árvore verificada: ${root}\nHEAD: ${head}`);
  // Árvore suja = o que foi avaliado não é o que está aqui: arquivo editado depois do
  // teste anula o vínculo revisão↔código que o gate tem de provar.
  if (git('status', '--porcelain'))
    throw new Error('Árvore suja: a revisão não representa o código avaliado.');
  const data = JSON.parse(readFileSync(options.file, 'utf8'));
  const result = decide(data, options.spec, root);
  // O artefato pode dizer `approved: true` por engano ou forja; só vale se o recálculo
  // agora (mesmo código, mesmo commit) produzir exatamente o mesmo veredito e contagens.
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
