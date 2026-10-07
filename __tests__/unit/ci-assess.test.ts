// @vitest-environment node
import { expect, test } from 'vitest';
// @ts-expect-error Módulo Node executado sem compilação TypeScript.
import { assessAC, assessDatabase } from '../../scripts/ci-assess.mjs';
const report = (status = 'passed') => ({
  suites: [
    {
      file: 'e2e/verify-md0002-tarefa4.spec.ts',
      specs: [
        {
          title:
            'md-0002/AC-01, AC-02, AC-04: cards completos, destaque e limite',
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
test('prova específica passada recebe PASS', () =>
  expect(assessAC('md-0002/AC-01', report())).toBe('PASS'));
test('ausência de caso exigido nunca recebe PASS', () =>
  expect(assessAC('md-0002/AC-03', report())).toBe('UNVERIFIABLE'));
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
  data.suites[0]!.specs[0]!.tests[0]!.results.unshift({ status: 'failed' });
  expect(assessAC('md-0002/AC-01', data)).toBe('FAIL');
});
test('pgTAP exige sucesso explícito sem not ok ou SKIP', () => {
  expect(assessDatabase('All tests successful.\nResult: PASS\n')).toBe('PASS');
  expect(assessDatabase('Result: PASS\n')).toBe('UNVERIFIABLE');
  expect(
    assessDatabase('not ok 1\nAll tests successful.\nResult: PASS\n'),
  ).toBe('UNVERIFIABLE');
});
