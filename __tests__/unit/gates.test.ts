import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * __tests__/unit/gates.test.ts
 *
 * Os dois scripts que decidem se um PR pode entrar. Eles são a autoridade do
 * `/check`, então a propriedade que importa não é "o script roda", e sim
 * **reprovar**. Um gate que só foi testado no caminho da aprovação não tem
 * teste nenhum: passa em tudo e não barra nada.
 *
 * Os testes rodam o script como processo filho, não importando a função. Motivo:
 * o contrato do gate inclui o **código de saída**, e `execFileSync` propaga o
 * status — importar a função perderia exatamente o sinal que o CI consome.
 */

const DECISION = join(process.cwd(), 'scripts/check-decision.mjs');
const GATE = join(process.cwd(), 'scripts/check-gate.mjs');

interface Resultado {
  status: number;
  stdout: string;
  stderr: string;
}

function roda(script: string, args: string[], cwd?: string): Resultado {
  try {
    const stdout = execFileSync('node', [script, ...args], {
      encoding: 'utf-8',
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return {
      status: err.status ?? 1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
    };
  }
}

function resultado(json: unknown): Resultado {
  const dir = mkdtempSync(join(tmpdir(), 'gate-'));
  const file = join(dir, 'resultado.json');
  writeFileSync(file, JSON.stringify(json));
  try {
    return roda(DECISION, [file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const acValido = { id: 'AC-01', status: 'PASS', evidence: 'evidencia.txt' };

describe('check-decision.mjs — caminho de aprovação', () => {
  it('aprova com AC verificado, evidência e nenhum finding', () => {
    const r = resultado({ acs: [acValido], findings: [] });

    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).approved).toBe(true);
  });

  it('imprime o contrato de saída que a skill promete', () => {
    const saida = JSON.parse(
      resultado({ acs: [acValido], findings: [] }).stdout,
    );

    // A skill diz que o script imprime approved, verdict, counts e reasons.
    // Se um dia faltar uma dessas chaves, o relatório perde campo.
    expect(saida).toHaveProperty('approved');
    expect(saida).toHaveProperty('verdict');
    expect(saida).toHaveProperty('counts');
    expect(saida).toHaveProperty('reasons');
  });
});

describe('check-decision.mjs — caminho de reprovação', () => {
  it('reprova lista de ACs vazia', () => {
    const r = resultado({ acs: [], findings: [] });

    expect(r.status).not.toBe(0);
    expect(JSON.parse(r.stdout).approved).toBe(false);
  });

  it('reprova AC UNVERIFIABLE', () => {
    const r = resultado({
      acs: [{ id: 'AC-01', status: 'UNVERIFIABLE', evidence: 'x' }],
      findings: [],
    });

    expect(r.status).not.toBe(0);
    expect(JSON.parse(r.stdout).counts.UNVERIFIABLE).toBe(1);
  });

  it('reprova AC PASS sem evidência', () => {
    const r = resultado({
      acs: [{ id: 'AC-01', status: 'PASS' }],
      findings: [],
    });

    expect(r.status).not.toBe(0);
    expect(JSON.parse(r.stdout).reasons.join(' ')).toMatch(/evidência/i);
  });

  it('reprova AC FAIL mesmo com evidência', () => {
    const r = resultado({
      acs: [{ id: 'AC-01', status: 'FAIL', evidence: 'log.txt' }],
      findings: [],
    });

    expect(r.status).not.toBe(0);
    expect(JSON.parse(r.stdout).counts.FAIL).toBe(1);
  });

  it('reprova qualquer finding BLOCKER mesmo com todos os ACs PASS', () => {
    const r = resultado({
      acs: [acValido, { id: 'AC-02', status: 'PASS', evidence: 'log.txt' }],
      findings: [{ severity: 'BLOCKER', description: 'segredo commitado' }],
    });

    expect(r.status).not.toBe(0);
    expect(JSON.parse(r.stdout).counts.BLOCKER).toBe(1);
  });

  it('reprova quando não recebe argumento', () => {
    const r = roda(DECISION, []);

    expect(r.status).not.toBe(0);
  });

  it('reprova arquivo de resultado ilegível, em vez de aprovar por fallback', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-'));
    const file = join(dir, 'ruim.json');
    writeFileSync(file, '{ isto não é json');
    try {
      const r = roda(DECISION, [file]);

      expect(r.status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('check-gate.mjs — a aprovação expira quando o conteúdo muda', () => {
  let repo: string;
  let review: string;
  let fora: string;

  beforeEach(() => {
    // Um repositório real, descartável. O gate le `git rev-parse HEAD` e
    // `git status --porcelain`; mockar isso testaria o mock.
    repo = mkdtempSync(join(tmpdir(), 'gate-repo-'));
    // O arquivo de revisão vai para FORA do repo de propósito: dentro dele, o
    // próprio `git status --porcelain` ficaria sujo e o gate dispararia o
    // bloqueio de árvore suja antes de chegar ao motivo real do teste.
    fora = mkdtempSync(join(tmpdir(), 'gate-rev-'));
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', repo, ...args], { encoding: 'utf-8' });

    git('init', '-q');
    git('config', 'user.email', 'gate@teste.invalid');
    git('config', 'user.name', 'Gate');
    writeFileSync(join(repo, 'app.ts'), 'export const a = 1;\n');
    git('add', '-A');
    git('commit', '-qm', 'base');

    review = join(fora, 'revisao.md');
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fora, { recursive: true, force: true });
  });

  const escreveReview = (sha: string, veredito = 'Veredito: APROVADO') =>
    writeFileSync(
      review,
      `# Revisão\n\nCommit Avaliado: ${sha}\n\n${veredito}\n`,
    );

  const sha = () =>
    execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], {
      encoding: 'utf-8',
    }).trim();

  it('aprova quando o HEAD é o commit avaliado e a árvore está limpa', () => {
    escreveReview(sha());
    const r = roda(GATE, [review], repo);

    expect(r.status).toBe(0);
  });

  it('bloqueia quando o conteúdo foi alterado depois da aprovação', () => {
    const aprovado = sha();
    // Simula aapprove e, depois, um commit novo: é o caso "a PR mudou depois
    // do /check", que invalida a evidência do /check.
    writeFileSync(join(repo, 'app.ts'), 'export const a = 2;\n');
    execFileSync('git', ['-C', repo, 'add', '-A']);
    execFileSync('git', ['-C', repo, 'commit', '-qm', 'depois do check']);
    escreveReview(aprovado);

    const r = roda(GATE, [review], repo);

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/diverg|dividiu|mudou/i);
  });

  it('bloqueia arquivo novo não commitado depois da aprovação', () => {
    escreveReview(sha());
    writeFileSync(join(repo, 'novo.ts'), 'export const b = 1;\n');

    const r = roda(GATE, [review], repo);

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/não commitadas|suja/i);
  });

  it('bloqueia arquivo novo staged e não commitado', () => {
    escreveReview(sha());
    writeFileSync(join(repo, 'novo.ts'), 'export const b = 1;\n');
    execFileSync('git', ['-C', repo, 'add', 'novo.ts']);

    const r = roda(GATE, [review], repo);

    expect(r.status).not.toBe(0);
  });

  it('bloqueia quando o veredito não é APROVADO', () => {
    escreveReview(sha(), 'Veredito: REPROVADO');

    const r = roda(GATE, [review], repo);

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/APROVADO/);
  });

  it('bloqueia quando o arquivo de revisão não tem commit avaliado', () => {
    writeFileSync(review, '# Revisão\n\nVeredito: APROVADO\n');

    const r = roda(GATE, [review], repo);

    expect(r.status).not.toBe(0);
  });

  it('bloqueia arquivo de revisão inexistente', () => {
    const r = roda(GATE, [join(fora, 'nao-existe.md')], repo);

    expect(r.status).not.toBe(0);
  });
});
