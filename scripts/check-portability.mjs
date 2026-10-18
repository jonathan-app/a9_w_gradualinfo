#!/usr/bin/env node
/**
 * @fileoverview Guarda de portabilidade e convenções do catálogo de skills.
 * @module scripts/check-portability
 * @description Valida cada skill ativa e impõe as convenções cruzadas (multi-ferramenta) da
 *   suíte canônica de workflow: frontmatter, orçamentos de tamanho, estilo de prosa, adapters
 *   e paridade byte a byte de blocos de contrato. Também valida a estrutura do catálogo
 *   (`.agents/skills` ↔ `.claude/skills`).
 * @dependencies node:fs (leitura recursiva de `.md` e frontmatter), node:path.
 *
 * Quando executado: via `pnpm run check:skills`, etapa do `pnpm run validate`.
 * Lê: `.agents/skills/<nome>/**` (e `.claude/skills/<nome>/**` para os ponteiros),
 *   `.agents/skills/<nome>/agents/openai.yaml`.
 * Escreve: nada — apenas relata violações/avisos e imprime relatórios de tamanho em stdout.
 * Códigos de saída: 0 = catálogo válido; 1 = qualquer violação (`process.exitCode`, para
 *   não truncar a lista ao passar por pipe).
 *
 * As 11 regras abaixo (numeração preservada do código):
 *  1. Toda skill de workflow canônica declara `allowed-tools` no frontmatter.
 *  2. Nenhuma skill hardcoda um alias de modelo exclusivo do Claude como diretiva de spawn
 *     (`model: "haiku|sonnet|opus|fable"`) — use palavras de papel (role).
 *     Convenção: instruções de spawn DEFINEM o modelo do subagente explicitamente como
 *     ação ("set the model explicitly; do not inherit the session model"), redigida em
 *     palavras de papel (um tier rápido e de baixo custo / um modelo forte), com o alias
 *     da ferramenta apenas como exemplo não aspas — caso contrário os subagentes herdam o
 *     (frequentemente caro) modelo da sessão principal.
 *  3. Nenhuma skill NOMEIA a ferramenta de subagente na prosa ("the Agent tool",
 *     "spawn an Agent", "the Task tool") — fique orientado a capacidade.
 *  4. Nenhum shell glue não-git que quebra no PowerShell no corpo de um SKILL.md
 *     (`>/dev/null`, `&& BASE=`, `|| BASE=`) — expresse a seleção da branch base como
 *     prosa (os próprios comandos git são aceitáveis).
 *  5. `SKILL.md` e assets de prompt vinculados ficam dentro dos orçamentos de bytes — o
 *     corpo do SKILL carrega no contexto principal a cada invocação, e os assets de prompt
 *     carregam nos contextos de subagente quando usados.
 *  6. A `description` do frontmatter fica abaixo de 400 caracteres — a description de toda
 *     skill instalada carrega em toda sessão.
 *  7. Toda skill de lifecycle distribui seu adapter do OpenAI Codex (`agents/openai.yaml`)
 *     com os campos `interface:` presentes.
 *  8. `allowed-tools` nomeia a ferramenta de subagente `Agent`, não o legado `Task`.
 *  9. Um bloco de contrato marcado e duplicado entre skills permanece idêntico byte a byte.
 * 10. Nenhum em dash ou en dash em qualquer arquivo de instrução ou `description` (as skills
 *     ensinam a regra do sem travessão, então a própria prosa dela obedece).
 * 11. Nenhum hífen na prosa. Compostos viram palavras simples (read only, não read-only).
 *     Código, caminhos, flags, palavras-chave EM CAIXA ALTA e os literais analisados
 *     (in-progress, gap-fill, whole-repo, Follow-up, pre-flight) mantêm os seus.
 *
 * Os orçamentos (regra 5) também são reportados como utilização em toda execução, e tudo
 * acima de WARN_AT é sinalizado enquanto ainda está passando. Veja BUDGET POLICY abaixo.
 *
 * Todo `.md` da suíte canônica de workflow obedece a todas as regras. A antiga isenção de
 * `templates/` valia para cinco brand design systems vinculados; eles foram removidos e os
 * quatro templates de documento restantes são literalmente a prosa que a skill emite, então
 * precisam seguir as mesmas regras de estilo de todo o resto.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Resolve a pasta canônica: `.agents/skills/` na raiz do repo, ou `skills/` quando o
// script é executado a partir de dentro do próprio pacote de skills.
const SKILLS_DIR = existsSync(
  new URL('../.agents/skills/', import.meta.url).pathname,
)
  ? new URL('../.agents/skills/', import.meta.url).pathname
  : new URL('../skills/', import.meta.url).pathname;
const CLAUDE_SKILLS_DIR = new URL('../.claude/skills/', import.meta.url)
  .pathname;

// Suíte de lifecycle: as skills que precisam de adapter OpenAI (regra 7) e seguem o estilo.
const LIFECYCLE_SUITE = new Set([
  'architect',
  'audit',
  'check',
  'debug',
  'develop',
  'document',
  'scope',
  'security',
  'sync',
  'test',
]);

// Skills canônicas realmente auditadas pela regra de prosa (o catálogo inteiro é checado
// na seção de estrutura abaixo).
const CANONICAL_CORE_SKILLS = new Set([
  ...LIFECYCLE_SUITE,
  'replay-vision-scanner-broken-experiences',
  'replay-vision-scanners-core',
  'replay-vision-scanner-user-frustration',
]);

const violations = [];
const warnings = []; // acima de WARN_AT mas ainda dentro do orçamento — visível, não fatal
const sizes = []; // { rel, words, bytes } por arquivo .md, para o relatório de contagem de palavras

// Orçamentos da regra 5. O padrão é o teto de uma skill de fase enxuta; as exceções são
// sobrescritas já herdadas — reduza-as quando os arquivos encolherem, jamais aumente.
//
// BUDGET POLICY. Um orçamento é um alvo com folga para trabalhar, não uma marca d'água.
// Cada teto abaixo foi calibrado em torno de WARN_AT acima do tamanho real do arquivo,
// então uma edição normal cai no verde e só crescimento genuíno dispara o guard. Ajustar
// um teto ao número de bytes atual (o que estes costumavam ser: quatro grupos em 98-99,9%,
// um com 54 bytes de folga) faz o guard disparar em toda edição, e a única forma de passar
// por um guard que sempre dispara é elevá-lo — é assim que um orçamento deixa de significar
// algo. Quando um caminho estourar, encolha os arquivos. Eleve um teto apenas quando o
// caminho realmente precisar carregar mais, e diga por quê.
//
// A utilização é impressa em toda execução, e tudo acima de WARN_AT é sinalizado antes de
// quebrar, então a deriva fica visível enquanto ainda é barata de corrigir.
const WARN_AT = 0.9;
const SKILL_BYTE_BUDGET = 32 * 1024;
const SKILL_BYTE_OVERRIDES = {};
const SUPPORT_MD_BYTE_BUDGET = 24 * 1024;
const SUPPORT_MD_OVERRIDES = {
  // Prompt comum de escrita de spec; reduza novamente após podar mais regras comuns.
  'architect/agent-prompt.md': 32 * 1024,
  // O percurso de design na thread principal; a descoberta de tools foi movida para
  // internal/tool-discovery.md; quebre por stage se este arquivo crescer mais.
  'architect/internal/design-conversation.md': 29 * 1024,
};
// Teto de caracteres da description do frontmatter (regra 6) — carrega em toda sessão.
const DESCRIPTION_CHAR_CAP = 400;
// Orçamentos agregados por caminho quente (regra 5b): combinam os arquivos que uma execução
// real carrega na thread principal. `required` sempre entra; de `oneOf` entra apenas o maior.
const HOT_PATH_BUDGETS = [
  {
    name: 'architect main full-design path',
    budget: 72 * 1024,
    required: [
      'architect/SKILL.md',
      'architect/internal/design-conversation.md',
      'architect/internal/after-subagent.md',
    ],
  },
  {
    name: 'architect subagent write path',
    budget: 56 * 1024,
    required: ['architect/agent-prompt.md', 'architect/spec-template.md'],
    oneOf: [
      'architect/agent-modes/feature.md',
      'architect/agent-modes/architecture.md',
      'architect/agent-modes/enhancement.md',
      'architect/agent-modes/cross-cutting.md',
    ],
  },
  {
    // O plano lê o router + uma variante de forma de repositório + uma persona de
    // abordagem de build escolhida (todas as quatro personas têm ~2.7KB, então facade.md
    // representa o conjunto).
    name: 'scope plan path',
    budget: 48 * 1024,
    required: [
      'scope/SKILL.md',
      'scope/modes/plan.md',
      'scope/scope-template.md',
      'scope/approaches/facade.md',
    ],
    oneOf: [
      'scope/modes/plan-greenfield.md',
      'scope/modes/plan-brownfield.md',
      'scope/modes/plan-monorepo.md',
    ],
  },
  {
    name: 'scope replan/add path',
    budget: 25 * 1024,
    required: ['scope/SKILL.md', 'scope/scope-template.md'],
    oneOf: ['scope/modes/replan.md', 'scope/modes/add.md'],
  },
  {
    // A metade dos arquivos de referência de uma build de UI, verificada sozinha para que
    // um guide inchado seja atribuível. A leitura completa na thread principal é o grupo
    // de união abaixo.
    //
    // Elevado de 48K -> 52K quando os cinco templates de brand vinculados foram apagados.
    // `ui/generate.md` cresceu ~2.6KB para carregar as regras de derivação (acento, escada
    // neutra, verificação WCAG, escala tipográfica modular) que aqueles 177KB de templates
    // costumavam fornecer por exemplo. Uma build de UI do zero agora carrega ~39KB A MENOS
    // no total, porque nenhum template de ~43KB é mais lido atrás deste caminho. Este é um
    // caminho que genuinamente precisa carregar mais, não um ajuste para esquivar de um
    // estouro.
    name: 'develop UI path',
    budget: 52 * 1024,
    required: ['develop/ui-guide.md', 'develop/ui/implementation.md'],
    oneOf: [
      'develop/ui/mcp.md',
      'develop/ui/image.md',
      'develop/ui/existing.md',
      'develop/ui/generate.md',
    ],
  },
  {
    // Leitura de pior caso na thread principal: router + varredura de tool-skills
    // (apenas greenfield/whole-repo) + o maior arquivo de modo de fase único.
    //
    // Elevado de 25K -> 26K quando o Agent Skill e o gate de consentimento de MCP chegaram
    // em `modes/tool-skills.md`. Esse gate é comportamento obrigatório (nada pode ser
    // pesquisado antes de o engenheiro concordar), então este caminho genuinamente carrega
    // mais. Pago em parte pela poda do bloco de Portability duplicado em SKILL.md.
    name: 'audit phase path',
    budget: 26 * 1024,
    required: ['audit/SKILL.md', 'audit/modes/tool-skills.md'],
    oneOf: [
      'audit/modes/greenfield.md',
      'audit/modes/whole-repo.md',
      'audit/modes/area.md',
      'audit/modes/gapfill.md',
    ],
  },
  {
    // Caminho de setup da primeira execução lê a espinha do router mais modes/setup.md;
    // o caminho comum de escrita lê só o router (o orçamento do SKILL.md o cobre).
    name: 'test setup path',
    budget: 26 * 1024,
    required: ['test/SKILL.md', 'test/modes/setup.md'],
  },
  {
    // Caminho de build: router do gate + fluxo de build pós-gate + o maior guia de track.
    // O caminho só-gate (rota para /architect) lê apenas SKILL.md.
    name: 'develop build path',
    budget: 51 * 1024,
    required: ['develop/SKILL.md', 'develop/flow/build.md'],
    oneOf: ['develop/ui-guide.md', 'develop/logical-guide.md'],
  },
  {
    // A leitura real mais pesada da suíte, e aquela que os dois grupos de develop acima
    // perdem: eles se sobrepõem em ui-guide.md e nunca somam, então nada vigiava o que
    // uma build de UI realmente carrega na thread principal. Esta é agora a leitura
    // completa: os templates de brand foram embora, então nada mais carrega de forma
    // preguiçosa atrás dele, e `ui/generate.md` deriva o sistema em vez de copiar um.
    name: 'develop UI build path (full main-thread read)',
    budget: 90 * 1024,
    required: [
      'develop/SKILL.md',
      'develop/flow/build.md',
      'develop/ui-guide.md',
      'develop/ui/implementation.md',
      'develop/checklist.md',
    ],
    oneOf: [
      'develop/ui/mcp.md',
      'develop/ui/image.md',
      'develop/ui/existing.md',
      'develop/ui/generate.md',
    ],
  },
];

/**
 * Percorre recursivamente um diretório aplicando `check` em cada `.md`.
 *
 * @param dir - Caminho absoluto do diretório a varrer.
 * @returns Os resultados são acumulados nos arrays globais `violations`/`sizes`.
 */
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry.endsWith('.md')) check(p);
  }
}

/**
 * Extrai o bloco de frontmatter (`--- ... ---`) de um Markdown.
 *
 * @param text - Conteúdo do arquivo.
 * @returns Interior do frontmatter, ou string vazia se não houver.
 */
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

// Auxiliares da regra 11. Prosa não carrega hífen; código carrega. Mascara toda região
// isenta com espaços (nunca apaga, para os offsets em bytes continuarem mapeando linhas);
// depois, qualquer palavra hifenizada restante é prosa e precisa ser reescrita em palavras
// simples.
const MASK = (s) => ' '.repeat(s.length);
function proseOnly(text) {
  return (
    text
      .replace(/```[\s\S]*?```/g, MASK) // blocos de código cercados (fences)
      .replace(/`[^`\n]+`/g, MASK) // trechos de código inline
      .replace(/<!--[\s\S]*?-->/g, MASK) // comentários HTML (marcadores de contrato)
      .replace(/\]\([^)]*\)/g, MASK) // alvos de link Markdown
      .replace(/https?:\/\/\S+/g, MASK) // URLs cruas
      // As chaves do frontmatter são definidas pela spec do Agent Skills (`allowed-tools`),
      // então só o valor de description é prosa. Mascara as chaves, mantém a description.
      .replace(/^---\n[\s\S]*?\n---/m, (fm) =>
        fm
          .split('\n')
          .map((l) => (/^description:/.test(l) ? l : MASK(l)))
          .join('\n'),
      )
  );
}
// Coisas nomeadas com as quais as skills FAZEM MATCH: valores que elas escrevem em
// artefatos, nomes de fase e títulos de seção. Renomear uma delas é migração entre skills,
// não edição de texto, então esses termos mantêm o hífen em qualquer lugar, com ou sem
// backticks.
//   in-progress, gap-fill, whole-repo  valores e nomes de fase lidos por outras skills
//   Follow-up                          um título de seção de spec
//   pre-flight                         a fase nomeada que toda skill rola antes de agir
const PARSED_LITERALS = new Set([
  'in-progress',
  'gap-fill',
  'whole-repo',
  'Follow-up',
  'follow-up',
  'pre-flight',
  'Pre-flight',
]);
// Exime termos em CAIXA ALTA com hífen (palavras-chave tipo ALL-CAPS, siglas e paths
// codificados) e os literais analisados pelas skills.
const isExemptTerm = (w) =>
  /^[A-Z0-9-]+$/.test(w) ||
  PARSED_LITERALS.has(w) ||
  ['axe-core', 'ts-ignore'].includes(w);

/**
 * Aplica as regras 1–6, 10 e 11 a um único arquivo Markdown da suíte canônica.
 *
 * Arquivos de skills fora de `CANONICAL_CORE_SKILLS` são ignorados aqui (a estrutura do
 * catálogo ainda é checada depois). As mensagens de violação são emitidas em inglês por
 * contrato com o relatório histórico do gate.
 *
 * @param path - Caminho absoluto do arquivo `.md`.
 * @returns Empurra entradas para os arrays globais `violations`, `warnings` e `sizes`.
 */
function check(path) {
  const rel = path.slice(SKILLS_DIR.length);
  const skill = rel.split('/')[0];
  if (!CANONICAL_CORE_SKILLS.has(skill)) {
    return;
  }
  const text = readFileSync(path, 'utf8');
  const isSkillMd = rel.endsWith('/SKILL.md');

  // Dados do relatório de contagem de palavras (complemento da regra 5): rastreia todo .md
  // para que uma regressão de tamanho em arquivo quente fique visível num relance, e não
  // apenas quando estourar o orçamento.
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  sizes.push({ rel, words, bytes: Buffer.byteLength(text, 'utf8') });

  // Regra 1 — allowed-tools em todo SKILL.md
  if (isSkillMd && !/^allowed-tools:/m.test(frontmatter(text))) {
    violations.push(`${rel}: missing \`allowed-tools\` in frontmatter`);
  }

  // Regra 8 — a ferramenta de subagente é `Agent`. O Claude Code renomeou `Task` para
  // `Agent` na 2.1.63 e mantém `Task` apenas como alias retrocompatível; declare o nome real.
  if (isSkillMd) {
    const at = frontmatter(text).match(/^allowed-tools:\s*(.*)$/m);
    if (at && /\bTask\b/.test(at[1])) {
      violations.push(
        `${rel}: allowed-tools declares \`Task\` — the subagent tool is now \`Agent\` (Task is a legacy alias)`,
      );
    }
  }

  if (isSkillMd) {
    const skill = rel.split('/')[0];

    // Regra 5 — orçamento de bytes do SKILL.md
    const budget = SKILL_BYTE_OVERRIDES[skill] ?? SKILL_BYTE_BUDGET;
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > budget) {
      violations.push(
        `${rel}: ${bytes} bytes exceeds its budget of ${budget} — condense or split before it lands`,
      );
    } else if (bytes / budget > WARN_AT) {
      warnings.push(
        `${rel}: ${bytes}/${budget} bytes (${((100 * bytes) / budget).toFixed(1)}% of budget)`,
      );
    }

    // Regra 6 — teto de caracteres da description
    const desc = frontmatter(text).match(/^description:\s*"([\s\S]*?)"\s*$/m);
    if (desc && desc[1].length > DESCRIPTION_CHAR_CAP) {
      violations.push(
        `${rel}: description is ${desc[1].length} chars (cap ${DESCRIPTION_CHAR_CAP}) — it loads into every session`,
      );
    } else if (desc && desc[1].length / DESCRIPTION_CHAR_CAP > WARN_AT) {
      warnings.push(
        `${rel}: description is ${desc[1].length}/${DESCRIPTION_CHAR_CAP} chars — trim it, it loads into every session`,
      );
    }
    // Regra 10 também para a description. A varredura linha a linha abaixo pula o
    // frontmatter, e a description é a prosa mais carregada da suíte.
    if (desc && /[—–]/.test(desc[1])) {
      violations.push(
        `${rel}: description contains an em or en dash — it loads into every session and must obey the no-dash rule`,
      );
    }
  } else {
    // Regra 5 — orçamento de bytes dos prompts/guides vinculados
    const budget = SUPPORT_MD_OVERRIDES[rel] ?? SUPPORT_MD_BYTE_BUDGET;
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > budget) {
      violations.push(
        `${rel}: ${bytes} bytes exceeds its support-file budget of ${budget} — condense or split before it lands`,
      );
    } else if (bytes / budget > WARN_AT) {
      warnings.push(
        `${rel}: ${bytes}/${budget} bytes (${((100 * bytes) / budget).toFixed(1)}% of support-file budget)`,
      );
    }
  }

  // Regra 11 — nenhum hífen na prosa. Código, caminhos, flags, palavras-chave EM CAIXA
  // ALTA e os literais analisados mantêm os seus; compostos comuns viram palavras simples.
  {
    const masked = proseOnly(text);
    const seen = new Set();
    for (const m of masked.matchAll(
      /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+/g,
    )) {
      if (isExemptTerm(m[0])) continue;
      const line = masked.slice(0, m.index).split('\n').length;
      const key = `${line}:${m[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push(
        `${rel}:${line}: hyphen in prose \`${m[0]}\` — write it as simple words (code, paths, and flags keep theirs)`,
      );
    }
  }

  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;
    // Guarda grosseira de frontmatter: as primeiras 6 linhas de um SKILL.md são omitidas
    // da varredura linha a linha (o frontmatter é coberto pelas regras 1, 6 e 10 acima).
    const fm = isSkillMd && i < 6;
    if (fm) return;

    // Regra 2 — nenhuma diretiva de spawn com alias de modelo hardcodado
    if (/model:\s*"(haiku|sonnet|opus|fable)"/.test(line)) {
      violations.push(
        `${rel}:${n}: hardcoded model alias — use role words ("a fast, low-cost model" / "a strong model")`,
      );
    }
    // Regra 3 — nenhuma nomeação de ferramenta na prosa
    if (
      /\bthe [`"]?(Agent|Task)[`"]? tool\b/i.test(line) ||
      /spawn an [`"]?Agent\b/i.test(line)
    ) {
      violations.push(
        `${rel}:${n}: names the subagent tool in prose — stay capability-first ("spawn a subagent")`,
      );
    }
    // Regra 4 — nenhum shell glue que quebra o PowerShell no corpo de um SKILL.md
    if (
      isSkillMd &&
      (/>\/dev\/null/.test(line) ||
        /&&\s*BASE=/.test(line) ||
        /\|\|\s*BASE=/.test(line))
    ) {
      violations.push(
        `${rel}:${n}: non-portable shell glue (\`>/dev/null\`/\`&& BASE=\`) — express base-branch selection as prose`,
      );
    }
    // Regra 10 — o corpus obedece à regra do sem travessão que ele ensina. Toda skill diz
    // ao modelo para emitir sem em/en dash; um arquivo de instruções cheio deles é o
    // exemplo errado, e o modelo escreve no registro do seu contexto. Hífens simples em
    // compostos e flags são aceitáveis; apenas U+2014 e U+2013 são proibidos.
    if (/[—–]/.test(line)) {
      violations.push(
        `${rel}:${n}: contains an em or en dash — the skills mandate no dashes, so their own prose carries none (use a comma, a colon, or parentheses)`,
      );
    }
  });
}

walk(SKILLS_DIR.replace(/\/$/, ''));

// A estrutura do catálogo se aplica a toda skill ativa, inclusive especialistas importados
// que propositalmente não seguem o estilo de prosa do workflow.
const skillEntries = readdirSync(SKILLS_DIR)
  .filter((entry) => statSync(join(SKILLS_DIR, entry)).isDirectory())
  .sort();
const skillEntrySet = new Set(skillEntries);

for (const entry of skillEntries) {
  const skillMd = join(SKILLS_DIR, entry, 'SKILL.md');
  if (!existsSync(skillMd)) {
    violations.push(`${entry}: missing SKILL.md`);
    continue;
  }

  const text = readFileSync(skillMd, 'utf8');
  const fm = frontmatter(text);
  // `name` no frontmatter precisa ser idêntico ao nome do diretório: é como as
  // ferramentas resolvem a skill a partir de uma invocação `/nome`.
  const declaredName = fm
    .match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]
    ?.trim();
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (declaredName !== entry) {
    violations.push(
      `${entry}/SKILL.md: frontmatter name is ${declaredName ?? 'missing'}, expected ${entry}`,
    );
  }
  if (!description) {
    violations.push(`${entry}/SKILL.md: missing frontmatter description`);
  } else if (
    description.replace(/^['"]|['"]$/g, '').length > DESCRIPTION_CHAR_CAP
  ) {
    violations.push(
      `${entry}/SKILL.md: description exceeds ${DESCRIPTION_CHAR_CAP} characters`,
    );
  }

  // Toda skill canônica precisa do adapter em `.claude/skills`, apontando de volta para o
  // `.agents` — sem ponteiro, o Claude Code não enxerga a definição canônica.
  const pointer = join(CLAUDE_SKILLS_DIR, entry, 'SKILL.md');
  if (!existsSync(pointer)) {
    violations.push(`${entry}: missing .claude skill pointer`);
    continue;
  }
  const pointerText = readFileSync(pointer, 'utf8');
  const canonicalTarget = `.agents/skills/${entry}/SKILL.md`;
  if (!pointerText.includes(canonicalTarget)) {
    violations.push(
      `${entry}: .claude skill pointer does not target ${canonicalTarget}`,
    );
  }
}

// Ponteiro órfão: adaptador em `.claude/skills` sem skill canônica correspondente indica
// que a skill foi renomeada/removida e o adapter ficou para trás.
if (existsSync(CLAUDE_SKILLS_DIR)) {
  for (const entry of readdirSync(CLAUDE_SKILLS_DIR)) {
    const dir = join(CLAUDE_SKILLS_DIR, entry);
    if (statSync(dir).isDirectory() && !skillEntrySet.has(entry)) {
      violations.push(
        `${entry}: .claude skill pointer has no canonical .agents skill`,
      );
    }
  }
}

// Regra 5b — orçamentos agregados por caminho quente. Estes modelam a maior combinação
// que uma execução normal deveria precisar depois que os arquivos de router carregam as
// referências selecionadas.
for (const group of HOT_PATH_BUDGETS) {
  let bytes = 0;
  for (const rel of group.required) {
    bytes += Buffer.byteLength(
      readFileSync(join(SKILLS_DIR, rel), 'utf8'),
      'utf8',
    );
  }
  if (group.oneOf) {
    // De `oneOf` só o arquivo maior conta: são alternativas, não um conjunto cumulativo.
    let largest = 0;
    let largestRel = '';
    for (const rel of group.oneOf) {
      const size = Buffer.byteLength(
        readFileSync(join(SKILLS_DIR, rel), 'utf8'),
        'utf8',
      );
      if (size > largest) {
        largest = size;
        largestRel = rel;
      }
    }
    bytes += largest;
    group.detail = ` (largest optional: ${largestRel})`;
  }
  group.bytes = bytes;
  if (bytes > group.budget) {
    violations.push(
      `${group.name}: ${bytes} bytes exceeds hot-path budget of ${group.budget}${group.detail ?? ''}`,
    );
  } else if (bytes / group.budget > WARN_AT) {
    warnings.push(
      `${group.name}: ${bytes}/${group.budget} bytes (${((100 * bytes) / group.budget).toFixed(1)}% of budget) — shrink it before it breaks`,
    );
  }
}

// Regra 9 — os blocos de contrato compartilhados permanecem idênticos byte a byte entre
// as skills que os carregam. Skills são instaladas como pastas independentes, então uma
// regra que duas skills precisam obedecer não pode viver em um único arquivo compartilhado;
// ela é duplicada de propósito e fixada aqui. Cada bloco precisa aparecer em ao menos duas
// skills, senão não há contraparte para comparar.
const CONTRACT_BLOCK = /<!-- ([A-Z-]+):START[^>]*-->([\s\S]*?)<!-- \1:END -->/g;
const contracts = new Map(); // nome -> [{ rel, body }]
for (const s of sizes) {
  const text = readFileSync(join(SKILLS_DIR, s.rel), 'utf8');
  for (const [, name, body] of text.matchAll(CONTRACT_BLOCK)) {
    if (!contracts.has(name)) contracts.set(name, []);
    contracts.get(name).push({ rel: s.rel, body: body.trim() });
  }
}
for (const [name, copies] of contracts) {
  if (copies.length < 2) {
    violations.push(
      `${copies[0].rel}: contract block \`${name}\` appears only once — inline it or add its counterpart`,
    );
    continue;
  }
  const [first, ...rest] = copies;
  for (const other of rest) {
    if (other.body !== first.body) {
      violations.push(
        `contract block \`${name}\` has drifted: ${first.rel} and ${other.rel} differ — they must stay byte-identical`,
      );
    }
  }
}

// Regra 7 — toda skill em LIFECYCLE_SUITE distribui seu adapter do OpenAI Codex
for (const entry of readdirSync(SKILLS_DIR)) {
  const dir = join(SKILLS_DIR, entry);
  if (!statSync(dir).isDirectory()) continue;
  if (!LIFECYCLE_SUITE.has(entry)) continue;
  const adapter = join(dir, 'agents', 'openai.yaml');
  if (!existsSync(adapter)) {
    violations.push(
      `${entry}: missing agents/openai.yaml (OpenAI Codex adapter)`,
    );
  } else {
    const y = readFileSync(adapter, 'utf8');
    for (const field of [
      'interface:',
      'display_name:',
      'short_description:',
      'default_prompt:',
    ]) {
      if (!y.includes(field))
        violations.push(
          `${entry}/agents/openai.yaml: missing \`${field.replace(':', '')}\` field`,
        );
    }
  }
}

const failed = violations.length > 0;
if (failed) {
  console.error(
    `Portability check FAILED (${violations.length}):\n` +
      violations.map((v) => '  - ' + v).join('\n'),
  );
  // Define o código e deixa o Node sair sozinho depois que o stdio drenar.
  // `process.exit()` derruba o processo antes que uma escrita grande em buffer chegue a um
  // pipe — o que truncava silenciosamente esta lista sob `| grep` e na CI.
  process.exitCode = 1;
}

if (!failed) {
  console.log(
    `\nCatalog structure: ${skillEntries.length} active skills and Claude pointers validated.`,
  );
  // Relatório de contagem de palavras — os arquivos de instrução mais pesados (templates
  // excluídos; são dados de referência), para que uma regressão lenta de tamanho fique
  // visível antes de estourar um orçamento. O custo de carregamento acompanha as palavras
  // tanto quanto os bytes.
  const report = sizes.sort((a, b) => b.bytes - a.bytes).slice(0, 15);
  const pad = Math.max(...report.map((s) => s.rel.length));
  console.log('\nHeaviest instruction files (words · bytes):');
  for (const s of report) {
    console.log(
      `  ${s.rel.padEnd(pad)}  ${String(s.words).padStart(5)} w · ${String(s.bytes).padStart(6)} b`,
    );
  }

  // Utilização dos caminhos quentes — o que cada execução real carrega, contra o seu
  // orçamento. Um orçamento sem folga nenhuma é um estouro, não um orçamento; então
  // mostre a folga.
  const hpPad = Math.max(...HOT_PATH_BUDGETS.map((g) => g.name.length));
  console.log('\nHot-path budgets (bytes used / budget · utilization):');
  for (const g of HOT_PATH_BUDGETS) {
    const pct = (100 * g.bytes) / g.budget;
    const flag = pct > 100 * WARN_AT ? '  <-- shrink this' : '';
    console.log(
      `  ${g.name.padEnd(hpPad)}  ${String(g.bytes).padStart(6)} / ${String(g.budget).padStart(6)}  ${pct.toFixed(1).padStart(5)}%${flag}`,
    );
  }

  if (warnings.length) {
    console.log(
      `\nWARNINGS (${warnings.length}) — under budget, over ${100 * WARN_AT}%, fix before they fail:`,
    );
    for (const w of warnings) console.log('  - ' + w);
  }

  console.log(
    '\nPortability check passed — the full catalog is valid and the canonical workflow suite follows the cross-tool conventions.',
  );
}
