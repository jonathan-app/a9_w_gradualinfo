/**
 * @fileoverview Suíte de `cn` (árvore unit/) — o merge de classes do Tailwind.
 * @module __tests__/unit/lib/cn
 * @description Espelha `__tests__/lib/cn.test.ts`: concatenação, falsy descartado e resolução
 *   de conflito entre utilitários — a regra de que a última classe vence, sem a qual o CSS
 *   vira corrida de especificidade.
 * @dependencies vitest, @/lib/utils/cn.
 *
 * `cn` é a função mais chamada do projeto e o motivo número um de "meu estilo não aplicou".
 * O comportamento que vale travar é o conflito de utilitários do Tailwind: é exatamente aí
 * que um erro passa despercebido.
 */
import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils/cn';
describe('cn', () => {
  it('concatena classes simples', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('ignora valores falsy vindos de condição', () => {
    // eslint-disable-next-line no-constant-binary-expression -- o par constante é o caso de teste
    expect(cn('flex', false && 'hidden', null, undefined, '')).toBe('flex');
  });

  it('aplica a última classe quando duas disputam a mesma propriedade', () => {
    // Sem o twMerge o resultado seria "p-2 p-4" e o p-2 venceria por ordem no
    // CSS. É o comportamento oposto do esperado.
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('desconta o conflito de uma variante sobre a base', () => {
    expect(cn('text-brand-600', 'text-white')).toBe('text-white');
  });

  it('mantém classes que não entram em conflito', () => {
    expect(cn('rounded-md', 'p-2', 'text-white')).toBe(
      'rounded-md p-2 text-white',
    );
  });

  it('aceita objeto e array como entrada', () => {
    expect(cn(['flex', 'gap-2'], { 'opacity-50': true })).toBe(
      'flex gap-2 opacity-50',
    );
  });
});
