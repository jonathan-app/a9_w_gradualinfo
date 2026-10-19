/**
 * @fileoverview Ícone de sol para alternância de tema em SVG.
 * @module components/shared/icons/sun-icon
 * @description Renderiza o sol com traçado idêntico ao LuSun (Lucide) usando currentColor.
 * @dependencies react, components/shared/icons/types
 */
import type { IconProps } from './types';

/**
 * Renderiza o ícone de sol (tema claro) vetorial acessível.
 *
 * @param props Propriedades do elemento SVG (tamanho, classes e acessibilidade).
 * @returns Elemento SVG pronto para exibição com herança de cor do contêiner.
 */
export function SunIcon({
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
