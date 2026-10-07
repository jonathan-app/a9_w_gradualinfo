/**
 * @fileoverview Suíte de componente do `Button` — trava o contrato de acessibilidade do `asChild`.
 * @module __tests__/components/button
 * @description Cobre renderização por papel (role), precedence da `className` do consumidor
 *   sobre a variante e comportamento desabilitado. Asserções são por `getByRole`, nunca por
 *   classe: é o papel que o teclado e o leitor de tela enxergam.
 * @dependencies @testing-library/react, @testing-library/user-event, @/components/ui/button.
 *
 * O botão concentra a regra de acessibilidade mais fácil de quebrar: `asChild` precisa
 * renderizar o link como <a>, e não como <button> envolvendo um <a>.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
describe('Button', () => {
  it('renderiza como button por padrão', () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('preserva o elemento filho quando asChild está ligado', () => {
    render(
      <Button asChild>
        <a href="/exemplo">Ir para o exemplo</a>
      </Button>,
    );

    // Se o asChild falhasse, isto seria um button — e o teclado, o leitor de
    // tela e o "abrir em nova aba" passariam a tratar o link como botão.
    expect(
      screen.getByRole('link', { name: 'Ir para o exemplo' }),
    ).toHaveAttribute('href', '/exemplo');
  });

  it('aplica a variante pedida', () => {
    render(<Button variant="outline">Cancelar</Button>);

    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('deixa className do consumidor prevalence sobre a variante', () => {
    render(<Button className="w-full">Largo</Button>);

    // O `cn` faz o merge: `w-full` entra sem derrubar o resto da variante.
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('não dispara onClick quando está desabilitado', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Enviar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Enviar' });
    expect(button).toBeDisabled();

    await userEvent.click(button, { pointerEventsCheck: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });
});
