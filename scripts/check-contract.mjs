/**
 * @fileoverview Contrato de avaliação: decide se uma revisão está apta a ser aprovada.
 * @module scripts/check-contract
 * @description Funções puras (nenhuma escrita em disco) que cruzam o artefato de resultados
 *   com a spec canônica: integridade do schema, hash da spec, conjunto exato de ACs, hash de
 *   cada evidência e severidade dos findings. `check-decision.mjs` é o CLI que o expõe e
 *   `check-gate.mjs` é quem confere que o artefato gravado bate com este recálculo.
 * @dependencies node:fs (leitura da spec e das evidências), node:crypto (SHA-256), node:path.
 *
 * Quando executado: nunca direto — é importado por `check-decision.mjs` (job `check-gate` da
 *   CI) e por `check-gate.mjs`/`__tests__/unit/gates.test.ts`.
 * Lê: a spec em `DEFAULT_SPEC` (ou `specPath`), o JSON de resultados e os arquivos de
 *   evidência nele referenciados.
 * Escreve: nada.
 * Códigos de saída: definidos pelos CLI's que importam — 0 = APROVADO, 1 = REPROVADO.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
// Spec avaliada quando `--spec` não é informado: mudar o arquivo de referência muda quais
// ACs o gate espera, por isso ele é código e não argumento obrigatório.
export const DEFAULT_SPEC = 'docs/specs/md-0002-casca-editorial-home.md';

/**
 * Calcula o SHA-256 hexadecimal de um buffer.
 *
 * @param {Buffer} bytes - Conteúdo bruto (spec ou evidência), lido sem decodificação.
 * @returns {string} Hash em hex de 64 caracteres — o mesmo formato gravado em
 *   `spec.sha256` e `evidenceSha256`.
 */
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

/**
 * Recalcula a decisão de aprovação a partir do artefato e da spec.
 *
 * Toda chamada parte de `reasons` vazio: a única forma de `approved: true` é não achar
 * nenhuma falha nova. Por isso `check-gate.mjs` recalcula e compara com o artefato gravado
 * em vez de confiar em `data.approved` — aprovação forjada no JSON reprova na comparação.
 *
 * @param data - Conteúdo do JSON de resultados. Entradas malformadas viram `reasons`, nunca
 *   exceção: o gate tem de reprovar com mensagem, não com stack trace.
 * @param {string} [specPath] - Caminho da spec relativo a `repo`.
 * @param {string} [repo] - Raiz usada para resolver caminhos relativos de spec e evidências.
 * @returns O objeto `data` sobrescrito com `approved`, `verdict` (`APROVADO`/`REPROVADO`),
 *   `counts` (totais por status) e `reasons` (todas as falhas, não só a primeira).
 */
export function decide(data, specPath = DEFAULT_SPEC, repo = process.cwd()) {
  const reasons = [];
  const counts = {
    totalACs: 0,
    PASS: 0,
    FAIL: 0,
    UNVERIFIABLE: 0,
    missingEvidence: 0,
    BLOCKER: 0,
    WARNING: 0,
  };
  const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
  // Hex ancorado no tamanho exato: `evaluatedCommit`/`evaluatedTree` vêm do git (40 chars,
  // SHA-1) e `evidenceSha256` de sha256 (64) — prefixo válido não passa aqui.
  const hex = (v, size) =>
    typeof v === 'string' && new RegExp(`^[a-f0-9]{${size}}$`).test(v);
  if (!object(data)) data = {};
  if (
    data.schemaVersion !== 1 ||
    !hex(data.evaluatedCommit, 40) ||
    !hex(data.evaluatedTree, 40)
  )
    reasons.push('Schema, commit ou árvore ausentes ou inválidos.');
  let expected = [];
  try {
    const file = resolve(repo, specPath);
    const bytes = readFileSync(file);
    const text = bytes.toString('utf8');
    if (!/^\*\*Status\*\*: Accepted\s*$/m.test(text))
      reasons.push('Spec não está Accepted.');
    // A spec é o contrato: pega a seção `## Requirements` inteira (corta no próximo `## `)
    // e extrai os ids no formato `recurso/AC-n` dos itens `- **id**`. Spec Proposed, sem ACs
    // ou com AC duplicado reprova antes de olhar qualquer resultado.
    const section = text.split('## Requirements')[1]?.split(/^## /m)[0] || '';
    expected = [...section.matchAll(/^- \*\*([^*]+\/AC-\d+)\*\*/gm)].map(
      (m) => m[1],
    );
    if (!expected.length || new Set(expected).size !== expected.length)
      reasons.push('Spec sem conjunto único de ACs.');
    // O artefato tem de carregar o path e o hash da mesma spec que está no disco: um
    // resultado produzido contra outra versão da spec não vale para este commit.
    if (
      !object(data.spec) ||
      resolve(repo, data.spec.path || '') !== file ||
      data.spec.sha256 !== sha256(bytes)
    )
      reasons.push('Spec/hash diferente do contrato esperado.');
  } catch {
    reasons.push('Spec esperada ausente ou ilegível.');
  }
  const acs = Array.isArray(data.acs) ? data.acs : [];
  const findings = Array.isArray(data.findings) ? data.findings : [];
  if (!Array.isArray(data.acs) || !Array.isArray(data.findings))
    reasons.push('acs e findings devem ser arrays.');
  counts.totalACs = acs.length;
  const ids = acs.map((a) => (object(a) ? a.id : undefined));
  // Conjunto exato, sem duplicada nem extra: AC a mais ou a menos da spec é prova de que o
  // resultado veio de outra revisão (ou foi editado à mão).
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== expected.length ||
    ids.some((id) => !expected.includes(id)) ||
    expected.some((id) => !ids.includes(id))
  )
    reasons.push('Conjunto de ACs incompleto, duplicado ou diferente da spec.');
  for (const ac of acs) {
    if (
      !object(ac) ||
      typeof ac.id !== 'string' ||
      !['PASS', 'FAIL', 'UNVERIFIABLE'].includes(ac.status)
    ) {
      reasons.push('AC malformado.');
      continue;
    }
    counts[ac.status]++;
    if (ac.status !== 'PASS') reasons.push(`AC sem PASS: ${ac.id}`);
    // Evidência é um arquivo com hash declarado: prova que o AC mede exatamente este
    // artefato. Atrasar a triagem para o `catch` faz o bloco IF virar a condição única de
    // "evidência inválida", contada em missingEvidence.
    try {
      if (
        typeof ac.evidence !== 'string' ||
        !ac.evidence.trim() ||
        !hex(ac.evidenceSha256, 64)
      )
        throw new Error();
      const proof = resolve(repo, ac.evidence);
      if (
        !existsSync(proof) ||
        sha256(readFileSync(proof)) !== ac.evidenceSha256
      )
        throw new Error();
    } catch {
      counts.missingEvidence++;
      reasons.push(`Evidência ausente ou hash incorreto: ${ac.id}`);
    }
  }
  // Findings: só BLOCKER reprova o veredito; WARNING é contado para o relatório e INFO é
  // ignorado — a semântica de "aviso não é bloqueio" vive aqui, não nos CLIs.
  for (const finding of findings) {
    if (
      !object(finding) ||
      !['INFO', 'WARNING', 'BLOCKER'].includes(finding.severity) ||
      typeof finding.description !== 'string' ||
      !finding.description.trim()
    ) {
      reasons.push('Finding malformado.');
      continue;
    }
    if (finding.severity === 'BLOCKER') {
      counts.BLOCKER++;
      reasons.push(`BLOCKER: ${finding.description}`);
    }
    if (finding.severity === 'WARNING') counts.WARNING++;
  }
  return {
    ...data,
    approved: reasons.length === 0,
    verdict: reasons.length === 0 ? 'APROVADO' : 'REPROVADO',
    counts,
    reasons,
  };
}

/**
 * Interpreta a linha de comando compartilhada pelos CLIs de decisão.
 *
 * O primeiro argumento sem prefixo é o JSON de resultados (único posicional); o resto é
 * flag/valor. Faixa `--foo <valor>` com `--foo` seguinte viola a intenção — valor não pode
 * ser outra flag.
 *
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {Object} `file` (JSON de resultados, obrigatório), `repo` (padrão: cwd),
 *   `spec` (padrão: `DEFAULT_SPEC`) e `commit` (consumido por `check-gate`).
 * @throws {Error} Flag sem valor, argumento desconhecido ou JSON de resultados ausente.
 */
export function args(argv) {
  const options = {
    file: undefined,
    repo: process.cwd(),
    spec: DEFAULT_SPEC,
    commit: undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (['--repo', '--spec', '--commit'].includes(value)) {
      const next = argv[++i];
      if (!next || next.startsWith('--'))
        throw new Error(`Falta valor para ${value}`);
      options[value.slice(2)] = next;
    } else if (!value.startsWith('-') && !options.file) options.file = value;
    else throw new Error('Argumento inválido.');
  }
  if (!options.file) throw new Error('Informe o JSON de resultados.');
  return options;
}
