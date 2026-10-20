/**
 * @fileoverview Avaliação mecânica das evidências de CI: casos por AC e log do pgTAP.
 * @module scripts/ci-assess
 * @description Funções puras que traduzem o relatório JSON do Playwright e o log do pgTAP em
 *   `PASS`/`FAIL`/`UNVERIFIABLE`. É a espinha dorsal de `ci-check-results.mjs`: um AC só
 *   recebe PASS quando TODOS os casos nomeados em `requiredCases` existem, rodam sem skip e
 *   passam. Ausência de prova vira UNVERIFIABLE, nunca PASS — sem essa distinção o gate leria
 *   "o job não errou" como prova de requisito atendido.
 * @dependencies nenhuma importação: módulo puro, consumido por `scripts/ci-check-results.mjs`
 *   (job `check-gate`) e por `__tests__/unit/ci-assess.test.ts`.
 *
 * Quando executado: nunca direto — importado pelos arquivos acima.
 * Lê: nada em disco; relatório e log chegam por parâmetro.
 * Escreve: nada.
 * Códigos de saída: definidos pelos CLIs que importam.
 */
// Critérios mecânicos exigem casos específicos, não apenas exit 0 do job.
/**
 * Mapa de AC para os títulos de caso que a suíte E2E precisa declarar.
 *
 * A chave é o id canônico da spec (`md-0002/AC-n`); o valor é a lista exata de títulos de
 * teste. Um AC sem entrada aqui é deliberadamente inelegível (vira `UNVERIFIABLE`): a
 * avaliação nunca aprova o que ninguém mapeou, para que acrescentar um AC à spec exija
 * declarar a prova dele e não apenas deixar o job passar.
 */
export const requiredCases = {
  'md-0002/AC-01': ['composição Cambridge, destaque e limites'],
  'md-0002/AC-02': ['variantes refletem os campos próprios do banco'],
  'md-0002/AC-03': [
    'lista vazia mostra mensagem própria',
    'falha real de transporte mostra erro, não vazio',
  ],
  'md-0002/AC-04': ['composição Cambridge, destaque e limites'],
  'md-0002/AC-05': ['HTML malicioso permanece dado'],
  'md-0002/AC-06': [
    'HTML malicioso permanece dado',
    'caminho Markdown não usa dangerouslySetInnerHTML',
  ],
  'md-0002/AC-07': [
    'inexistente, rascunho e agendado devolvem 404',
    'rascunho anônimo retorna HTTP 404',
  ],
  'md-0002/AC-08': [
    'GET antigo não autentica e POST inválido falha',
    'sessão válida lê rascunho, sem indexação e sem cache',
    'autorização vencida nega rascunho mantendo a sessão Supabase',
    'outra identidade com claim válida não lê rascunho',
    'identidade permitida sem claim não lê rascunho',
    'conta sem claim com sessão real permanece pública',
    'falha real de logout responde 503 e remove autorização local',
    'sessão Auth realmente expirada nega rascunho sem apagar cookies',
    'logout remove cookies e nega leitura',
    'cookies preservam HttpOnly, Secure e prazo em HTTPS',
  ],
  'md-0002/AC-09': ['HTML malicioso permanece dado'],
  'md-0002/AC-10': [
    'canonical e sitemap só incluem públicos',
    'sitemap preserva published_at em lastmod',
  ],
  'md-0002/AC-12': [
    'página inicial',
    'artigo publicado',
    'teclado chega ao conteúdo com foco visível',
  ],
  'md-0002/AC-13': [
    'fontes preservam dados e isolamento do Markdown',
    'artigo sem fontes omite a seção',
  ],
};
/**
 * Achata a árvore de suítes do relatório do Playwright em uma lista de casos.
 *
 * @param report - Relatório `results.json` do Playwright (`report.suites` na raiz).
 * @returns Lista de `{ file, title, tests }`, um por spec de qualquer profundidade. `file` é
 *   herdado da suíte pai quando o spec não o declara — é assim que o caminho do arquivo
 *   sobrevive ao aninhamento de describes.
 */
export function collectCases(report) {
  const cases = [];
  const walk = (suite, file = '') => {
    file = suite.file ?? file;
    for (const spec of suite.specs ?? [])
      cases.push({
        file: spec.file ?? file,
        title: spec.title,
        tests: spec.tests ?? [],
      });
    for (const child of suite.suites ?? []) walk(child, file);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return cases;
}
/**
 * Avalia um AC contra o relatório do Playwright.
 *
 * A função nunca devolve "não sei, talvez": qualquer lacuna de prova é `UNVERIFIABLE`, e
 * `PASS` exige que todos os casos exigidos tenham existido, não pulado e reprovado em nada.
 * Isso mantém o job final reprovado quando a evidência falta, em vez de criar aprovação
 * artificial.
 *
 * @param {string} id - Id canônico do AC na spec (ex.: `md-0002/AC-08`).
 * @param report - Relatório `results.json` do Playwright; `null`/com `errors` é
 *   `UNVERIFIABLE`.
 * @returns {'PASS'|'FAIL'|'UNVERIFIABLE'} `FAIL` só quando existe prova de falha; `PASS`
 *   só quando toda a prova exigida existe e passa.
 */
export function assessAC(id, report) {
  const required = requiredCases[id];
  // AC sem mapeamento, relatório ausente ou erros globais do runner: nada abaixo seria
  // confiável, então a resposta é "não dá para avaliar", nunca PASS por omissão.
  if (!required || !report || report.errors?.length) return 'UNVERIFIABLE';
  const cases = collectCases(report);
  let failure = false;
  for (const title of required) {
    // O Playwright prefixa o título do spec com o describe, então casa o título exato ou
    // o sufixo ": título" — a mesma flexibilidade para o id do AC viver no nome do spec.
    const matching = cases.filter(
      (item) => item.title === title || item.title.endsWith(`: ${title}`),
    );
    // Exatamente um caso com aquele título: zero significa que a suíte nem roda o cenário,
    // e mais de um significa título ambíguo (duas specs iguais). Nos dois casos a prova é
    // inexistente ou imprecisa, e o gate não pode escolher qual delas valeria.
    if (matching.length !== 1 || !matching[0].tests.length)
      return 'UNVERIFIABLE';
    for (const test of matching[0].tests) {
      // Caminho da evidência inutilizável: execução marcada para falhar, sem resultados ou
      // com resultado pulado/interrupção. Retorna cedo porque nada adiante poderia resgatar
      // uma prova que não aconteceu por completo.
      if (
        test.expectedStatus !== 'passed' ||
        !test.results?.length ||
        test.results.some(
          (result) =>
            result.status === 'skipped' || result.status === 'interrupted',
        )
      )
        return 'UNVERIFIABLE';
      // Caminho da prova de falha: acumula em `failure` em vez de retornar, para que um
      // skip num caso seguinte ainda derrube a avaliação para UNVERIFIABLE — evidência
      // incompleta tem precedência sobre falha conhecida quando as duas aparecem.
      if (
        test.status !== 'expected' ||
        test.results.some((result) => result.status !== 'passed')
      )
        failure = true;
    }
  }
  return failure ? 'FAIL' : 'PASS';
}
/**
 * Decide se o log do pgTAP prova que a bateria de banco passou.
 *
 * As quatro condições são cúmulos de propósito: o pgTAP pode imprimir a linha final
 * otimista mesmo com um teste individual falho ou pulado, então confiar só em
 * `Result: PASS` deixaria um `not ok` escondido no meio do log passar pelo gate.
 *
 * @param {string|null} log - Conteúdo de `pgtap.log` capturado com `tee` na CI.
 * @returns {'PASS'|'UNVERIFIABLE'} `PASS` exige sucesso explícito e nenhum sinal de falha
 *   ou skip; `null`, log truncado ou qualquer `not ok`/`SKIP` viram `UNVERIFIABLE`.
 */
export function assessDatabase(log) {
  if (
    !log ||
    !/^All tests successful\./m.test(log) ||
    !/^Result: PASS\s*$/m.test(log) ||
    /^not ok\b/m.test(log) ||
    /\bSKIP\b/i.test(log)
  )
    return 'UNVERIFIABLE';
  return 'PASS';
}
