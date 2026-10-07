#!/usr/bin/env node
/**
 * @fileoverview Monta o artefato de resultados da revisão a partir das evidências da CI.
 * @module scripts/ci-check-results
 * @description Primeira etapa do job `check-gate`: para cada AC da spec, só atribui PASS
 *   quando o arquivo de evidência existe E o manifesto de revisão ao lado dele aponta para o
 *   mesmo commit, árvore e hash de spec desta execução — evidência de outra rodada não vale.
 *   O JSON gravado aqui é a entrada de `check-decision.mjs`.
 * @dependencies ./ci-assess.mjs (avalia ACs e o log pgTAP), ./check-contract.mjs (`DEFAULT_SPEC`,
 *   `sha256`), node:child_process (git), node:fs, node:path.
 *
 * Quando executado: CI, etapa "Gerar matriz para o SHA avaliado" do job `check-gate`.
 * Lê: spec canônica, checkout Git e as evidências baixadas dos artifacts (`results.json`,
 *   `e2e-revision.json`, `database-revision.json`, `pgtap.log`), sob o diretório do 2º arg.
 * Escreve: o arquivo do 1º argumento (JSON de schema 1, terminado em `\n`).
 * Códigos de saída: 0 = artefato gerado; 1 = exceção não tratada (argumento faltando, spec
 *   sem ACs únicos) — o job já falha antes de o gate rodar.
 */
// A avaliação mecânica exige provas específicas vinculadas ao checkout.
// Aprovação editorial e publicação permanecem decisões humanas.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { assessAC, assessDatabase } from './ci-assess.mjs';
import { DEFAULT_SPEC, sha256 } from './check-contract.mjs';
const output = process.argv[2];
const evidenceDir = resolve(process.argv[3] ?? '');
if (!output || !process.argv[3])
  throw new Error('Informe saída e diretório de evidências.');
const specBytes = readFileSync(DEFAULT_SPEC);
const requirements =
  specBytes.toString().split('## Requirements')[1]?.split(/^## /m)[0] ?? '';
const ids = [...requirements.matchAll(/^- \*\*([^*]+\/AC-\d+)\*\*/gm)].map(
  (match) => match[1],
);
if (!ids.length || new Set(ids).size !== ids.length)
  throw new Error('Spec sem conjunto único de ACs.');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const specSha256 = sha256(specBytes);
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};
const report = readJson(resolve(evidenceDir, 'test-results/results.json'));
// Uma evidência só vale para esta execução se o manifesto ao lado dela carregar o mesmo
// commit, árvore e hash de spec lidos AGORA — artefato de rodada anterior é rejeitado.
const validRevision = (path) => {
  const revision = readJson(resolve(evidenceDir, path));
  return (
    revision?.commit === commit &&
    revision?.tree === tree &&
    revision?.specSha256 === specSha256
  );
};
const acs = ids.map((id) => {
  // O AC da camada de banco é avaliado pelo pgTAP; os demais, pelos resultados de e2e/unit.
  // O sufixo é o contrato com a spec — renomear o AC obriga tocar nos dois lados.
  const database = id.endsWith('AC-11');
  const evidence = resolve(
    evidenceDir,
    database ? 'pgtap.log' : 'test-results/results.json',
  );
  // Sem prova ou com prova de outra revisão, o status não é PASS nem FAIL: é UNVERIFIABLE —
  // ausência de manifestação não pode virar sucesso pelo silêncio dos jobs.
  let status = 'UNVERIFIABLE';
  if (
    existsSync(evidence) &&
    validRevision(
      database ? 'database-revision.json' : 'test-results/e2e-revision.json',
    )
  ) {
    status = database
      ? assessDatabase(readFileSync(evidence, 'utf8'))
      : assessAC(id, report);
  }
  return {
    id,
    status,
    evidence,
    evidenceSha256: existsSync(evidence)
      ? sha256(readFileSync(evidence))
      : null,
    note: 'Avaliação mecânica dos casos obrigatórios desta revisão. Aprovação humana permanece separada.',
  };
});
writeFileSync(
  output,
  JSON.stringify(
    {
      schemaVersion: 1,
      evaluatedCommit: commit,
      evaluatedTree: tree,
      spec: { path: DEFAULT_SPEC, sha256: sha256(specBytes) },
      acs,
      // Sem todos os casos obrigatórios PASS o artefato já nasce bloqueado: o findings
      // alimenta a mensagem única do BLOCKER que o veredito carrega.
      findings: acs.every((ac) => ac.status === 'PASS')
        ? []
        : [
            {
              severity: 'BLOCKER',
              description:
                'Casos obrigatórios ausentes, falhos ou sem manifesto desta revisão.',
            },
          ],
    },
    null,
    2,
  ) + '\n',
);
