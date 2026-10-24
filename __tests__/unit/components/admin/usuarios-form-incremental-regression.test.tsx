/**
 * @fileoverview Regressões do formulário administrativo e confirmação.
 * @module tests/usuarios-form-incremental-regression
 * @description Verifica refresh, confirmação, normalização e falhas sem rede real.
 * @dependencies vitest, testing-library/react, components/admin/usuarios-form.
 */
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
// Isola controles visuais; a lógica de confirmação testada é o componente real.
vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ComponentProps<'button'> & { variant?: string }) => {
    const nativeProps = { ...props };
    delete nativeProps.variant;
    return <button {...nativeProps} />;
  },
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));
import { UsuariosForm } from '@/components/admin/usuarios-form';
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  refresh.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // jsdom não implementa top layer; foco contido nativo exige teste em navegador.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function open(action = 'Atribuir papel') {
  fireEvent.change(screen.getByLabelText('UUID da conta'), {
    target: { value: ' ABCDEFAB-1234-1234-1234-ABCDEFABCDEF ' },
  });
  const button = screen.getByRole('button', { name: action });
  button.focus();
  fireEvent.click(button);
  return button;
}
describe('Confirmação operacional', () => {
  it('abrir e cancelar não envia requisição e restaura foco', async () => {
    render(<UsuariosForm />);
    const origin = open();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Cancelar' }),
    );
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(origin));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['Atribuir papel', 'Revogar papel'])(
    'confirma %s, fecha e atualiza o Server Component',
    async (action) => {
      fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
      render(<UsuariosForm />);
      const origin = open(action);
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('dialog')).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(origin));
      if (action === 'Atribuir papel')
        expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
          userId: 'abcdefab-1234-1234-1234-abcdefabcdef',
          role: 'editor',
        });
      else
        expect(fetchMock.mock.calls[0]![0]).toBe(
          '/api/admin/usuarios/papeis/abcdefab-1234-1234-1234-abcdefabcdef',
        );
    },
  );
  it('dois cliques no mesmo ciclo produzem uma única mutação', async () => {
    let complete!: (r: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((r) => {
          complete = r;
        }),
    );
    render(<UsuariosForm />);
    open();
    const confirm = screen.getByRole('button', { name: 'Confirmar' });
    act(() => {
      confirm.click();
      confirm.click();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      complete(new Response('{}', { status: 200 }));
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('Enter no formulário pede confirmação sem enviar', () => {
    render(<UsuariosForm />);
    fireEvent.change(screen.getByLabelText('UUID da conta'), {
      target: { value: 'abcdefab-1234-1234-1234-abcdefabcdef' },
    });
    fireEvent.submit(screen.getByLabelText('UUID da conta').closest('form')!);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('erro da API é anunciado no diálogo sem informar sucesso nem atualizar tabela', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Conta indisponível.' }), {
        status: 503,
      }),
    );
    render(<UsuariosForm />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Conta indisponível.'),
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
