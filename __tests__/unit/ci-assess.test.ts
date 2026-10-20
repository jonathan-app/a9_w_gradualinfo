// @vitest-environment node
/**
 * @fileoverview Testes da avaliação mecânica de evidências (`scripts/ci-assess.mjs`).
 * @module __tests__/unit/ci-assess
 * @description Congela o contrato que o `check-gate` depende: PASS exige o caso exigido
 *   presente, executado e aprovado; ausência de caso, skip, interrupção, erro global do
 *   runner e falha em tentativa anterior nunca viram PASS. É o teste que impede a avaliação
 *   de ser reescrita, sem querer, para "sempre aprova".
 * @dependencies ../../scripts/ci-assess.mjs (`assessAC`, `assessDatabase`), vitest.
 *   `@vitest-environment node` no topo porque o módulo avaliado é `.mjs` puro, sem DOM — o
 *   padrão do projeto é jsdom.
 */
import { expect, test } from 'vitest';
// @ts-expect-error Módulo Node executado sem compilação TypeScript.
import {
  assessAC,
  assessDatabase,
  requiredCases,
} from '../../scripts/ci-assess.mjs';
// Fábrica do relatório mínimo na forma que o Playwright emite: uma única suíte, um spec e um
// teste. `status` troca apenas o resultado — o resto do formato fica idêntico nos testes, para
// que cada asserção varie uma única dimensão por vez.
const report = (status = 'passed') => ({
  suites: [
    {
      file: 'e2e/verify-md0002-tarefa4.spec.ts',
      specs: [
        {
          title:
            'md-0002/AC-01, AC-04: composição Cambridge, destaque e limites',
          tests: [
            {
              expectedStatus: 'passed',
              status: status === 'passed' ? 'expected' : 'unexpected',
              results: [{ status }],
            },
          ],
        },
      ],
    },
  ],
  errors: [],
});

const reportFor = (id: keyof typeof requiredCases) => ({
  suites: [
    {
      file: 'e2e/evidence.spec.ts',
      specs: requiredCases[id].map((title) => ({
        title: `${id}: ${title}`,
        tests: [
          {
            expectedStatus: 'passed',
            status: 'expected',
            results: [{ status: 'passed' }],
          },
        ],
      })),
    },
  ],
  errors: [],
});
test('prova específica passada recebe PASS', () =>
  expect(assessAC('md-0002/AC-01', report())).toBe('PASS'));
test('prova genérica não substitui o caso específico do AC', () => {
  const data = report();
  data.suites[0]!.specs[0]!.title = 'carrega o título principal';
  expect(assessAC('md-0002/AC-01', data)).toBe('UNVERIFIABLE');
});
// AC-03 tem dois casos exigidos e o relatório só traz um: nada no relatório fala do caso que
// falta, então a avaliação não pode inferir que ele passou.
test('ausência de caso exigido nunca recebe PASS', () =>
  expect(assessAC('md-0002/AC-03', report())).toBe('UNVERIFIABLE'));
test.each([
  'md-0002/AC-02',
  'md-0002/AC-06',
  'md-0002/AC-10',
  'md-0002/AC-13',
] as const)('%s exige todas as provas específicas', (id) => {
  const complete = reportFor(id);
  expect(assessAC(id, complete)).toBe('PASS');
  for (let index = 0; index < complete.suites[0].specs.length; index++) {
    const missing = reportFor(id);
    missing.suites[0].specs.splice(index, 1);
    expect(assessAC(id, missing)).toBe('UNVERIFIABLE');
  }
});
test('falha real recebe FAIL', () =>
  expect(assessAC('md-0002/AC-01', report('failed'))).toBe('FAIL'));
test('teste ignorado não prova AC', () =>
  expect(assessAC('md-0002/AC-01', report('skipped'))).toBe('UNVERIFIABLE'));
test('erro global invalida avaliação', () =>
  expect(assessAC('md-0002/AC-01', { ...report(), errors: [{}] })).toBe(
    'UNVERIFIABLE',
  ));
test('retries com falha não mascaram instabilidade', () => {
  const data = report();
  // Primeira tentativa falhou, a repetição passou: o resultado final sozinho diria PASS, e é
  // exatamente isso que o teste veda — o relatório guarda todas as tentativas justamente
  // para a avaliação enxergar a falha escondida pelo retry.
  data.suites[0]!.specs[0]!.tests[0]!.results.unshift({ status: 'failed' });
  expect(assessAC('md-0002/AC-01', data)).toBe('FAIL');
});
test('pgTAP exige sucesso explícito sem not ok ou SKIP', () => {
  // Cada expect retira uma peça da prova: falta da linha de sucesso global e um `not ok` de
  // teste individual no meio do log — nenhum dos dois pode ser lido como bateria verde.
  expect(assessDatabase('All tests successful.\nResult: PASS\n')).toBe('PASS');
  expect(assessDatabase('Result: PASS\n')).toBe('UNVERIFIABLE');
  expect(
    assessDatabase('not ok 1\nAll tests successful.\nResult: PASS\n'),
  ).toBe('UNVERIFIABLE');
});
