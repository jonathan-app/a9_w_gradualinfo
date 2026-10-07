import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
export const DEFAULT_SPEC = 'docs/specs/md-0002-casca-editorial-home.md';
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

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
    const section = text.split('## Requirements')[1]?.split(/^## /m)[0] || '';
    expected = [...section.matchAll(/^- \*\*([^*]+\/AC-\d+)\*\*/gm)].map(
      (m) => m[1],
    );
    if (!expected.length || new Set(expected).size !== expected.length)
      reasons.push('Spec sem conjunto único de ACs.');
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
