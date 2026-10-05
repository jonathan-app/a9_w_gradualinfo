#!/usr/bin/env node

/**
 * check-gate.mjs — gate de entrega, ligado a um commit e a uma árvore
 *
 * Responde a uma pergunta só: *o código neste repositório, neste commit, está
 * coberto por uma decisão de qualidade aprovada?* Duas garantias, e as duas são
 * verificáveis por máquina:
 *
 * 1. a decisão existe, é estruturada e diz APROVADO;
 * 2. o conteúdo não mudou desde a decisão.
 *
 * Uso Preferido (contrato estruturado):
 *   node scripts/check-gate.mjs <resultado.json> --commit <sha> [--repo <path>]
 *
 * Uso legado (relatório Markdown):
 *   node scripts/check-gate.mjs <revisao.md> [--repo <path>]
 *
 * ── Por que estruturado, e não frase em Markdown ──
 *
 * A versão anterior exigia a string literal `Veredito: APROVADO` no corpo do
 * relatório. `docs/reviews/_TEMPLATE.md` escreve `- [ ] **Aprovado**`. Ou seja:
 * o parser e o template discordavam, e um relatório copiado do template era
 * reprovado por motivo de *texto*, não de conteúdo. Isso é a classe de defeito
 * mais cara num gate: um gate que reprova por formalidade treina o time a
 * contorná-lo, e aí ele deixa de proteger alguma coisa.
 *
 * Por isso o contrato passou a ser o JSON que `scripts/check-decision.mjs`
 * já produz (`{ approved, verdict, counts, reasons }`), com o commit
 * informado por `--commit`. Frase em prosa não é parseável; um campo é.
 *
 * ── Compatibilidade: por que o Markdown continua aceito ──
 *
 * Trocar o contrato não pode invalidar relatórios já emitidos por `/check`.
 * Um relatório antigo é evidência de um `/check` que aconteceu; reprovar esse
 * documento faria o gate desmentir o próprio histórico. Por isso o caminho
 * `.md` segue funcionando, com aviso de depreciação em stderr e sem exigir
 * `--commit` (ele lê `Commit Avaliado:` do próprio texto).
 *
 * A remoção do caminho legado é uma decisão de dono, não uma limpeza
 * silenciosa. Enquanto ele existir, os testes cobrem os dois formatos, para
 * que a compatibilidade seja uma afirmação testada e não uma promessa.
 *
 * ── Por que `--repo` é explícito ──
 *
 * A versão anterior lia `git rev-parse HEAD` e `git status --porcelain` do
 * diretório atual, sem forma de dizer qual árvore verificar. Rodar do lugar
 * errado verificava a árvore errada, e falhava com a razão errada — pior que
 * não falhar, porque o sintoma mente sobre a causa.
 *
 * `criarRepoAlvo` transforma isso em erro explícito: sem `--repo`, o diretório
 * atual precisa ser a raiz do work tree. De dentro de um subdiretório o gate
 * recusa com a instrução do que fazer, em vez de adivinhar. Toda execução
 * imprime a árvore resolvida, para o resultado ser auditável a posteriori.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve, isAbsolute } from 'path';

const CODIGO_OK = 0;
const CODIGO_BLOQUEADO = 1;
const CODIGO_USO = 2;

function falha(mensagem, codigo = CODIGO_BLOQUEADO) {
  console.error(mensagem);
  process.exit(codigo);
}

/** Lê o repositório alvo, recusando qualquer ambiguidade sobre qual é. */
function criarRepoAlvo(repoInformado) {
  const base = repoInformado
    ? isAbsolute(repoInformado)
      ? repoInformado
      : resolve(process.cwd(), repoInformado)
    : process.cwd();

  let topo;
  try {
    topo = execFileSync('git', ['-C', base, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf-8',
    }).trim();
  } catch {
    falha(
      `Erro de contexto: "${base}" não está dentro de um repositório git.\n` +
        `Informe a árvore alvo com --repo <caminho>.`,
      CODIGO_USO,
    );
  }

  if (!existsSync(topo) || !statSync(topo).isDirectory()) {
    falha(
      `Erro de contexto: git reportou "${topo}" como raiz, mas o caminho não existe.`,
      CODIGO_USO,
    );
  }

  // Sem --repo, exigir a raiz elimina o caso silencioso: de dentro de
  // `app/artigos/`, o cwd ainda é um repo válido, mas o operador quase nunca
  // quer verificar só aquele diretório.
  if (!repoInformado && resolve(base) !== resolve(topo)) {
    falha(
      `Erro de contexto: o diretório atual (${base}) está dentro do repositório,\n` +
        `mas não é a raiz (${topo}). O gate verifica a árvore inteira, não um trecho.\n` +
        `Execute da raiz, ou seja: cd ${topo} && node scripts/check-gate.mjs ...`,
      CODIGO_USO,
    );
  }

  const git = (args) =>
    execFileSync('git', ['-C', topo, ...args], { encoding: 'utf-8' }).trim();

  let head;
  try {
    head = git(['rev-parse', 'HEAD']);
  } catch {
    falha(
      `Erro de contexto: o repositório em "${topo}" não tem HEAD.\n` +
        `Um work tree recém inicializado sem commit não tem nada para aprovar.`,
      CODIGO_USO,
    );
  }

  let sujo;
  try {
    sujo = git(['status', '--porcelain']).length > 0;
  } catch {
    falha(`Erro ao ler o status de "${topo}".`, CODIGO_USO);
  }

  return { topo, head, sujo };
}

/** Lê os argumentos, separando posicionais de opções. */
function lerArgs(argv) {
  const posicionais = [];
  let repo;
  let commit;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--repo') repo = argv[++i];
    else if (arg === '--commit') commit = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Uso: node scripts/check-gate.mjs <resultado.json|revisao.md> --commit <sha> [--repo <path>]',
      );
      process.exit(CODIGO_OK);
    } else if (arg.startsWith('--')) {
      falha(`Opção desconhecida: ${arg}\nUse --help para o uso.`, CODIGO_USO);
    } else posicionais.push(arg);
  }
  return { posicionais, repo, commit };
}

/** Valida a decisão estruturada que `check-decision.mjs` produziu. */
function validarDecisao(dados) {
  if (typeof dados.approved !== 'boolean') {
    return 'o campo "approved" está ausente ou não é booleano; o arquivo não veio de scripts/check-decision.mjs';
  }
  if (dados.approved !== true) {
    const motivos = Array.isArray(dados.reasons) ? dados.reasons : [];
    return (
      `a decisão de qualidade é REPROVADA.\n` +
      (motivos.length
        ? `  Motivos:\n${motivos.map((m) => `    - ${m}`).join('\n')}\n`
        : '') +
      `  Corrija e rode /check de novo.`
    );
  }
  return null;
}

function main() {
  const {
    posicionais,
    repo: repoInformado,
    commit: commitInformado,
  } = lerArgs(process.argv.slice(2));

  if (posicionais.length === 0) {
    falha(
      'Erro: informe o artefato de decisão (resultado.json de check-decision.mjs, ou revisao.md no formato legado).\n' +
        'Uso: node scripts/check-gate.mjs <artefato> --commit <sha> [--repo <path>]',
      CODIGO_USO,
    );
  }
  if (posicionais.length > 1) {
    falha(
      `Erro: informe um artefato por vez. Recebidos: ${posicionais.join(', ')}`,
      CODIGO_USO,
    );
  }

  const artefato = posicionais[0];
  if (!existsSync(artefato)) {
    falha(`Erro: artefato de decisão não encontrado (${artefato})`, CODIGO_USO);
  }

  const repo = criarRepoAlvo(repoInformado);
  const legado = artefato.toLowerCase().endsWith('.md');

  // ── o alvo é anunciado antes da validação, sempre ──
  // Um gate que falha sem dizer sobre o que falhou obriga o operador a
  // adivinhar qual árvore foi verificada.
  console.error(`Árvore verificada: ${repo.topo}`);
  console.error(`HEAD: ${repo.head}`);

  if (repo.sujo) {
    falha(
      `Bloqueado: a árvore tem alterações não commitadas (working tree suja).\n` +
        `O código em teste pode divergir do conteúdo que /check revisou.\n` +
        `Commite ou descarte as alterações, ou aponte --repo para a árvore certa.`,
    );
  }

  let revisto;
  if (legado) {
    console.error(
      'Aviso: formato legado (.md) DEPRECADO, ainda aceito para não invalidar\n' +
        'relatórios já emitidos por /check antes do contrato estruturado.\n' +
        'Novo formato: resultado.json de scripts/check-decision.mjs + --commit <sha>.',
    );
    const conteudo = readFileSync(artefato, 'utf-8');
    const achou = conteudo.match(/Commit Avaliado:\s*([a-f0-9]{7,40})/i);
    if (!achou) {
      falha(
        "Erro: o relatório legado não contém 'Commit Avaliado: <sha>'.\n" +
          'No formato novo isso vem por --commit.',
        CODIGO_USO,
      );
    }
    revisto = achou[1];
    if (!/Veredito: APROVADO/.test(conteudo)) {
      falha(
        'Bloqueado: o relatório legado não registra aprovação no formato do gate.\n' +
          "Este gate reconhece 'Veredito: APROVADO'. O template histórico escreve " +
          "'- [ ] **Aprovado**', que é incompatível — por isso o formato novo é JSON.",
      );
    }
  } else {
    let dados;
    try {
      dados = JSON.parse(readFileSync(artefato, 'utf-8'));
    } catch {
      falha(
        'Erro: o artefato não é JSON válido.\n' +
          'Esperado: a saída de scripts/check-decision.mjs.',
        CODIGO_USO,
      );
    }
    const problema = validarDecisao(dados);
    if (problema) falha(`Bloqueado: ${problema}`);
    if (!commitInformado) {
      falha(
        'Erro: --commit é obrigatório no formato estruturado.\n' +
          'O gate liga a decisão a um commit; sem ele, uma aprovação antiga\n' +
          'continuaria valendo para código novo.',
        CODIGO_USO,
      );
    }
    revisto = commitInformado;
  }

  const abreviado = repo.head === revisto || repo.head.startsWith(revisto);
  if (!abreviado) {
    falha(
      `Bloqueado: o conteúdo mudou.\n` +
        `  HEAD atual:        ${repo.head}\n` +
        `  commit aprovado:   ${revisto}\n` +
        `Um commit novo invalida a aprovação. Rode /check de novo.`,
    );
  }

  console.log(
    `Gate aprovado. Commit ${revisto} coberto por decisão aprovada em ${repo.topo}.`,
  );
  process.exit(CODIGO_OK);
}

main();
