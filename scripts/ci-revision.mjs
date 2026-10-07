#!/usr/bin/env node
/**
 * @fileoverview Grava o manifesto de revisão que amarra evidência ao checkout testado.
 * @module scripts/ci-revision
 * @description Escreve um JSON com `commit`, `tree` (árvore do HEAD) e `specSha256` do estado
 *   atual. Os jobs `e2e` e `database` chamam este script ANTES de gerar a evidência, e
 *   `ci-check-results.mjs` só aceita evidência cujo manifesto repita exatamente os três
 *   valores lidos na hora da avaliação — é o mecanismo que impede artefato de uma rodada
 *   anterior de aprovar um checkout diferente.
 * @dependencies node:child_process (`git`), node:fs, ./check-contract.mjs (`DEFAULT_SPEC`,
 *   `sha256`).
 *
 * Quando executado: CI, job `e2e` (antes do Playwright, saída em `$RUNNER_TEMP`) e job
 *   `database` (antes do pgTAP, saída em `ci-results/`).
 * Lê: estado Git (HEAD, árvore, `git status --porcelain`) e os bytes da spec canônica.
 * Escreve: somente o arquivo indicado no 1º argumento (JSON formatado + `\n`).
 * Códigos de saída: 0 = manifesto gravado; 1 = checkout sujo, argumento ausente ou falha do
 *   Git — todas lançam exceção não tratada, que o step da CI já marca como falha.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_SPEC, sha256 } from './check-contract.mjs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
// O manifesto declara "esta árvore foi testada", mas `commit`/`tree` vêm do HEAD: com
// alterações locais não commitadas, o que rodou (árvore suja) e o que o manifesto registra
// (HEAD limpo) seriam coisas diferentes. Recusar é a única forma de o vínculo continuar
// verdadeiro.
if (git('status', '--porcelain'))
  throw new Error('Checkout alterado: não registrar HEAD como árvore testada.');
if (!process.argv[2]) throw new Error('Informe o manifesto de saída.');
// Os três campos são o contrato mínimo de comparação de `ci-check-results.mjs`: qualquer
// um divergindo e a evidência da rodada é descartada, mesmo que o conteúdo seja "quase" o
// mesmo commit.
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
