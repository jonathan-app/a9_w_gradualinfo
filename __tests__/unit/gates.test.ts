import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  // `spawnSync`, e não `execFileSync`: este devolve `stderr` só quando o
  // processo falha. Um gate que anuncia a árvore verificada **no caminho de
  // aprovação** escreve em stderr justamente quando sai com 0, e um teste que
  // só enxerga stderr em falha não veria nada — foi o que aconteceu com os
  // quatro casos de auditoria e de compatibilidade.
  const r = spawnSync('node', [script, ...args], {
    encoding: 'utf-8',
    cwd,
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
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

describe('check-gate.mjs — a decisão vale só para o commit e a árvore que ela mediu', () => {
  let repo: string;
  let fora: string;

  beforeEach(() => {
    // Um repositório real e descartável. O gate le `git rev-parse HEAD` e
    // `git status --porcelain`; mockar isso testaria o mock.
    repo = mkdtempSync(join(tmpdir(), 'gate-repo-'));
    // Os artefatos de decisão vão para FORA do repo de propósito: dentro dele,
    // o próprio `git status --porcelain` ficaria sujo e o gate dispararia o
    // bloqueio de árvore suja antes de chegar ao motivo real do teste.
    fora = mkdtempSync(join(tmpdir(), 'gate-art-'));
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', repo, ...args], { encoding: 'utf-8' });

    git('init', '-q');
    git('config', 'user.email', 'gate@teste.invalid');
    git('config', 'user.name', 'Gate');
    writeFileSync(join(repo, 'app.ts'), 'export const a = 1;\n');
    git('add', '-A');
    git('commit', '-qm', 'base');
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fora, { recursive: true, force: true });
  });

  const sha = () =>
    execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], {
      encoding: 'utf-8',
    }).trim();

  /** Artefato estruturado, no formato que check-decision.mjs emite. */
  const escreveDecisao = (
    aprovado: boolean,
    veredito = 'APROVADO',
    motivos: string[] = [],
  ) => {
    const arquivo = join(fora, 'resultado.json');
    writeFileSync(
      arquivo,
      JSON.stringify(
        {
          approved: aprovado,
          verdict: veredito,
          counts: {
            totalACs: 12,
            PASS: aprovado ? 12 : 11,
            FAIL: aprovado ? 0 : 1,
          },
          reasons: motivos,
        },
        null,
        2,
      ),
    );
    return arquivo;
  };

  const escreveLegado = (
    shaAvaliado: string,
    veredito = 'Veredito: APROVADO',
  ) => {
    const arquivo = join(fora, 'revisao.md');
    writeFileSync(
      arquivo,
      `# Revisão\n\nCommit Avaliado: ${shaAvaliado}\n\n${veredito}\n`,
    );
    return arquivo;
  };

  // ── contrato estruturado ──

  it('aprova a decisão estruturada que casa com HEAD e árvore limpa', () => {
    const r = roda(GATE, [escreveDecisao(true), '--commit', sha()], repo);

    expect(r.status).toBe(0);
  });

  it('anuncia a árvore verificada e o HEAD, para o resultado ser auditável', () => {
    const r = roda(GATE, [escreveDecisao(true), '--commit', sha()], repo);

    expect(r.stderr).toContain(
      `Árvore verificada: ${execFileSync('git', ['-C', repo, 'rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).trim()}`,
    );
    expect(r.stderr).toContain(`HEAD: ${sha()}`);
  });

  it('bloqueia aprovação com commit diferente do HEAD, e diz qual é cada um', () => {
    const aprovado = sha();
    writeFileSync(join(repo, 'app.ts'), 'export const a = 2;\n');
    execFileSync('git', ['-C', repo, 'add', '-A']);
    execFileSync('git', ['-C', repo, 'commit', '-qm', 'depois do check']);

    const r = roda(GATE, [escreveDecisao(true), '--commit', aprovado], repo);

    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/conteúdo mudou/i);
    // O motivo tem que identificar os dois commits: "bloqueou" sem dizer qual
    // divergiu de qual obriga o operador a abrir o git de novo.
    expect(r.stderr).toContain(aprovado);
    expect(r.stderr).toContain(sha());
  });

  it('bloqueia quando a decisão estruturada é REPROVADA, e repassa os motivos', () => {
    const r = roda(
      GATE,
      [
        escreveDecisao(false, 'REPROVADO', ['AC reprovado: md-0002/AC-05']),
        '--commit',
        sha(),
      ],
      repo,
    );

    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/REPROVADA/);
    expect(r.stderr).toContain('md-0002/AC-05');
  });

  it('bloqueia quando o artefato não tem "approved", distinguindo de uma reprovação', () => {
    const arquivo = join(fora, 'lixo.json');
    writeFileSync(arquivo, JSON.stringify({ verdict: 'APROVADO' }));

    const r = roda(GATE, [arquivo, '--commit', sha()], repo);

    expect(r.status).toBe(1);
    // Não pode dizer "REPROVADA": o arquivo nem chegou a ser uma decisão.
    expect(r.stderr).toMatch(/"approved"/);
    expect(r.stderr).toMatch(/check-decision/i);
  });

  it('bloqueia JSON inválido como erro de uso, não como reprovação', () => {
    const arquivo = join(fora, 'quebrado.json');
    writeFileSync(arquivo, '{ nao é json');

    const r = roda(GATE, [arquivo, '--commit', sha()], repo);

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/não é JSON válido/i);
  });

  it('exige --commit no formato estruturado, senão uma aprovação antiga valeria para sempre', () => {
    const r = roda(GATE, [escreveDecisao(true)], repo);

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/--commit é obrigatório/i);
  });

  // ── árvore-alvo explícita ──

  it('recusa --repo que não é um repositório git, dizendo o que fazer', () => {
    const r = roda(
      GATE,
      [escreveDecisao(true), '--commit', sha(), '--repo', fora],
      repo,
    );

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Erro de contexto/i);
    expect(r.stderr).toMatch(/--repo/);
  });

  it('recusa rodar de dentro de um subdiretório, em vez de verificar a árvore errada em silêncio', () => {
    const sub = join(repo, 'app', 'artigos');
    // O subdiretório precisa conter arquivo: git não versiona diretório vazio,
    // e sem commit o gate cairia no bloqueio de árvore suja em vez do de
    // contexto — que é justamente o que este teste precisa isolar.
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(sub, 'page.tsx'), 'export default null;\n');
    execFileSync('git', ['-C', repo, 'add', '-A']);
    execFileSync('git', ['-C', repo, 'commit', '-qm', 'subdir']);

    const r = roda(GATE, [escreveDecisao(true), '--commit', sha()], sub);

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Erro de contexto/i);
    expect(r.stderr).toMatch(/não é a raiz/i);
  });

  it('verifica a árvore certa quando --repo aponta para outro repositório', () => {
    const outro = mkdtempSync(join(tmpdir(), 'gate-outro-'));
    try {
      const git = (...args: string[]) =>
        execFileSync('git', ['-C', outro, ...args], { encoding: 'utf-8' });
      git('init', '-q');
      git('config', 'user.email', 'outro@teste.invalid');
      git('config', 'user.name', 'Outro');
      writeFileSync(join(outro, 'b.ts'), 'export const b = 1;\n');
      git('add', '-A');
      git('commit', '-qm', 'base');
      const shaOutro = git('rev-parse', 'HEAD').trim();

      // Executado a partir de `repo`, que tem a árvore suja de propósito: sem
      // --repo o gate bloquearia por `repo`; com --repo tem que aprovar `outro`.
      writeFileSync(join(repo, 'lixo.ts'), 'export const c = 1;\n');

      const r = roda(
        GATE,
        [escreveDecisao(true), '--commit', shaOutro, '--repo', outro],
        repo,
      );

      expect(r.status).toBe(0);
      expect(r.stderr).toContain(
        `Árvore verificada: ${execFileSync('git', ['-C', outro, 'rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).trim()}`,
      );
    } finally {
      rmSync(outro, { recursive: true, force: true });
    }
  });

  it('bloqueia árvore suja pelo motivo certo, antes de olhar o commit', () => {
    writeFileSync(join(repo, 'novo.ts'), 'export const b = 1;\n');

    const r = roda(GATE, [escreveDecisao(true), '--commit', sha()], repo);

    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/não commitadas/i);
    expect(r.stderr).toMatch(/working tree suja/i);
  });

  it('bloqueia staged e não commitado com o mesmo motivo de árvore suja', () => {
    writeFileSync(join(repo, 'novo.ts'), 'export const b = 1;\n');
    execFileSync('git', ['-C', repo, 'add', 'novo.ts']);

    const r = roda(GATE, [escreveDecisao(true), '--commit', sha()], repo);

    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/working tree suja/i);
  });

  it('recusa repo sem HEAD, que não tem nada que possa ser aprovado', () => {
    const vazio = mkdtempSync(join(tmpdir(), 'gate-vazio-'));
    try {
      execFileSync('git', ['-C', vazio, 'init', '-q'], { encoding: 'utf-8' });

      const r = roda(
        GATE,
        [escreveDecisao(true), '--commit', sha(), '--repo', vazio],
        repo,
      );

      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/não tem HEAD/i);
    } finally {
      rmSync(vazio, { recursive: true, force: true });
    }
  });

  // ── compatibilidade do formato legado ──

  it('ainda aprova um relatório .md legado, para não invalidar o que já foi emitido', () => {
    const r = roda(GATE, [escreveLegado(sha())], repo);

    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/formato legado/i);
    expect(r.stderr).toMatch(/deprecad/i);
  });

  it('bloqueia relatório legado sem aprovação, e nomeia a incompatibilidade do template', () => {
    const r = roda(GATE, [escreveLegado(sha(), 'Veredito: REPROVADO')], repo);

    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/não registra aprovação/i);
    expect(r.stderr).toMatch(/\*\*Aprovado\*\*/);
  });

  it('bloqueia relatório legado sem commit avaliado', () => {
    const arquivo = join(fora, 'sem-sha.md');
    writeFileSync(arquivo, '# Revisão\n\nVeredito: APROVADO\n');

    const r = roda(GATE, [arquivo], repo);

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Commit Avaliado/);
  });

  // ── uso ──

  it('recusa não informar artefato, e diz o uso', () => {
    const r = roda(GATE, [], repo);

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/check-decision\.mjs/);
  });

  it('recusa mais de um artefato, em vez de verificar só o primeiro', () => {
    const r = roda(
      GATE,
      [escreveDecisao(true), escreveDecisao(true), '--commit', sha()],
      repo,
    );

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/um artefato por vez/i);
  });

  it('recusa artefato inexistente como erro de uso', () => {
    const r = roda(
      GATE,
      [join(fora, 'nao-existe.json'), '--commit', sha()],
      repo,
    );

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/não encontrado/i);
  });

  it('recusa opção desconhecida em vez de ignorá-la em silêncio', () => {
    const r = roda(GATE, [escreveDecisao(true), '--aprouva', sha()], repo);

    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/opção desconhecida/i);
  });
});
