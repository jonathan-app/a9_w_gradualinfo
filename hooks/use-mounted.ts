import { useSyncExternalStore } from 'react';

/**
 * hooks/use-mounted.ts — sabe se o componente já montou no cliente
 * @fileoverview Sabe se o componente montou no cliente, evitando mismatch.
 *
 * Para que serve
 * Quando o HTML do servidor e o primeiro render do cliente não podem ser
 * decididos com a mesma informação (o tema salvo, a largura da janela, um dado
 * que só existe no browser). Renderizar diferente nos dois lados produz erro de
 * hidratação; o conserto é adiar a decisão até o browser assumir.
 *
 * Por que `useSyncExternalStore` e não `useState` + `useEffect`
 * A forma antiga (setState dentro de effect) força um segundo render, e a regra
 * `react-hooks/set-state-in-effect` — que vem com o ESLint do React Compiler —
 * aponta isso como cascata de render. Aqui o valor vem direto do snapshot do
 * store: `false` no servidor, `true` no cliente, sem nenhum effect.
 */

/**
 * Não existe store externo para observar: a assinatura é vazia de propósito.
 * O que faz o React re-renderizar é o snapshot do cliente ser diferente do do
 * servidor, não um evento.
 */
const subscribeToNothing = () => () => {};

/** Após a hidratação, o componente está montado. */
const getClientSnapshot = () => true;

/** No servidor, nada está montado. */
const getServerSnapshot = () => false;

/**
 * Diz se o componente já está montado no browser.
 *
 * @returns `false` no servidor e no primeiro passe de hidratação; `true` a
 *   partir do render seguinte no cliente. É o sinal para adiar decisões que
 *   dependem do browser sem provocar mismatch de hidratação.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot,
  );
}
