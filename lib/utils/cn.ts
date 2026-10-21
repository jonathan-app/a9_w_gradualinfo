/**
 * lib/utils/cn.ts — a função de classe mais usada do projeto
 * @fileoverview Junta classes do clsx resolvendo conflitos do Tailwind.
 * @module lib/utils/cn
 * @description `clsx` resolve condicionais e arrays (`cond && 'a'`,
 *   `{ 'a': cond }`); `twMerge` resolve conflito do Tailwind, descartando a
 *   classe anterior quando duas disputam a mesma propriedade CSS. Sem o
 *   twMerge, `cn('p-2', cond && 'p-4')` geraria `class="p-2 p-4"` e o p-2
 *   venceria (primeiro no CSS de mesmo peso) — o oposto do esperado. Com ele,
 *   sobra `p-4`. Toda `className` condicional passa por aqui.
 * @dependencies clsx, tailwind-merge.
 * @param inputs - Valores no formato do `clsx`: strings, arrays, objetos e
 *   condicionais.
 * @returns String de classes com os conflitos do Tailwind já resolvidos — a
 *   última ocorrência de cada propriedade vence.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
