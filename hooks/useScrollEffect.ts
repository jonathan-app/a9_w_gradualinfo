/**
 * hooks/useScrollEffect.ts
 * @fileoverview Informa se a rolagem passou do limite em pixels.
 *
 * Observa a rolagem da janela e informa se ela ultrapassou o limite em pixels; remove o
 * listener ao desmontar.
 */

import { useEffect, useState } from 'react';

/**
 * Hook para detectar scroll da página
 *
 * @param threshold - Valor em pixels para ativar o efeito (padrão: 20)
 * @returns {boolean} Se a página foi scrollada além do threshold
 *
 * @example
 * ```tsx
 * const isScrolled = useScrollEffect(50);
 *
 * return (
 *   <nav className={isScrolled ? 'bg-opacity-90' : 'bg-transparent'}>
 *     ...
 *   </nav>
 * );
 * ```
 */
/**
 * Recebe um limite em pixels, padrão 20, e retorna se a rolagem ultrapassou esse limite.
 * Registra o evento scroll e o remove quando o limite muda ou o componente desmonta; o
 * estado inicial é false até um evento.
 * @param threshold
 */
export const useScrollEffect = (threshold: number = 20): boolean => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(
    /*
     * Sincroniza o componente depois da renderização conforme as dependências do
     * efeito. A execução usa window.addEventListener. Se retornar uma função, React a
     * usa para limpeza antes de repetir o efeito ou desmontar.
     */ () => {
      /**
       * Lê window.scrollY e atualiza o estado com o resultado da comparação estrita com
       * threshold. No ponto exato do limite, o resultado ainda é false.
       */
      const handleScroll = () => {
        const isScrolled = window.scrollY > threshold;
        setScrolled(isScrolled);
      };

      window.addEventListener('scroll', handleScroll);
      /* Limpeza devolvida ao chamador: remove o listener registrado, evitando assinaturas acumuladas. */
      return () => window.removeEventListener('scroll', handleScroll);
    },
    [threshold],
  );

  return scrolled;
};
