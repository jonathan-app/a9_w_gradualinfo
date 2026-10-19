/**
 * @fileoverview Ícone de lua para alternância de tema em SVG.
 * @module components/shared/icons/moon-icon
 * @description Renderiza a lua crescente com traçado idêntico ao LuMoon (Lucide) usando currentColor.
 * @dependencies react, components/shared/icons/types
 */
import type { IconProps } from './types';

/**
 * Renderiza o ícone de lua (tema escuro) vetorial acessível.
 *
 * @param props Propriedades do elemento SVG (tamanho, classes e acessibilidade).
 * @returns Elemento SVG pronto para exibição com herança de cor do contêiner.
 */
export function MoonIcon({
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
