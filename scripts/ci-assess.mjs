// Critérios mecânicos exigem casos específicos, não apenas exit 0 do job.
export const requiredCases = {
  'md-0002/AC-01': ['cards completos, destaque e limite'],
  'md-0002/AC-02': ['cards completos, destaque e limite'],
  'md-0002/AC-03': [
    'lista vazia mostra mensagem própria',
    'falha real de transporte mostra erro, não vazio',
  ],
  'md-0002/AC-04': ['cards completos, destaque e limite'],
  'md-0002/AC-05': ['HTML malicioso permanece dado'],
  'md-0002/AC-06': ['HTML malicioso permanece dado'],
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
  'md-0002/AC-10': ['canonical e sitemap só incluem públicos'],
  'md-0002/AC-12': [
    'página inicial',
    'artigo publicado',
    'teclado chega ao conteúdo com foco visível',
  ],
  'md-0002/AC-13': ['fontes aparecem somente quando presentes'],
};
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
export function assessAC(id, report) {
  const required = requiredCases[id];
  if (!required || !report || report.errors?.length) return 'UNVERIFIABLE';
  const cases = collectCases(report);
  let failure = false;
  for (const title of required) {
    const matching = cases.filter(
      (item) => item.title === title || item.title.endsWith(`: ${title}`),
    );
    if (matching.length !== 1 || !matching[0].tests.length)
      return 'UNVERIFIABLE';
    for (const test of matching[0].tests) {
      if (
        test.expectedStatus !== 'passed' ||
        !test.results?.length ||
        test.results.some(
          (result) =>
            result.status === 'skipped' || result.status === 'interrupted',
        )
      )
        return 'UNVERIFIABLE';
      if (
        test.status !== 'expected' ||
        test.results.some((result) => result.status !== 'passed')
      )
        failure = true;
    }
  }
  return failure ? 'FAIL' : 'PASS';
}
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
