/**
 * @fileoverview Testes unitários do componente ThemeToggle com 3 opções.
 * @module __tests__/unit/components/theme-toggle
 * @description Valida os 3 botões (Claro, Escuro e Sistema), acessibilidade e
 *   chamadas de alternância para o next-themes.
 * @dependencies @testing-library/react, @testing-library/user-event, vitest,
 *   @/components/shared/theme-toggle.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from '@/components/shared/theme-toggle';

const mockSetTheme = vi.fn();
let mockTheme: string | undefined = 'dark';

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggle com 3 opções', () => {
  it('renderiza o grupo de opções com os três botões de tema', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);

    expect(
      screen.getByRole('group', { name: 'Selecionar tema de exibição' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tema claro' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tema escuro' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tema do sistema' }),
    ).toBeInTheDocument();
  });

  it('marca o tema escuro como pressionado quando theme for dark', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Tema escuro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Tema claro' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      screen.getByRole('button', { name: 'Tema do sistema' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('permite selecionar qualquer um dos 3 temas ao clicar', async () => {
    mockTheme = 'dark';
    mockSetTheme.mockClear();
    const user = userEvent.setup();

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Tema claro' }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');

    await user.click(screen.getByRole('button', { name: 'Tema do sistema' }));
    expect(mockSetTheme).toHaveBeenCalledWith('system');

    await user.click(screen.getByRole('button', { name: 'Tema escuro' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
