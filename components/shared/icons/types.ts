/**
 * @fileoverview Tipagens compartilhadas para componentes de ícone SVG nativos.
 * @module components/shared/icons/types
 * @description Define a interface padrão de propriedades aceitas pelos ícones vetoriais.
 * @dependencies react
 */
import type * as React from 'react';

/**
 * Propriedades padrão para ícones SVG da interface.
 */
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}
