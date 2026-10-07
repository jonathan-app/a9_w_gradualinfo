// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
const gate = resolve('scripts/check-gate.mjs');
const decision = resolve('scripts/check-decision.mjs');
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
let root: string, repo: string, artifact: string, data: any, sha: string;
const git = (...args: string[]) =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
function run(script: string, file = artifact) {
  return spawnSync(
    'node',
    [
      script,
      file,
      '--repo',
      repo,
      '--spec',
      'spec.md',
      ...(script === gate ? ['--commit', sha] : []),
    ],
    { encoding: 'utf8' },
  );
}
function save() {
  writeFileSync(artifact, JSON.stringify(data));
}
function approve() {
  save();
  const result = run(decision);
  expect(result.status, result.stderr).toBe(0);
  data = JSON.parse(result.stdout);
  save();
}
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gate-contract-'));
  repo = join(root, 'repo');
  artifact = join(root, 'decision.json');
  execFileSync('git', ['init', '-q', repo]);
  const spec =
    '# Fixture\n**Status**: Accepted\n## Requirements\n- **fixture/AC-01**: first\n- **fixture/AC-02**: second\n## Decision\n';
  writeFileSync(join(repo, 'spec.md'), spec);
  writeFileSync(join(repo, 'proof.log'), 'executed');
  git('add', '.');
  git(
    '-c',
    'user.name=Gate test',
    '-c',
    'user.email=gate@example.invalid',
    'commit',
    '-qm',
    'fixture',
  );
  sha = git('rev-parse', 'HEAD');
  data = {
    schemaVersion: 1,
    evaluatedCommit: sha,
    evaluatedTree: git('rev-parse', 'HEAD^{tree}'),
    spec: { path: 'spec.md', sha256: hash(spec) },
    acs: ['fixture/AC-01', 'fixture/AC-02'].map((id) => ({
      id,
      status: 'PASS',
      evidence: 'proof.log',
      evidenceSha256: hash('executed'),
    })),
    findings: [],
  };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
describe('gate completo por revisão', () => {
  it('aprova revisão limpa com conjunto completo e decisão recalculada', () => {
    approve();
    expect(run(gate).status).toBe(0);
  });
  it.each([
    'missing',
    'duplicate',
    'extra',
    'fail',
    'unverifiable',
    'missing-proof',
    'bad-hash',
    'blocker',
    'malformed',
  ])('rejeita %s', (kind) => {
    if (kind === 'missing') data.acs.pop();
    if (kind === 'duplicate') data.acs[1] = data.acs[0];
    if (kind === 'extra')
      data.acs.push({ ...data.acs[0], id: 'fixture/AC-99' });
    if (kind === 'fail') data.acs[0].status = 'FAIL';
    if (kind === 'unverifiable') data.acs[0].status = 'UNVERIFIABLE';
    if (kind === 'missing-proof') data.acs[0].evidence = 'absent.log';
    if (kind === 'bad-hash') data.acs[0].evidenceSha256 = '0'.repeat(64);
    if (kind === 'blocker')
      data.findings = [{ severity: 'BLOCKER', description: 'blocked' }];
    if (kind === 'malformed') data.acs = 'not-array';
    save();
    const result = run(decision);
    expect(result.status).not.toBe(0);
    expect(JSON.parse(result.stdout).approved).toBe(false);
    data.approved = true;
    data.verdict = 'APROVADO';
    save();
    expect(run(gate).status).not.toBe(0);
  });
  it.each(['commit', 'tree', 'spec', 'counts'])(
    'rejeita adulteração de %s',
    (kind) => {
      approve();
      if (kind === 'commit') data.evaluatedCommit = '0'.repeat(40);
      if (kind === 'tree') data.evaluatedTree = '0'.repeat(40);
      if (kind === 'spec') data.spec.sha256 = '0'.repeat(64);
      if (kind === 'counts') data.counts.totalACs = 1;
      save();
      expect(run(gate).status).not.toBe(0);
    },
  );
  it('rejeita aprovação antiga com --commit atual após commit real', () => {
    approve();
    writeFileSync(join(repo, 'new.txt'), 'new');
    git('add', '.');
    git(
      '-c',
      'user.name=Gate test',
      '-c',
      'user.email=gate@example.invalid',
      'commit',
      '-qm',
      'new',
    );
    sha = git('rev-parse', 'HEAD');
    expect(run(gate).status).not.toBe(0);
  });
  it('rejeita árvore suja mesmo sem alterar o SHA', () => {
    approve();
    writeFileSync(join(repo, 'proof.log'), 'changed');
    expect(run(gate).status).not.toBe(0);
  });
  it('rejeita artefato ausente, JSON inválido e Markdown legado', () => {
    expect(run(gate, join(root, 'absent.json')).status).not.toBe(0);
    writeFileSync(artifact, 'not-json');
    expect(run(gate).status).not.toBe(0);
    const legacy = join(root, 'review.md');
    writeFileSync(legacy, `Commit Avaliado: ${sha}\nVeredito: APROVADO`);
    expect(run(gate, legacy).status).not.toBe(0);
  });
  it('rejeita spec Proposed mesmo com hash correspondente', () => {
    const file = join(repo, 'spec.md');
    const text = readFileSync(file, 'utf8').replace('Accepted', 'Proposed');
    writeFileSync(file, text);
    data.spec.sha256 = hash(text);
    save();
    expect(run(decision).status).not.toBe(0);
  });
});
