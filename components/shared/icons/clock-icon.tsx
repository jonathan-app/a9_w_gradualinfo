/**
 * @fileoverview Ícone de relógio (recentes) vetorial nativo em SVG.
 * @module components/shared/icons/clock-icon
 * @description Renderiza o símbolo de relógio com traçado currentColor.
 * @dependencies react, components/shared/icons/types
 */
import type { IconProps } from './types';

/**
 * Renderiza o ícone de recentes (relógio) vetorial acessível.
 *
 * @param props Propriedades do elemento SVG (tamanho, classes e acessibilidade).
 * @returns Elemento SVG pronto para exibição com herança de cor do contêiner.
 */
export function ClockIcon({
  className,
  size,
  'aria-hidden': ariaHidden,
  ...props
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size ?? '1em'}
      height={size ?? '1em'}
      aria-hidden={ariaHidden ?? (props['aria-label'] ? undefined : true)}
      className={className}
      {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
