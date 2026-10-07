import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * lib/utils/cn.ts — a função de classe mais usada do projeto
 *
 * `clsx` resolve condicionais e arrays (`cond && 'a'`, `{ 'a': cond }`);
 * `twMerge` resolve conflito do Tailwind, discarding a classe anterior quando
 * duas disputam a mesma propriedade CSS.
 *
 * Sem o twMerge, `cn('p-2', cond && 'p-4')` geraria `class="p-2 p-4"` e o
 * resultado seria o p-2 (primeiro vence no CSS de mesmo peso) — o oposto do
 * esperado. Com ele, sobra `p-4`.
 *
 * Regras de uso: toda `className` condicional passa por aqui. `cn` no lugar
 * errado é a origem classic de "por que meu estilo não aplica".
 *
 * @fileoverview Junta classes do clsx resolvendo conflitos do Tailwind.
 * @param inputs - Valores no formato do `clsx`: strings, arrays, objetos e
 *   condicionais.
 * @returns String de classes com os conflitos do Tailwind já resolvidos — a
 *   última ocorrência de cada propriedade vence.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
