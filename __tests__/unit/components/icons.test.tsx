/**
 * @fileoverview Testes unitários dos componentes de ícone SVG nativos.
 * @module __tests__/unit/components/icons
 * @description Valida renderização, atributos acessíveis, herança de cor e classes dos 5 ícones nativos.
 * @dependencies @testing-library/react, vitest, components/shared/icons
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  ClockIcon,
  HomeIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from '@/components/shared/icons';

describe('Componentes de Ícones Nativos SVG', () => {
  it('renderiza SearchIcon com atributos SVG padrão e aria-hidden', () => {
    const { container } = render(<SearchIcon className="h-4 w-4" />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-4 w-4');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renderiza HomeIcon com traçado e classes esperadas', () => {
    const { container } = render(<HomeIcon className="h-5 w-5" />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-5 w-5');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renderiza BookOpenIcon e ClockIcon com traçado e classes esperadas', () => {
    const { container: bookContainer } = render(
      <BookOpenIcon className="h-5 w-5" />,
    );
    const bookSvg = bookContainer.querySelector('svg');
    expect(bookSvg).toBeInTheDocument();
    expect(bookSvg).toHaveClass('h-5 w-5');
    expect(bookSvg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(bookSvg).toHaveAttribute('aria-hidden', 'true');

    const { container: clockContainer } = render(
      <ClockIcon className="h-5 w-5" />,
    );
    const clockSvg = clockContainer.querySelector('svg');
    expect(clockSvg).toBeInTheDocument();
    expect(clockSvg).toHaveClass('h-5 w-5');
    expect(clockSvg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(clockSvg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renderiza ArrowUpRightIcon com atributos corretos', () => {
    const { container } = render(<ArrowUpRightIcon className="text-muted" />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-muted');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renderiza SunIcon e MoonIcon para alternância de tema', () => {
    const { container: sunContainer } = render(<SunIcon />);
    const sunSvg = sunContainer.querySelector('svg');
    expect(sunSvg).toBeInTheDocument();
    expect(sunSvg).toHaveAttribute('aria-hidden', 'true');

    const { container: moonContainer } = render(<MoonIcon />);
    const moonSvg = moonContainer.querySelector('svg');
    expect(moonSvg).toBeInTheDocument();
    expect(moonSvg).toHaveAttribute('aria-hidden', 'true');
  });

  it('permite sobrescrever dimensão via prop size', () => {
    const { container } = render(<SearchIcon size={32} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('permite ícone acessível quando aria-label é fornecido', () => {
    const { container } = render(<SearchIcon aria-label="Buscar termo" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-label', 'Buscar termo');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });
});
